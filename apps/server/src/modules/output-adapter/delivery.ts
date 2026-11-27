import {
  NATIVE_CLOSE,
  type ApprovedContentPort,
  type OutputDeliveryPort,
  type OutputSubscriber,
  type OutputSubscriberRegistry,
  type SendableDelivery,
} from "@voxward/contracts";
import { frameFor } from "./native-protocol.js";
import { decideSend } from "./resend.js";

/** Default client/delivery deduplication & retry replay window (5 minutes), shared with Overlay dedup TTL. */
export const DEFAULT_DELIVERY_REPLAY_WINDOW_MS = 300_000;

export interface DeliveryPumpOptions {
  readonly delivery: OutputDeliveryPort;
  readonly content: ApprovedContentPort;
  readonly subscribers: OutputSubscriberRegistry;
  readonly now: () => Date;
  /** Rows read per channel in one pass (自定). */
  readonly batchLimit: number;
  /** Rows marked EXPIRED in one pass (自定). */
  readonly expireLimit: number;
  /** Failed sends after which a target/row is marked FAILED (自定). */
  readonly maxAttempts: number;
}

export interface PassReport {
  readonly expired: number;
  readonly sent: number;
  readonly retried: number;
  readonly failed: number;
}

export interface DeliveryPump {
  /** One pass over every channel that has a connected consumer. Passes and wake-ups never overlap. */
  runPass(): Promise<PassReport>;
  /** One pass over one channel. `deliver` calls it to wake the sender for that channel. */
  runChannel(channelId: string): Promise<PassReport>;
}

type MutableReport = { expired: number; sent: number; retried: number; failed: number };

interface SubscriberDeliveryEntry {
  delivered: boolean;
  attempts: number;
}

type RowPassAction = "CONTINUE" | "STOP_CHANNEL";

/**
 * Sends approved deliveries to connected consumers with per-subscriber isolation:
 * - One failing subscriber retries up to `maxAttempts` (then disconnects) without stalling or failing healthy subscribers.
 * - Healthy subscribers that already received a delivery are not resent the same delivery while a failing peer retries.
 * - Shared rows stay PENDING until every remaining non-exhausted subscriber receives them or no subscriber succeeds.
 */
export function createDeliveryPump(options: DeliveryPumpOptions): DeliveryPump {
  let queue: Promise<unknown> = Promise.resolve();
  const subscriberStates = new WeakMap<OutputSubscriber, Map<string, SubscriberDeliveryEntry>>();

  function entryFor(subscriber: OutputSubscriber, deliveryId: string): SubscriberDeliveryEntry {
    let perDelivery = subscriberStates.get(subscriber);
    if (perDelivery === undefined) {
      perDelivery = new Map();
      subscriberStates.set(subscriber, perDelivery);
    }
    let entry = perDelivery.get(deliveryId);
    if (entry === undefined) {
      entry = { delivered: false, attempts: 0 };
      perDelivery.set(deliveryId, entry);
    }
    return entry;
  }

  function serialized(work: () => Promise<PassReport>): Promise<PassReport> {
    const next = queue.then(work);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function sendChannel(channelId: string, report: MutableReport): Promise<void> {
    if (options.subscribers.forChannel(channelId).length === 0) return;

    const rows = options.delivery.readSendable({ channelId, nowIso: options.now().toISOString(), limit: options.batchLimit });
    const stalled = new Set<OutputSubscriber>();
    for (const row of rows) {
      const nowIso = options.now().toISOString();
      // Re-read synchronously right before sending: an earlier in-flight send may have yielded while this row was overturned or cancelled.
      const currentRow = options.delivery.readSendableRow({ deliveryId: row.deliveryId, nowIso });
      if (currentRow === undefined || decideSend(currentRow, nowIso) !== "SEND") continue;
      const action = await sendRow(channelId, currentRow, nowIso, stalled, report);
      if (action === "STOP_CHANNEL") return;
    }
  }

  async function sendRow(
    channelId: string,
    row: SendableDelivery,
    nowIso: string,
    stalled: Set<OutputSubscriber>,
    report: MutableReport,
  ): Promise<RowPassAction> {
    const targets = options.subscribers.forChannel(channelId);
    if (targets.length === 0) return "STOP_CHANNEL";

    const eligible = targets.filter((sub) => !stalled.has(sub));
    if (eligible.length === 0) return "STOP_CHANNEL";

    // An ALLOW row without approved content cannot be shown. Marking it FAILED keeps it out of the queue.
    const content =
      row.verdict === "ALLOW" ? options.content.readApproved({ channelId, correlationId: row.correlationId, nowIso }) : undefined;
    const frame = frameFor(row, content);
    if (frame === undefined) {
      if (options.delivery.markFailed({ deliveryId: row.deliveryId, nowIso })) {
        report.failed += 1;
      }
      return "CONTINUE";
    }

    const pendingTargets = eligible.filter((sub) => !entryFor(sub, row.deliveryId).delivered);
    const results = await Promise.allSettled(pendingTargets.map((subscriber) => subscriber.send(frame)));

    const rejectedSubscribers: OutputSubscriber[] = [];
    for (let i = 0; i < pendingTargets.length; i++) {
      const sub = pendingTargets[i]!;
      const res = results[i]!;
      const entry = entryFor(sub, row.deliveryId);
      if (res.status === "fulfilled") {
        entry.delivered = true;
      } else {
        entry.attempts += 1;
        rejectedSubscribers.push(sub);
      }
    }

    const deliveredCount = targets.filter((sub) => entryFor(sub, row.deliveryId).delivered).length;
    if (deliveredCount === 0 && rejectedSubscribers.length > 0) {
      const outcome = options.delivery.recordSendFailure({
        deliveryId: row.deliveryId,
        nowIso: options.now().toISOString(),
        maxAttempts: options.maxAttempts,
      });
      if (outcome === "FAILED") {
        report.failed += 1;
        return "CONTINUE";
      }
      if (outcome === "RETRY") {
        report.retried += 1;
        return "STOP_CHANNEL";
      }
      return "CONTINUE";
    }

    for (const sub of rejectedSubscribers) {
      const entry = entryFor(sub, row.deliveryId);
      if (entry.attempts >= options.maxAttempts) {
        sub.close(NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE);
      } else {
        stalled.add(sub);
      }
    }

    const nowTargets = options.subscribers.forChannel(channelId);
    const newlyJoined = nowTargets.some((subscriber) => !targets.includes(subscriber));
    if (newlyJoined) {
      return "STOP_CHANNEL";
    }

    const stillPendingInChannel = nowTargets.filter((sub) => !entryFor(sub, row.deliveryId).delivered);
    if (stillPendingInChannel.length === 0) {
      if (options.delivery.markSent({ deliveryId: row.deliveryId, nowIso: options.now().toISOString() })) {
        report.sent += 1;
      }
      return "CONTINUE";
    }

    if (rejectedSubscribers.length > 0) {
      report.retried += 1;
    }
    const hasHealthyTarget = nowTargets.some((sub) => !stalled.has(sub));
    return hasHealthyTarget ? "CONTINUE" : "STOP_CHANNEL";
  }

  async function passOver(channelIds: readonly string[]): Promise<PassReport> {
    const expired = options.delivery.expireDue({ nowIso: options.now().toISOString(), limit: options.expireLimit });
    const report: MutableReport = { expired, sent: 0, retried: 0, failed: 0 };
    for (const channelId of channelIds) {
      await sendChannel(channelId, report);
    }
    return report;
  }

  return {
    runPass() {
      return serialized(() => passOver(options.subscribers.activeChannelIds()));
    },
    runChannel(channelId) {
      return serialized(() => passOver([channelId]));
    },
  };
}
