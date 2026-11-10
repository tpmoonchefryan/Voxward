import { toDownstreamVerdict, type InternalClassification } from "@voxward/contracts";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  channelEvents,
  scoreExceptions,
  scoreLedger,
  subjectScores,
  subjects,
  tasks,
  verdicts,
  type ScoreReasonCode,
  type TaskKind,
  type VerdictSource,
} from "./schema/index.js";
import type { ShortTransaction } from "./transaction.js";

/*
 * Every function here receives the handle of a transaction that the caller opened with runShortTransaction.
 * Each one decides and writes in that transaction, and returns a controlled result for business outcomes
 * instead of throwing. Scoring rules, cooldowns and clamping belong to the scoring module, not to this file.
 */

const CLOSED_TASK_STATUSES: readonly string[] = ["DONE", "DISCARDED"];

// ---------------------------------------------------------------- events

export interface RecordEventInput {
  readonly id: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly platformMessageRef: string;
  readonly platformOrder: number;
  readonly receivedAt: string;
  readonly correlationId: string;
  readonly exceptionMarked: boolean;
  readonly createdAt: string;
}

export type RecordEventResult =
  | { readonly status: "created"; readonly id: string }
  | { readonly status: "duplicate"; readonly id: string };

export const ChannelEventStore = {
  /** Records the event unless the same platform message is already recorded in this channel. */
  recordIfNew(tx: ShortTransaction, input: RecordEventInput): RecordEventResult {
    const existing = tx
      .select({ id: channelEvents.id })
      .from(channelEvents)
      .where(
        and(
          eq(channelEvents.channelId, input.channelId),
          eq(channelEvents.platformMessageRef, input.platformMessageRef),
        ),
      )
      .get();
    if (existing !== undefined) return { status: "duplicate", id: existing.id };

    tx.insert(channelEvents)
      .values({
        id: input.id,
        channelId: input.channelId,
        subjectId: input.subjectId,
        platformMessageRef: input.platformMessageRef,
        platformOrder: input.platformOrder,
        receivedAt: input.receivedAt,
        correlationId: input.correlationId,
        eventVersion: 1,
        settlementState: "NONE",
        exceptionMarked: input.exceptionMarked ? 1 : 0,
        createdAt: input.createdAt,
      })
      .run();
    return { status: "created", id: input.id };
  },
};

// ---------------------------------------------------------------- tasks and verdicts

export interface CreateTaskInput {
  readonly id: string;
  readonly eventId: string;
  readonly kind: TaskKind;
  readonly deadlineAt: string;
  readonly createdAt: string;
}

export type CreateTaskResult =
  | { readonly status: "created"; readonly id: string; readonly processingGeneration: number }
  | { readonly status: "existing"; readonly id: string }
  | { readonly status: "event_not_found" };

export interface CommitVerdictInput {
  readonly verdictId: string;
  readonly taskId: string;
  readonly classification: InternalClassification;
  readonly source: VerdictSource;
  readonly decidedAt: string;
  readonly decidedByRef: string;
}

export type CommitRejection =
  | "TASK_NOT_FOUND"
  | "TASK_NOT_OPEN"
  | "STALE_EVENT_VERSION"
  | "STALE_GENERATION"
  | "ALREADY_FINAL";

export type CommitVerdictResult =
  | { readonly status: "committed"; readonly seq: number }
  | { readonly status: "rejected"; readonly reason: CommitRejection };

export const TaskStore = {
  /**
   * Creates a QUEUED task bound to the event's current version and its subject's current generation.
   * The same kind for the same event version returns the existing task.
   */
  create(tx: ShortTransaction, input: CreateTaskInput): CreateTaskResult {
    const event = tx
      .select({
        channelId: channelEvents.channelId,
        subjectId: channelEvents.subjectId,
        eventVersion: channelEvents.eventVersion,
      })
      .from(channelEvents)
      .where(eq(channelEvents.id, input.eventId))
      .get();
    if (event === undefined) return { status: "event_not_found" };

    const existing = tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(eq(tasks.eventId, input.eventId), eq(tasks.kind, input.kind), eq(tasks.eventVersion, event.eventVersion)),
      )
      .get();
    if (existing !== undefined) return { status: "existing", id: existing.id };

    const subject = tx
      .select({ generation: subjects.processingGeneration })
      .from(subjects)
      .where(eq(subjects.id, event.subjectId))
      .get();
    if (subject === undefined) throw new Error(`event ${input.eventId} refers to a missing subject`);
    const processingGeneration = subject.generation;

    tx.insert(tasks)
      .values({
        id: input.id,
        eventId: input.eventId,
        channelId: event.channelId,
        kind: input.kind,
        status: "QUEUED",
        eventVersion: event.eventVersion,
        processingGeneration,
        deadlineAt: input.deadlineAt,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      })
      .run();
    return { status: "created", id: input.id, processingGeneration };
  },

  /**
   * Commits the final verdict only when the task is still open, its event version and processing generation
   * still match, and the event has no current verdict. The verdict insert and the task status change share
   * one transaction, so a stale result cannot overwrite a newer decision.
   */
  commitVerdict(tx: ShortTransaction, input: CommitVerdictInput): CommitVerdictResult {
    const task = tx
      .select({
        id: tasks.id,
        eventId: tasks.eventId,
        status: tasks.status,
        eventVersion: tasks.eventVersion,
        processingGeneration: tasks.processingGeneration,
      })
      .from(tasks)
      .where(eq(tasks.id, input.taskId))
      .get();
    if (task === undefined) return rejected("TASK_NOT_FOUND");
    if (CLOSED_TASK_STATUSES.includes(task.status)) return rejected("TASK_NOT_OPEN");

    const event = tx
      .select({
        id: channelEvents.id,
        eventVersion: channelEvents.eventVersion,
        subjectId: channelEvents.subjectId,
      })
      .from(channelEvents)
      .where(eq(channelEvents.id, task.eventId))
      .get();
    if (event === undefined) throw new Error(`task ${task.id} refers to a missing event`);
    if (event.eventVersion !== task.eventVersion) return rejected("STALE_EVENT_VERSION");

    const subject = tx
      .select({ generation: subjects.processingGeneration })
      .from(subjects)
      .where(eq(subjects.id, event.subjectId))
      .get();
    if (subject === undefined) throw new Error(`event ${event.id} refers to a missing subject`);
    if (subject.generation !== task.processingGeneration) return rejected("STALE_GENERATION");

    const current = tx
      .select({ id: verdicts.id })
      .from(verdicts)
      .where(and(eq(verdicts.eventId, event.id), eq(verdicts.isCurrent, 1)))
      .get();
    if (current !== undefined) return rejected("ALREADY_FINAL");

    const latest = tx
      .select({ maxSeq: sql<number>`coalesce(max(${verdicts.seq}), 0)` })
      .from(verdicts)
      .where(eq(verdicts.eventId, event.id))
      .get();
    const seq = (latest?.maxSeq ?? 0) + 1;

    tx.insert(verdicts)
      .values({
        id: input.verdictId,
        eventId: event.id,
        taskId: task.id,
        seq,
        classification: input.classification,
        downstream: toDownstreamVerdict(input.classification),
        source: input.source,
        isCurrent: 1,
        decidedAt: input.decidedAt,
        decidedByRef: input.decidedByRef,
      })
      .run();
    tx.update(tasks).set({ status: "DONE", updatedAt: input.decidedAt }).where(eq(tasks.id, task.id)).run();
    return { status: "committed", seq };
  },
};

function rejected(reason: CommitRejection): CommitVerdictResult {
  return { status: "rejected", reason };
}

// ---------------------------------------------------------------- scores

export interface AppendScoreInput {
  readonly id: string;
  readonly subjectId: string;
  readonly idempotencyKey: string;
  readonly reasonCode: ScoreReasonCode;
  readonly requestedDelta: number;
  readonly actualDelta: number;
  readonly ruleVersion: number | null;
  readonly verdictRef: string | null;
  readonly correlationId: string | null;
  readonly createdAt: string;
}

export type AppendScoreResult = { readonly status: "created"; readonly id: string } | { readonly status: "duplicate" };

export const ScoreLedgerStore = {
  /** Appends one entry per idempotency key. A duplicate key means the change was already applied. */
  appendIfNew(tx: ShortTransaction, input: AppendScoreInput): AppendScoreResult {
    const existing = tx
      .select({ id: scoreLedger.id })
      .from(scoreLedger)
      .where(eq(scoreLedger.idempotencyKey, input.idempotencyKey))
      .get();
    if (existing !== undefined) return { status: "duplicate" };

    tx.insert(scoreLedger)
      .values({
        id: input.id,
        subjectId: input.subjectId,
        idempotencyKey: input.idempotencyKey,
        reasonCode: input.reasonCode,
        requestedDelta: input.requestedDelta,
        actualDelta: input.actualDelta,
        ruleVersion: input.ruleVersion,
        verdictRef: input.verdictRef,
        correlationId: input.correlationId,
        createdAt: input.createdAt,
      })
      .run();
    return { status: "created", id: input.id };
  },
};

export interface CreateSubjectInput {
  readonly id: string;
  readonly channelId: string;
  readonly platformSubjectKey: string;
  readonly createdAt: string;
}

export interface CompareAndSetScoreInput {
  readonly subjectId: string;
  readonly expectedVersion: number;
  readonly identityBaseScore: number;
  readonly behaviorAdjustTotal: number;
  readonly currentScore: number;
  readonly lastRewardAt: string | null;
  readonly updatedAt: string;
}

export type CompareAndSetScoreResult =
  | { readonly status: "updated"; readonly version: number }
  | { readonly status: "conflict"; readonly currentVersion: number }
  | { readonly status: "missing" };

export const SubjectStore = {
  /** Creates a subject with its score row at version 0. */
  create(tx: ShortTransaction, input: CreateSubjectInput): void {
    tx.insert(subjects)
      .values({
        id: input.id,
        channelId: input.channelId,
        platformSubjectKey: input.platformSubjectKey,
        processingGeneration: 0,
        createdAt: input.createdAt,
      })
      .run();
    tx.insert(subjectScores)
      .values({
        subjectId: input.id,
        identityBaseScore: 0,
        behaviorAdjustTotal: 0,
        currentScore: 0,
        version: 0,
        updatedAt: input.createdAt,
      })
      .run();
  },

  /** Raises the processing generation. Tasks created under an older generation can no longer be committed. */
  bumpGeneration(tx: ShortTransaction, subjectId: string): number | undefined {
    const result = tx
      .update(subjects)
      .set({ processingGeneration: sql`${subjects.processingGeneration} + 1` })
      .where(eq(subjects.id, subjectId))
      .run();
    if (result.changes === 0) return undefined;
    return tx
      .select({ generation: subjects.processingGeneration })
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .get()?.generation;
  },

  /** Writes new score values only if the stored version still equals `expectedVersion`. */
  compareAndSetScore(tx: ShortTransaction, input: CompareAndSetScoreInput): CompareAndSetScoreResult {
    const result = tx
      .update(subjectScores)
      .set({
        identityBaseScore: input.identityBaseScore,
        behaviorAdjustTotal: input.behaviorAdjustTotal,
        currentScore: input.currentScore,
        lastRewardAt: input.lastRewardAt,
        updatedAt: input.updatedAt,
        version: sql`${subjectScores.version} + 1`,
      })
      .where(and(eq(subjectScores.subjectId, input.subjectId), eq(subjectScores.version, input.expectedVersion)))
      .run();
    if (result.changes === 1) return { status: "updated", version: input.expectedVersion + 1 };

    const stored = tx
      .select({ version: subjectScores.version })
      .from(subjectScores)
      .where(eq(subjectScores.subjectId, input.subjectId))
      .get();
    if (stored === undefined) return { status: "missing" };
    return { status: "conflict", currentVersion: stored.version };
  },
};

// ---------------------------------------------------------------- scoring exceptions

export interface EnsureScoreExceptionInput {
  readonly id: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly sourceRequestId: string | null;
  readonly createdAt: string;
}

export type EnsureScoreExceptionResult =
  | { readonly status: "created"; readonly id: string }
  | { readonly status: "existing"; readonly id: string };

export const ScoreExceptionStore = {
  /** Keeps one active marker per channel and subject, so a repeated request adds no row. */
  ensureActive(tx: ShortTransaction, input: EnsureScoreExceptionInput): EnsureScoreExceptionResult {
    const active = tx
      .select({ id: scoreExceptions.id })
      .from(scoreExceptions)
      .where(
        and(
          eq(scoreExceptions.channelId, input.channelId),
          eq(scoreExceptions.subjectId, input.subjectId),
          isNull(scoreExceptions.removedAt),
        ),
      )
      .get();
    if (active !== undefined) return { status: "existing", id: active.id };

    tx.insert(scoreExceptions)
      .values({
        id: input.id,
        channelId: input.channelId,
        subjectId: input.subjectId,
        sourceRequestId: input.sourceRequestId,
        purposeCode: "SCORING_EXCEPTION_PREFERENCE",
        createdAt: input.createdAt,
      })
      .run();
    return { status: "created", id: input.id };
  },
};
