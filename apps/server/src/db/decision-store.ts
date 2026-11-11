import { randomUUID } from "node:crypto";
import {
  CONTRACT_VERSION,
  toDownstreamVerdict,
  type CommitVerdictInput,
  type CommitVerdictStoreResult,
  type CurrentDecision,
  type CurrentVerdictFacts,
  type DecisionSource,
  type DecisionStorePort,
  type DecisionTaskFacts,
  type DeliveryFacts,
  type DownstreamVerdict,
  type EventFacts,
  type EventRef,
  type InternalClassification,
  type OverturnStoreInput,
  type OverturnStoreResult,
  type ResendStoreInput,
  type ResendStoreResult,
  type ScoreCommitResult,
  type ScoringPlanner,
  type ScoringStatus,
  type SubjectListEdit,
  type SubjectListEditResult,
  type TaskStatus,
  type TermEdit,
  type TermEditResult,
} from "@voxward/contracts";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { TaskStore } from "./repository.js";
import {
  changeLogs,
  channelEvents,
  deliveries,
  listEntries,
  ruleTerms,
  scoreLedger,
  subjects,
  tasks,
  verdicts,
} from "./schema/index.js";
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
 * Database implementation of DecisionStorePort. Every write is one short synchronous transaction. The guards, the
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
    readEvent(eventId) {
      return runShortTransaction(database, (tx) => readEventFacts(tx, eventId));
    },
    readDelivery(deliveryId) {
      return runShortTransaction(database, (tx) => readDeliveryFacts(tx, deliveryId));
    },
    commitOverturn(input) {
      return runShortTransaction(database, (tx) => commitOverturnInTransaction(tx, input, options, newId));
    },
    commitResend(input) {
      return runShortTransaction(database, (tx) => commitResendInTransaction(tx, input, options, newId));
    },
    applySubjectList(input) {
      return runShortTransaction(database, (tx) => applySubjectListInTransaction(tx, input, options, newId));
    },
    applyTerm(input) {
      return runShortTransaction(database, (tx) => applyTermInTransaction(tx, input, options, newId));
    },
  };
}

// ---------------------------------------------------------------- commit

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
    insertChangeLog(tx, {
      id: newId(),
      channelId: event.channelId,
      occurredAt: input.decidedAt,
      actorRef: input.changeActorRef,
      changeKind: "MANUAL_VERDICT",
      summary: manualVerdictSummary(input.verdict.downstream),
      correlationId: event.correlationId,
      expiresAt: options.changeLogExpiresAt(input.decidedAt),
    });
  }

  const score = scoringStatus(scoring);
  return {
    status: "committed",
    verdictId: input.verdictId,
    seq: committed.seq,
    eventRef: eventRefOf(event),
    platformOrder: event.platformOrder,
    deliverySequence,
    scoring: score.status,
    actualDelta: score.actualDelta,
  };
}

// ---------------------------------------------------------------- reads for reviews

export function readEventFacts(tx: ShortTransaction, eventId: string): EventFacts | undefined {
  const event = readEventRow(tx, eventId);
  if (event === undefined) return undefined;
  const subject = tx
    .select({ key: subjects.platformSubjectKey, generation: subjects.processingGeneration })
    .from(subjects)
    .where(eq(subjects.id, event.subjectId))
    .get();
  if (subject === undefined) throw new Error(`event ${eventId} refers to a missing subject`);
  return {
    eventId: event.id,
    channelId: event.channelId,
    subjectId: event.subjectId,
    subjectKey: subject.key,
    subjectGeneration: subject.generation,
    platformMessageRef: event.platformMessageRef,
    platformOrder: event.platformOrder,
    receivedAt: event.receivedAt,
    correlationId: event.correlationId,
    current: readCurrentVerdict(tx, event.id),
  };
}

export function readDeliveryFacts(tx: ShortTransaction, deliveryId: string): DeliveryFacts | undefined {
  const row = tx
    .select({
      id: deliveries.id,
      eventId: deliveries.eventId,
      verdictId: deliveries.verdictId,
      validUntil: deliveries.validUntil,
      channelId: channelEvents.channelId,
      receivedAt: channelEvents.receivedAt,
    })
    .from(deliveries)
    .innerJoin(channelEvents, eq(channelEvents.id, deliveries.eventId))
    .where(eq(deliveries.id, deliveryId))
    .get();
  if (row === undefined) return undefined;
  return {
    deliveryId: row.id,
    channelId: row.channelId,
    eventId: row.eventId,
    verdictId: row.verdictId,
    validUntil: row.validUntil,
    receivedAt: row.receivedAt,
  };
}

// ---------------------------------------------------------------- overturn and compensation

function commitOverturnInTransaction(
  tx: ShortTransaction,
  input: OverturnStoreInput,
  options: DecisionStoreOptions,
  newId: () => string,
): OverturnStoreResult {
  const event = readEventRow(tx, input.eventId);
  if (event === undefined) return { status: "conflict", reason: "EVENT_NOT_FOUND", current: null };

  // The operation identifier fixes the new verdict's identifier, so a repeated request finds the earlier result.
  const verdictId = `overturn:${event.channelId}:${input.operationId}`;
  const earlier = tx.select({ id: verdicts.id, seq: verdicts.seq }).from(verdicts).where(eq(verdicts.id, verdictId)).get();
  if (earlier !== undefined) return { status: "duplicate", seq: earlier.seq, verdictId: earlier.id };

  const current = readCurrentVerdict(tx, event.id);
  if (current === null) return { status: "conflict", reason: "NO_CURRENT_VERDICT", current: null };
  if (current.verdictId !== input.expectedVerdictId) {
    return { status: "conflict", reason: "CHANGED_BY_OTHER", current: toCurrentDecision(current) };
  }
  // A verdict is bound to the task that made it. A deletion raises the subject's generation, which stales that task.
  const subjectGeneration = readSubjectGeneration(tx, event.subjectId);
  if (current.taskGeneration !== subjectGeneration || subjectGeneration !== input.expectedGeneration) {
    return { status: "conflict", reason: "STALE_GENERATION", current: toCurrentDecision(current) };
  }
  if (current.classification === input.verdict.classification) {
    return { status: "conflict", reason: "SAME_VERDICT", current: toCurrentDecision(current) };
  }

  // Compensation reverses what the ledger actually recorded for this event, not the configured deduction.
  const original = tx
    .select({ actualDelta: scoreLedger.actualDelta })
    .from(scoreLedger)
    .where(eq(scoreLedger.idempotencyKey, `event:${event.channelId}:${event.platformMessageRef}`))
    .get();

  // The partial unique index allows one current verdict, so the old one is demoted before the new one is inserted.
  tx.update(verdicts).set({ isCurrent: 0 }).where(eq(verdicts.id, current.verdictId)).run();
  const seq = nextVerdictSeq(tx, event.id);
  tx.insert(verdicts)
    .values({
      id: verdictId,
      eventId: event.id,
      taskId: current.taskId,
      seq,
      classification: input.verdict.classification,
      downstream: toDownstreamVerdict(input.verdict.classification),
      source: "MANUAL",
      isCurrent: 1,
      decidedAt: input.decidedAt,
      decidedByRef: input.actorRef,
    })
    .run();

  const deliverySequence = nextDeliverySequence(tx, event.id);
  tx.insert(deliveries)
    .values({
      id: `overturn-delivery:${event.channelId}:${input.operationId}`,
      eventId: event.id,
      verdictId,
      outputGrantId: null,
      deliverySequence,
      platformOrder: event.platformOrder,
      validUntil: input.validUntil,
      status: "PENDING",
      attempts: 0,
      updatedAt: input.decidedAt,
    })
    .run();

  let compensation: { status: ScoringStatus; actualDelta: number } = { status: "no_effect", actualDelta: 0 };
  if (original !== undefined) {
    const subjectKey = readSubjectKey(tx, event.subjectId);
    const result = commitInTransaction(
      tx,
      {
        subject: { channelId: event.channelId, subjectKey },
        idempotencyKey: `compensation:${event.channelId}:${event.platformMessageRef}`,
        committedAt: input.decidedAt,
        decide: options.planner.planCorrection(-original.actualDelta, event.correlationId),
      },
      newId,
    );
    compensation = scoringStatus(result);
  }

  insertChangeLog(tx, {
    id: newId(),
    channelId: event.channelId,
    occurredAt: input.decidedAt,
    actorRef: input.actorRef,
    changeKind: "MANUAL_VERDICT",
    summary: overturnSummary(current.downstream, toDownstreamVerdict(input.verdict.classification)),
    correlationId: event.correlationId,
    expiresAt: options.changeLogExpiresAt(input.decidedAt),
  });
  if (compensation.status === "applied") {
    insertChangeLog(tx, {
      id: newId(),
      channelId: event.channelId,
      occurredAt: input.decidedAt,
      actorRef: input.actorRef,
      changeKind: "SCORE_CHANGED",
      summary: "纠正计分（依据账本记录）",
      correlationId: event.correlationId,
      expiresAt: options.changeLogExpiresAt(input.decidedAt),
    });
  }

  return {
    status: "overturned",
    seq,
    verdictId,
    eventRef: eventRefOf(event),
    platformOrder: event.platformOrder,
    deliverySequence,
    compensation: compensation.status,
    compensationDelta: compensation.actualDelta,
  };
}

// ---------------------------------------------------------------- resend

function commitResendInTransaction(
  tx: ShortTransaction,
  input: ResendStoreInput,
  options: DecisionStoreOptions,
  newId: () => string,
): ResendStoreResult {
  const delivery = readDeliveryFacts(tx, input.deliveryId);
  if (delivery === undefined) return { status: "refused", reason: "NOT_FOUND" };

  const resendId = `resend:${delivery.channelId}:${input.operationId}`;
  const earlier = tx.select({ id: deliveries.id }).from(deliveries).where(eq(deliveries.id, resendId)).get();
  if (earlier !== undefined) return { status: "duplicate", deliveryId: resendId };

  const event = readEventRow(tx, delivery.eventId);
  if (event === undefined) throw new Error(`delivery ${delivery.deliveryId} refers to a missing event`);
  const current = readCurrentVerdict(tx, event.id);
  if (current === null || current.verdictId !== delivery.verdictId) return { status: "refused", reason: "NOT_CURRENT" };
  if (current.taskGeneration !== readSubjectGeneration(tx, event.subjectId)) {
    return { status: "refused", reason: "STALE_GENERATION" };
  }

  const deliverySequence = nextDeliverySequence(tx, event.id);
  tx.insert(deliveries)
    .values({
      id: resendId,
      eventId: event.id,
      verdictId: current.verdictId,
      outputGrantId: null,
      deliverySequence,
      platformOrder: event.platformOrder,
      validUntil: input.validUntil,
      status: "PENDING",
      attempts: 0,
      updatedAt: input.decidedAt,
    })
    .run();
  insertChangeLog(tx, {
    id: newId(),
    channelId: event.channelId,
    occurredAt: input.decidedAt,
    actorRef: input.actorRef,
    changeKind: "MANUAL_VERDICT",
    summary: "人工补发：过期消息重新投递",
    correlationId: event.correlationId,
    expiresAt: options.changeLogExpiresAt(input.decidedAt),
  });
  return {
    status: "resent",
    deliveryId: resendId,
    downstream: current.downstream,
    eventRef: eventRefOf(event),
    platformOrder: event.platformOrder,
    deliverySequence,
    validUntil: input.validUntil,
  };
}

// ---------------------------------------------------------------- lists and word list

function applySubjectListInTransaction(
  tx: ShortTransaction,
  input: SubjectListEdit,
  options: DecisionStoreOptions,
  newId: () => string,
): SubjectListEditResult {
  const subject = tx
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.channelId, input.channelId), eq(subjects.platformSubjectKey, input.subjectKey)))
    .get();
  if (subject === undefined) return { status: "refused", reason: "SUBJECT_NOT_FOUND" };

  const active = tx
    .select({ id: listEntries.id, listKind: listEntries.listKind })
    .from(listEntries)
    .where(and(eq(listEntries.channelId, input.channelId), eq(listEntries.subjectId, subject.id), isNull(listEntries.removedAt)))
    .get();
  const correlationId = `subject:${subject.id}`;

  if (input.listKind === null) {
    if (active === undefined) return { status: "unchanged", subjectId: subject.id };
    tx.update(listEntries).set({ removedAt: input.changedAt }).where(eq(listEntries.id, active.id)).run();
    insertChangeLog(tx, changeRow(newId(), input, "LIST_CHANGED", "名单变更：移出名单", correlationId, options));
    return { status: "applied", subjectId: subject.id };
  }

  if (active !== undefined) {
    if (active.listKind === input.listKind) return { status: "unchanged", subjectId: subject.id };
    return { status: "conflict", reason: "OTHER_LIST_ACTIVE", subjectId: subject.id };
  }

  tx.insert(listEntries)
    .values({
      id: newId(),
      channelId: input.channelId,
      subjectId: subject.id,
      listKind: input.listKind,
      createdAt: input.changedAt,
      createdByRef: input.actorRef,
      removedAt: null,
    })
    .run();
  const summary = input.listKind === "BLACKLIST" ? "名单变更：加入黑名单" : "名单变更：加入白名单";
  insertChangeLog(tx, changeRow(newId(), input, "LIST_CHANGED", summary, correlationId, options));
  return { status: "applied", subjectId: subject.id };
}

function applyTermInTransaction(
  tx: ShortTransaction,
  input: TermEdit,
  options: DecisionStoreOptions,
  newId: () => string,
): TermEditResult {
  const active = tx
    .select({ id: ruleTerms.id })
    .from(ruleTerms)
    .where(
      and(
        eq(ruleTerms.channelId, input.channelId),
        eq(ruleTerms.matchKind, input.matchKind),
        eq(ruleTerms.language, input.language),
        eq(ruleTerms.term, input.term),
        isNull(ruleTerms.retiredAt),
      ),
    )
    .get();

  if (input.action === "ADD") {
    if (active !== undefined) return { status: "unchanged" };
    tx.insert(ruleTerms)
      .values({
        id: newId(),
        channelId: input.channelId,
        term: input.term,
        matchKind: input.matchKind,
        language: input.language,
        groupCode: input.groupCode,
        createdAt: input.changedAt,
        createdByRef: input.actorRef,
        retiredAt: null,
      })
      .run();
    insertChangeLog(tx, changeRow(newId(), input, "TERM_CHANGED", "词条变更：词条入库", null, options));
    return { status: "applied" };
  }

  if (active === undefined) return { status: "unchanged" };
  tx.update(ruleTerms).set({ retiredAt: input.changedAt }).where(eq(ruleTerms.id, active.id)).run();
  insertChangeLog(tx, changeRow(newId(), input, "TERM_CHANGED", "词条变更：词条停用", null, options));
  return { status: "applied" };
}

// ---------------------------------------------------------------- shared helpers

interface ChangeRowInput {
  readonly id: string;
  readonly channelId: string;
  readonly occurredAt: string;
  readonly actorRef: string;
  readonly changeKind: "MANUAL_VERDICT" | "SCORE_CHANGED" | "LIST_CHANGED" | "TERM_CHANGED";
  readonly summary: string;
  readonly correlationId: string | null;
  readonly expiresAt: string;
}

function insertChangeLog(tx: ShortTransaction, row: ChangeRowInput): void {
  tx.insert(changeLogs)
    .values({
      id: row.id,
      channelId: row.channelId,
      occurredAt: row.occurredAt,
      actorKind: "ACCOUNT",
      actorRef: row.actorRef,
      changeKind: row.changeKind,
      summary: row.summary,
      outcome: "SUCCEEDED",
      correlationId: row.correlationId,
      expiresAt: row.expiresAt,
    })
    .run();
}

function changeRow(
  id: string,
  input: { readonly channelId: string; readonly changedAt: string; readonly actorRef: string },
  changeKind: ChangeRowInput["changeKind"],
  summary: string,
  correlationId: string | null,
  options: DecisionStoreOptions,
): ChangeRowInput {
  return {
    id,
    channelId: input.channelId,
    occurredAt: input.changedAt,
    actorRef: input.actorRef,
    changeKind,
    summary,
    correlationId,
    expiresAt: options.changeLogExpiresAt(input.changedAt),
  };
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

function eventRefOf(event: { channelId: string; platformMessageRef: string; correlationId: string }): EventRef {
  return {
    contractVersion: CONTRACT_VERSION,
    channelId: event.channelId,
    platformMessageId: event.platformMessageRef,
    correlationId: event.correlationId,
  };
}

function readSubjectKey(tx: ShortTransaction, subjectId: string): string {
  return readSubjectGenerationRow(tx, subjectId).key;
}

function readSubjectGeneration(tx: ShortTransaction, subjectId: string): number {
  return readSubjectGenerationRow(tx, subjectId).generation;
}

function readSubjectGenerationRow(tx: ShortTransaction, subjectId: string): { key: string; generation: number } {
  const subject = tx
    .select({ key: subjects.platformSubjectKey, generation: subjects.processingGeneration })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .get();
  if (subject === undefined) throw new Error(`subject ${subjectId} is missing`);
  return subject;
}

function nextDeliverySequence(tx: ShortTransaction, eventId: string): number {
  const latest = tx
    .select({ maxSeq: sql<number>`coalesce(max(${deliveries.deliverySequence}), 0)` })
    .from(deliveries)
    .where(eq(deliveries.eventId, eventId))
    .get();
  return (latest?.maxSeq ?? 0) + 1;
}

function nextVerdictSeq(tx: ShortTransaction, eventId: string): number {
  const latest = tx
    .select({ maxSeq: sql<number>`coalesce(max(${verdicts.seq}), 0)` })
    .from(verdicts)
    .where(eq(verdicts.eventId, eventId))
    .get();
  return (latest?.maxSeq ?? 0) + 1;
}

/** The verdict with `is_current = 1` for one event, with the generation of the task that made it. Null when none. */
function readCurrentVerdict(tx: ShortTransaction, eventId: string): CurrentVerdictFacts | null {
  const row = tx
    .select({
      id: verdicts.id,
      taskId: verdicts.taskId,
      seq: verdicts.seq,
      classification: verdicts.classification,
      downstream: verdicts.downstream,
      source: verdicts.source,
      decidedAt: verdicts.decidedAt,
      taskGeneration: tasks.processingGeneration,
    })
    .from(verdicts)
    .leftJoin(tasks, eq(tasks.id, verdicts.taskId))
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
    taskId: row.taskId ?? "",
    // A verdict without its task cannot prove its generation, so it never matches a subject generation.
    taskGeneration: row.taskGeneration ?? -1,
  };
}

function readCurrentDecision(tx: ShortTransaction, eventId: string): CurrentDecision | null {
  const current = readCurrentVerdict(tx, eventId);
  return current === null ? null : toCurrentDecision(current);
}

function toCurrentDecision(current: CurrentVerdictFacts): CurrentDecision {
  return {
    contractVersion: CONTRACT_VERSION,
    verdictId: current.verdictId,
    seq: current.seq,
    classification: current.classification,
    downstream: current.downstream,
    source: current.source,
    decidedAt: current.decidedAt,
  };
}

/** The Change Log summary names the outcome only. It never carries a score or the message text. */
function manualVerdictSummary(downstream: DownstreamVerdict): string {
  return downstream === "BLOCK" ? "人工裁决：拦截" : "人工裁决：放行";
}

function overturnSummary(before: DownstreamVerdict, after: DownstreamVerdict): string {
  return `复核改判：${before === "BLOCK" ? "拦截" : "放行"} → ${after === "BLOCK" ? "拦截" : "放行"}`;
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

