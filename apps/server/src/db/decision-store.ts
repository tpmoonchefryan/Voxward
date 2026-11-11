import { randomUUID } from "node:crypto";
import {
  CONTRACT_VERSION,
  type CommitVerdictInput,
  type CommitVerdictStoreResult,
  type CurrentDecision,
  type DecisionSource,
  type DecisionStorePort,
  type DecisionTaskFacts,
  type DownstreamVerdict,
  type InternalClassification,
  type ScoreCommitResult,
  type ScoringPlanner,
  type ScoringStatus,
  type TaskStatus,
} from "@voxward/contracts";
import { and, eq, sql } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { TaskStore } from "./repository.js";
import { changeLogs, channelEvents, deliveries, subjects, tasks, verdicts } from "./schema/index.js";
import { commitInTransaction } from "./scoring-ledger.js";
import { runShortTransaction, type ShortTransaction } from "./transaction.js";

export interface DecisionStoreOptions {
  /** Pure scoring plans from the scoring module. The binding passes them in; the decision module never imports them. */
  readonly planner: ScoringPlanner;
  /** Identifier source for new rows. Injectable so tests can predict identifiers. */
  readonly newId?: () => string;
  /** Expiry of a Change Log row written at `occurredAt`, taken from the retention policy by the server binding. */
  readonly changeLogExpiresAt: (occurredAt: string) => string;
}

/**
 * Database implementation of DecisionStorePort. Every write is one short synchronous transaction. The task guards, the
 * verdict, the delivery intent, the score and the Change Log row are written together, so a failure in any one of them
 * rolls the others back.
 */
export function createDecisionStorePort(database: VoxwardDatabase, options: DecisionStoreOptions): DecisionStorePort {
  const newId = options.newId ?? randomUUID;
  return {
    readTask(taskId) {
      return runShortTransaction(database, (tx) => readTaskFacts(tx, taskId));
    },
    commitVerdict(input) {
      return runShortTransaction(database, (tx) => commitVerdictInTransaction(tx, input, options, newId));
    },
  };
}

function readTaskFacts(tx: ShortTransaction, taskId: string): DecisionTaskFacts | undefined {
  const row = tx
    .select({
      taskId: tasks.id,
      channelId: tasks.channelId,
      eventId: tasks.eventId,
      status: tasks.status,
      eventVersion: tasks.eventVersion,
      processingGeneration: tasks.processingGeneration,
      deadlineAt: tasks.deadlineAt,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();
  if (row === undefined) return undefined;
  return { ...row, status: row.status as TaskStatus };
}

function commitVerdictInTransaction(
  tx: ShortTransaction,
  input: CommitVerdictInput,
  options: DecisionStoreOptions,
  newId: () => string,
): CommitVerdictStoreResult {
  const committed = TaskStore.commitVerdict(tx, {
    verdictId: input.verdictId,
    taskId: input.taskId,
    classification: input.verdict.classification,
    source: input.source,
    decidedAt: input.decidedAt,
    decidedByRef: input.decidedByRef,
  });
  if (committed.status === "rejected") {
    const task = readTaskFacts(tx, input.taskId);
    const current = task === undefined ? null : readCurrentDecision(tx, task.eventId);
    return { status: "conflict", reason: committed.reason, current };
  }

  const task = readTaskFacts(tx, input.taskId);
  const event = task === undefined ? undefined : readEventRow(tx, task.eventId);
  if (task === undefined || event === undefined) throw new Error(`task ${input.taskId} lost its event inside a transaction`);
  const subjectKey = readSubjectKey(tx, event.subjectId);

  const deliverySequence = nextDeliverySequence(tx, event.id);
  tx.insert(deliveries)
    .values({
      id: input.deliveryId,
      eventId: event.id,
      verdictId: input.verdictId,
      outputGrantId: null,
      deliverySequence,
      platformOrder: event.platformOrder,
      validUntil: input.validUntil,
      status: "PENDING",
      attempts: 0,
      updatedAt: input.decidedAt,
    })
    .run();

  const scoring = commitInTransaction(
    tx,
    {
      subject: { channelId: event.channelId, subjectKey },
      idempotencyKey: `event:${event.channelId}:${event.platformMessageRef}`,
      committedAt: input.decidedAt,
      decide: options.planner.planVerdict(
        {
          channelId: event.channelId,
          platformMessageId: event.platformMessageRef,
          subjectKey,
          receivedAt: event.receivedAt,
          correlationId: event.correlationId,
        },
        input.verdict,
      ),
    },
    newId,
  );

  if (input.changeActorRef !== null) {
    tx.insert(changeLogs)
      .values({
        id: newId(),
        channelId: event.channelId,
        occurredAt: input.decidedAt,
        actorKind: "ACCOUNT",
        actorRef: input.changeActorRef,
        changeKind: "MANUAL_VERDICT",
        summary: manualVerdictSummary(input.verdict.downstream),
        outcome: "SUCCEEDED",
        correlationId: event.correlationId,
        expiresAt: options.changeLogExpiresAt(input.decidedAt),
      })
      .run();
  }

  const score = scoringStatus(scoring);
  return {
    status: "committed",
    verdictId: input.verdictId,
    seq: committed.seq,
    eventRef: {
      contractVersion: CONTRACT_VERSION,
      channelId: event.channelId,
      platformMessageId: event.platformMessageRef,
      correlationId: event.correlationId,
    },
    platformOrder: event.platformOrder,
    deliverySequence,
    scoring: score.status,
    actualDelta: score.actualDelta,
  };
}

/** The Change Log summary names the outcome only. It never carries a score or the message text. */
function manualVerdictSummary(downstream: DownstreamVerdict): string {
  return downstream === "BLOCK" ? "人工裁决：拦截" : "人工裁决：放行";
}

function scoringStatus(result: ScoreCommitResult): { status: ScoringStatus; actualDelta: number } {
  switch (result.status) {
    case "applied":
      return { status: "applied", actualDelta: result.actualDelta };
    case "duplicate":
      return { status: "duplicate", actualDelta: 0 };
    case "no_effect":
      return { status: "no_effect", actualDelta: 0 };
    case "refused":
      return { status: "refused", actualDelta: 0 };
  }
}

function readEventRow(tx: ShortTransaction, eventId: string) {
  return tx
    .select({
      id: channelEvents.id,
      channelId: channelEvents.channelId,
      subjectId: channelEvents.subjectId,
      platformMessageRef: channelEvents.platformMessageRef,
      platformOrder: channelEvents.platformOrder,
      receivedAt: channelEvents.receivedAt,
      correlationId: channelEvents.correlationId,
    })
    .from(channelEvents)
    .where(eq(channelEvents.id, eventId))
    .get();
}

function readSubjectKey(tx: ShortTransaction, subjectId: string): string {
  const subject = tx
    .select({ key: subjects.platformSubjectKey })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .get();
  if (subject === undefined) throw new Error(`subject ${subjectId} is missing`);
  return subject.key;
}

function nextDeliverySequence(tx: ShortTransaction, eventId: string): number {
  const latest = tx
    .select({ maxSeq: sql<number>`coalesce(max(${deliveries.deliverySequence}), 0)` })
    .from(deliveries)
    .where(eq(deliveries.eventId, eventId))
    .get();
  return (latest?.maxSeq ?? 0) + 1;
}

/** The verdict with `is_current = 1` for one event, or null. Read inside the same transaction as the guard. */
function readCurrentDecision(tx: ShortTransaction, eventId: string): CurrentDecision | null {
  const row = tx
    .select({
      id: verdicts.id,
      seq: verdicts.seq,
      classification: verdicts.classification,
      downstream: verdicts.downstream,
      source: verdicts.source,
      decidedAt: verdicts.decidedAt,
    })
    .from(verdicts)
    .where(and(eq(verdicts.eventId, eventId), eq(verdicts.isCurrent, 1)))
    .get();
  if (row === undefined) return null;
  return {
    contractVersion: CONTRACT_VERSION,
    verdictId: row.id,
    seq: row.seq,
    classification: row.classification as InternalClassification,
    downstream: row.downstream as DownstreamVerdict,
    source: row.source as DecisionSource,
    decidedAt: row.decidedAt,
  };
}
