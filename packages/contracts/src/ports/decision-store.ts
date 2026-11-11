/**
 * Decision storage as the decision module sees it. The module never imports the database. A server binding implements
 * this port. Reads return facts. Each write is one short synchronous transaction that checks its guards again, so a
 * decision made on stale facts is refused instead of written.
 */
import type { EventRef } from "../events/channel-event.js";
import type { DownstreamVerdict, Verdict } from "../decisions/verdict.js";
import type {
  CommitConflictReason,
  CurrentDecision,
  DecisionSource,
  OverturnConflictReason,
} from "../modules/decision-service.js";
import type { TaskStatus } from "../tasks/task-ref.js";
import type { ListKind } from "./data-request.js";
import type { ScoreDecision, ScoreSubjectState } from "./scoring-ledger.js";

/** What a score write did. `applied` changed the score, the others changed nothing. */
export type ScoringStatus = "applied" | "duplicate" | "no_effect" | "refused";

/** A pure scoring decision for one subject, evaluated inside the transaction that writes it. */
export type ScoreDecider = (state: ScoreSubjectState) => ScoreDecision;

/** The event facts a verdict score needs. Nothing from the platform profile. */
export interface VerdictScoringFacts {
  readonly channelId: string;
  readonly platformMessageId: string;
  readonly subjectKey: string;
  readonly receivedAt: string;
  readonly correlationId: string;
}

/**
 * Scoring plans for the decision transaction. A server binding builds them from the scoring module, which the decision
 * module cannot import. Each plan is pure, so it can run inside the transaction without I/O.
 */
export interface ScoringPlanner {
  planVerdict(facts: VerdictScoringFacts, verdict: Verdict): ScoreDecider;
  /** Corrects a score by `delta` points, through the running clamp. The correlation identifier goes into the ledger row. */
  planCorrection(delta: number, correlationId: string): ScoreDecider;
}

/** Facts of one task that a commit needs. Read only. */
export interface DecisionTaskFacts {
  readonly taskId: string;
  readonly channelId: string;
  readonly eventId: string;
  readonly status: TaskStatus;
  readonly eventVersion: number;
  readonly processingGeneration: number;
  readonly deadlineAt: string;
}

export interface CommitVerdictInput {
  readonly taskId: string;
  readonly verdictId: string;
  readonly deliveryId: string;
  readonly verdict: Verdict;
  readonly source: DecisionSource;
  readonly decidedAt: string;
  readonly decidedByRef: string;
  /** The operator who made a human decision. Null for a system result, which gets no Change Log row. */
  readonly changeActorRef: string | null;
  readonly validUntil: string;
}

export type CommitVerdictStoreResult =
  | {
      readonly status: "committed";
      readonly verdictId: string;
      readonly seq: number;
      readonly eventRef: EventRef;
      readonly platformOrder: number;
      readonly deliverySequence: number;
      readonly scoring: ScoringStatus;
      readonly actualDelta: number;
    }
  | { readonly status: "conflict"; readonly reason: CommitConflictReason; readonly current: CurrentDecision | null };

/** The current verdict of an event and the processing generation of the task that produced it. */
export interface CurrentVerdictFacts extends CurrentDecision {
  readonly taskId: string;
  readonly taskGeneration: number;
}

/** Facts of one event that a review reads before it decides. Read only. */
export interface EventFacts {
  readonly eventId: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly subjectKey: string;
  readonly subjectGeneration: number;
  readonly platformMessageRef: string;
  readonly platformOrder: number;
  readonly receivedAt: string;
  readonly correlationId: string;
  /** Null when the event has no current verdict yet. */
  readonly current: CurrentVerdictFacts | null;
}

/** A delivery intent as stored. Read only. */
export interface DeliveryFacts {
  readonly deliveryId: string;
  readonly channelId: string;
  readonly eventId: string;
  readonly verdictId: string;
  readonly validUntil: string;
  readonly receivedAt: string;
}

export interface OverturnStoreInput {
  readonly eventId: string;
  readonly operationId: string;
  /** The verdict the reviewer saw. The write applies only while it is still current. */
  readonly expectedVerdictId: string;
  /** The subject generation the reviewer saw. The write applies only while it is unchanged. */
  readonly expectedGeneration: number;
  readonly verdict: Verdict;
  readonly actorRef: string;
  readonly decidedAt: string;
  readonly validUntil: string;
}

export type OverturnStoreResult =
  | {
      readonly status: "overturned";
      readonly seq: number;
      readonly verdictId: string;
      readonly eventRef: EventRef;
      readonly platformOrder: number;
      readonly deliverySequence: number;
      readonly compensation: ScoringStatus;
      readonly compensationDelta: number;
    }
  | { readonly status: "duplicate"; readonly seq: number; readonly verdictId: string }
  | { readonly status: "conflict"; readonly reason: OverturnConflictReason; readonly current: CurrentDecision | null };

export interface ResendStoreInput {
  readonly deliveryId: string;
  readonly operationId: string;
  readonly actorRef: string;
  readonly decidedAt: string;
  readonly validUntil: string;
}

export type ResendStoreResult =
  | {
      readonly status: "resent";
      readonly deliveryId: string;
      readonly downstream: DownstreamVerdict;
      readonly eventRef: EventRef;
      readonly platformOrder: number;
      readonly deliverySequence: number;
      readonly validUntil: string;
    }
  | { readonly status: "duplicate"; readonly deliveryId: string }
  | { readonly status: "refused"; readonly reason: "NOT_FOUND" | "NOT_CURRENT" | "STALE_GENERATION" };

/** Blacklist or whitelist change for one subject. `listKind` null removes the active entry. */
export interface SubjectListEdit {
  readonly channelId: string;
  readonly subjectKey: string;
  readonly listKind: ListKind | null;
  readonly actorRef: string;
  readonly changedAt: string;
}

export type SubjectListEditResult =
  | { readonly status: "applied"; readonly subjectId: string }
  | { readonly status: "unchanged"; readonly subjectId: string }
  | { readonly status: "conflict"; readonly reason: "OTHER_LIST_ACTIVE"; readonly subjectId: string }
  | { readonly status: "refused"; readonly reason: "SUBJECT_NOT_FOUND" };

export const TERM_MATCH_KINDS = ["EXACT", "NORMALIZED", "CROSS_LANGUAGE_PHONETIC", "CONSTRAINED_REGEX"] as const;
export type TermMatchKind = (typeof TERM_MATCH_KINDS)[number];

/** A word-list entry change. `ADD` creates an active entry, `RETIRE` ends the active one. */
export interface TermEdit {
  readonly channelId: string;
  readonly action: "ADD" | "RETIRE";
  readonly term: string;
  readonly matchKind: TermMatchKind;
  readonly language: string;
  readonly groupCode: string;
  readonly actorRef: string;
  readonly changedAt: string;
}

export type TermEditResult = { readonly status: "applied" } | { readonly status: "unchanged" };

export interface DecisionStorePort {
  /** Read only. Undefined when the task does not exist. */
  readTask(taskId: string): DecisionTaskFacts | undefined;
  /**
   * One short transaction. Settles the task only while it is open, its event version and generation still match,
   * and the event has no current verdict. The verdict, the delivery intent, the score and the Change Log row commit
   * together, or none of them does.
   */
  commitVerdict(input: CommitVerdictInput): CommitVerdictStoreResult;
  /** Read only. Undefined when the event does not exist. */
  readEvent(eventId: string): EventFacts | undefined;
  /** Read only. Undefined when the delivery does not exist. */
  readDelivery(deliveryId: string): DeliveryFacts | undefined;
  /**
   * One short transaction. Replaces the current verdict with a new one, and writes the delivery intent and the score
   * correction of the original scoring once. Stale facts are refused, and a repeated operation is a duplicate.
   */
  commitOverturn(input: OverturnStoreInput): OverturnStoreResult;
  /** One short transaction. Adds a delivery for an expired verdict. A repeated operation is a duplicate. */
  commitResend(input: ResendStoreInput): ResendStoreResult;
  /** One short transaction. Changes the subject's list entry, with its Change Log row, when the state differs. */
  applySubjectList(input: SubjectListEdit): SubjectListEditResult;
  /** One short transaction. Adds or retires one word-list entry, with its Change Log row, when the state differs. */
  applyTerm(input: TermEdit): TermEditResult;
}
