/**
 * Decision storage as the decision module sees it. The module never imports the database. A server binding implements
 * this port. Reads return facts. Each write is one short synchronous transaction that checks its guards again, so a
 * decision made on stale facts is refused instead of written.
 */
import type { EventRef } from "../events/channel-event.js";
import type { Verdict } from "../decisions/verdict.js";
import type { CommitConflictReason, CurrentDecision, DecisionSource } from "../modules/decision-service.js";
import type { TaskStatus } from "../tasks/task-ref.js";
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

export interface DecisionStorePort {
  /** Read only. Undefined when the task does not exist. */
  readTask(taskId: string): DecisionTaskFacts | undefined;
  /**
   * One short transaction. Settles the task only while it is open, its event version and generation still match,
   * and the event has no current verdict. The verdict, the delivery intent, the score and the Change Log row commit
   * together, or none of them does.
   */
  commitVerdict(input: CommitVerdictInput): CommitVerdictStoreResult;
}
