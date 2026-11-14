import { createVerdict, type NativeFrame, type OutputSubscriber, type OutputSubscriberRegistry, type Verdict } from "@voxward/contracts";
import { createDecisionStorePort } from "../../../src/db/decision-store.js";
import { createApprovedContentPort, createOutputDeliveryPort } from "../../../src/db/output-store.js";
import { technicalLogEvidence, technicalLogs } from "../../../src/db/schema/index.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { createDeliveryPump } from "../../../src/modules/output-adapter/delivery.js";
import { createScoringPlanner } from "../../../src/modules/scoring-engine/index.js";
import { ENABLED } from "../../scoring-engine/ledger/helpers.js";
import { CHANGE_EXPIRES_AT, DEADLINE, DECIDED_AT, type OpenDatabase, seedOpenTask } from "../../decision-service/fixtures.js";
import { T0 } from "../../db/helpers.js";

// Synthetic times. A pass runs at DECIDED_AT, and rows expire at DEADLINE.
export const AFTER_DEADLINE = "2026-11-10T10:06:00.000Z";
export const LATER = "2026-11-10T11:00:00.000Z";

let sequence = 0;

function decisionStore(db: OpenDatabase) {
  return createDecisionStorePort(db.database, {
    planner: createScoringPlanner(ENABLED),
    newId: () => `row-${++sequence}`,
    changeLogExpiresAt: () => CHANGE_EXPIRES_AT,
  });
}

/** Writes one event with one open task, then commits its verdict and delivery row through the real decision store. */
export function addDeliveryEvent(
  db: OpenDatabase,
  input: {
    readonly eventId: string;
    readonly subjectKey: string;
    readonly platformOrder: number;
    readonly verdict: Verdict;
    readonly deliveryId: string;
  },
): void {
  seedOpenTask(db.database, {
    channelId: "channel-a",
    subjectKey: input.subjectKey,
    subjectId: `subject-${input.subjectKey}`,
    eventId: input.eventId,
    platformMessageRef: `msg-${input.eventId}`,
    taskId: `task-${input.eventId}`,
    platformOrder: input.platformOrder,
  });
  decisionStore(db).commitVerdict({
    taskId: `task-${input.eventId}`,
    verdictId: `verdict-${input.eventId}`,
    deliveryId: input.deliveryId,
    verdict: input.verdict,
    source: "MANUAL",
    decidedAt: DECIDED_AT,
    decidedByRef: "mod-1",
    changeActorRef: "mod-1",
    validUntil: DEADLINE,
  });
}

/** Overturns an event's initial verdict (`verdict-<eventId>`, generation 0) to BLOCK through the real decision store. */
export function overturnToBlock(db: OpenDatabase, eventId: string): void {
  const result = decisionStore(db).commitOverturn({
    eventId,
    operationId: `op-overturn-${eventId}`,
    expectedVerdictId: `verdict-${eventId}`,
    expectedGeneration: 0,
    verdict: createVerdict("BLOCK"),
    actorRef: "mod-2",
    decidedAt: DECIDED_AT,
    validUntil: DEADLINE,
    deliverable: true,
  });
  if (result.status !== "overturned") {
    throw new Error(`unexpected overturn status: ${result.status}`);
  }
}

/** Writes the approved text of one event under its correlation identifier, the way the Technical Log does. */
export function addApprovedText(db: OpenDatabase, eventId: string, text: string): void {
  runShortTransaction(db.database, (tx) => {
    tx.insert(technicalLogs)
      .values({
        id: `log-${eventId}`,
        channelId: "channel-a",
        correlationId: `corr-${eventId}`,
        sequence: 1,
        stage: "INGEST",
        status: "OK",
        createdAt: T0,
        expiresAt: LATER,
      })
      .run();
    tx.insert(technicalLogEvidence)
      .values({
        id: `ev-${eventId}`,
        logId: `log-${eventId}`,
        evidenceKind: "MESSAGE_TEXT",
        payload: text,
        payloadBytes: Buffer.byteLength(text, "utf8"),
        expiresAt: LATER,
      })
      .run();
  });
}

export interface FakeConsumer {
  readonly subscriber: OutputSubscriber;
  readonly frames: NativeFrame[];
  /** When `reject` is true, every send fails, as a broken connection would. */
  readonly state: { reject: boolean };
}

/** A consumer that records the frames it accepts. `onSend` runs after each accepted frame. */
export function fakeConsumer(grantId: string, options: { readonly onSend?: () => void } = {}): FakeConsumer {
  const frames: NativeFrame[] = [];
  const state = { reject: false };
  const subscriber: OutputSubscriber = {
    grantId,
    channelId: "channel-a",
    async send(frame) {
      if (state.reject) throw new Error("WRITE_FAILED");
      frames.push(frame);
      options.onSend?.();
    },
    bufferedAmount: () => 0,
    close: () => undefined,
  };
  return { subscriber, frames, state };
}

/** Delivery identifiers of the frames a consumer received, in order. A HELLO frame has none, so it is reported by type. */
export function idsOf(frames: readonly NativeFrame[]): string[] {
  return frames.map((frame) => (frame.type === "HELLO" ? "HELLO" : frame.deliveryId));
}

export function statusOf(db: OpenDatabase, deliveryId: string): string | undefined {
  const row = db.database.sqlite.prepare("SELECT status FROM deliveries WHERE id = ?").get(deliveryId) as { status: string } | undefined;
  return row?.status;
}

export function attemptsOf(db: OpenDatabase, deliveryId: string): number | undefined {
  const row = db.database.sqlite.prepare("SELECT attempts FROM deliveries WHERE id = ?").get(deliveryId) as { attempts: number } | undefined;
  return row?.attempts;
}

/** A pump over the real delivery and content ports. Batch and expiry limits are the module's own values (自定). */
export function pumpFor(db: OpenDatabase, subscribers: OutputSubscriberRegistry, clock: { now: Date }, maxAttempts = 3) {
  return createDeliveryPump({
    delivery: createOutputDeliveryPort(db.database),
    content: createApprovedContentPort(db.database),
    subscribers,
    now: () => clock.now,
    batchLimit: 50,
    expireLimit: 100,
    maxAttempts,
  });
}
