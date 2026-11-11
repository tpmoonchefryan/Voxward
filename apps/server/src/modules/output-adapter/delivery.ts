import type {
  ApprovedContentPort,
  OutputDeliveryPort,
  OutputSubscriber,
  OutputSubscriberRegistry,
  SendableDelivery,
} from "@voxward/contracts";
import { frameFor } from "./native-protocol.js";
import { decideSend } from "./resend.js";

export interface DeliveryPumpOptions {
  readonly delivery: OutputDeliveryPort;
  readonly content: ApprovedContentPort;
  readonly subscribers: OutputSubscriberRegistry;
  readonly now: () => Date;
  /** Rows read per channel in one pass (自定). */
  readonly batchLimit: number;
  /** Rows marked EXPIRED in one pass (自定). */
  readonly expireLimit: number;
  /** Failed sends after which a row is marked FAILED (自定). */
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

/**
 * Sends approved deliveries to connected consumers. Within a channel, rows go out in delivery order, and a row that fails
 * holds back the rows after it until it is sent or marked FAILED. A row is marked SENT only after every consumer connected
 * at that moment accepted the frame. A consumer that already received the frame may receive it again after a failed pass.
 * Consumers deduplicate by delivery identifier, so the protocol does not promise exactly-once display.
 */
export function createDeliveryPump(options: DeliveryPumpOptions): DeliveryPump {
  let queue: Promise<unknown> = Promise.resolve();

  function serialized(work: () => Promise<PassReport>): Promise<PassReport> {
    const next = queue.then(work);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function sendChannel(channelId: string, report: MutableReport): Promise<void> {
    const subscribers = options.subscribers.forChannel(channelId);
    if (subscribers.length === 0) return;

    const rows = options.delivery.readSendable({ channelId, nowIso: options.now().toISOString(), limit: options.batchLimit });
    for (const row of rows) {
      const nowIso = options.now().toISOString();
      if (decideSend(row, nowIso) !== "SEND") continue;
      const outcome = await sendRow(channelId, row, subscribers, nowIso);
      if (outcome === "SENT") report.sent += 1;
      else if (outcome === "FAILED") report.failed += 1;
      else if (outcome === "HOLD") {
        report.retried += 1;
        break;
      }
    }
  }

  /** Returns "HOLD" when a consumer failed and the rows after this one must wait. */
  async function sendRow(
    channelId: string,
    row: SendableDelivery,
    subscribers: readonly OutputSubscriber[],
    nowIso: string,
  ): Promise<"SENT" | "FAILED" | "HOLD" | "SKIPPED"> {
    // An ALLOW row without approved content cannot be shown. Marking it FAILED keeps it out of the queue.
    const content =
      row.verdict === "ALLOW" ? options.content.readApproved({ channelId, correlationId: row.correlationId, nowIso }) : undefined;
    const frame = frameFor(row, content);
    if (frame === undefined) {
      return options.delivery.markFailed({ deliveryId: row.deliveryId, nowIso }) ? "FAILED" : "SKIPPED";
    }

    const results = await Promise.allSettled(subscribers.map((subscriber) => subscriber.send(frame)));
    if (results.every((result) => result.status === "fulfilled")) {
      return options.delivery.markSent({ deliveryId: row.deliveryId, nowIso: options.now().toISOString() }) ? "SENT" : "SKIPPED";
    }

    const outcome = options.delivery.recordSendFailure({
      deliveryId: row.deliveryId,
      nowIso: options.now().toISOString(),
      maxAttempts: options.maxAttempts,
    });
    if (outcome === "FAILED") return "FAILED";
    if (outcome === "RETRY") return "HOLD";
    return "SKIPPED";
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
