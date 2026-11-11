import type { DownstreamVerdict, InternalClassification, Verdict } from "../decisions/verdict.js";
import type { DeliveryIntent } from "../delivery/delivery-intent.js";
import type { ScoringStatus } from "../ports/decision-store.js";
import { type Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

/** Where a final verdict came from. MANUAL is a human takeover or a human correction. */
export const DECISION_SOURCES = ["BASE_RULE", "MODEL", "FAST_PASS", "MANUAL"] as const;
export type DecisionSource = (typeof DECISION_SOURCES)[number];

/**
 * Reasons a commit does not settle. Each one leaves the stored decision unchanged, so a late or stale result
 * never overwrites an earlier one.
 */
export const COMMIT_CONFLICT_REASONS = [
  "TASK_NOT_FOUND",
  "TASK_NOT_OPEN",
  "STALE_EVENT_VERSION",
  "STALE_GENERATION",
  "ALREADY_FINAL",
] as const;
export type CommitConflictReason = (typeof COMMIT_CONFLICT_REASONS)[number];

/** Reasons a review does not change the verdict. Nothing is written when one applies. */
export const OVERTURN_CONFLICT_REASONS = [
  "EVENT_NOT_FOUND",
  "NO_CURRENT_VERDICT",
  "STALE_GENERATION",
  "SAME_VERDICT",
  "CHANGED_BY_OTHER",
] as const;
export type OverturnConflictReason = (typeof OVERTURN_CONFLICT_REASONS)[number];

/** Reasons a resend is refused. The delivery is not sent again. */
export const RESEND_REFUSAL_REASONS = ["NOT_FOUND", "NOT_EXPIRED", "NOT_CURRENT", "STALE_GENERATION", "WINDOW_CLOSED", "ALREADY_SENT"] as const;
export type ResendRefusalReason = (typeof RESEND_REFUSAL_REASONS)[number];

/** The decision stored for an event now. An operator sees it when a commit or a review loses a race. */
export interface CurrentDecision extends Versioned {
  readonly verdictId: string;
  readonly seq: number;
  readonly classification: InternalClassification;
  readonly downstream: DownstreamVerdict;
  readonly source: DecisionSource;
  readonly decidedAt: string;
}

/**
 * A human acting in one channel. The HTTP binding resolves `capabilities` from the channel membership, so the
 * module checks what the actor may do without reading the auth module.
 */
export interface DecisionActor extends Versioned {
  readonly accountRef: string;
  readonly channelId: string;
  readonly capabilities: ReadonlySet<string>;
}

/** The capability a human needs to commit, review or resend a verdict. */
export const REVIEW_CAPABILITY = "review.decide";

export type CommitOrigin =
  | { readonly kind: "HUMAN"; readonly actor: DecisionActor }
  | { readonly kind: "SYSTEM"; readonly source: Exclude<DecisionSource, "MANUAL"> };

export type CommitOutcome =
  | {
      readonly status: "committed";
      readonly intent: DeliveryIntent;
      readonly seq: number;
      readonly scoring: ScoringStatus;
      readonly actualDelta: number;
    }
  | { readonly status: "conflict"; readonly reason: CommitConflictReason; readonly current: CurrentDecision | null }
  | { readonly status: "denied"; readonly reason: "PERMISSION_DENIED" };

/** A human review that changes the current verdict of one event. `operationId` makes a repeated request a duplicate. */
export interface OverturnRequest {
  readonly eventId: string;
  readonly operationId: string;
  readonly verdict: Verdict;
  readonly actor: DecisionActor;
}

export type OverturnOutcome =
  | {
      readonly status: "overturned";
      readonly seq: number;
      readonly verdictId: string;
      /** The downstream verdict of the new conclusion. */
      readonly downstream: DownstreamVerdict;
      /**
       * The delivery this review sends now. Null for a release: a released message reaches the output only through an
       * explicit resend. A block is delivered at once, so the output can take the old content off.
       */
      readonly intent: DeliveryIntent | null;
      /** What the score correction did. `no_effect` covers an event that had no score change to correct. */
      readonly compensation: ScoringStatus;
      /** Points the correction moved the score by, after the clamp. Zero when nothing was corrected. */
      readonly compensationDelta: number;
      /**
       * True when a later score entry of the same subject reached a limit, so a replay of the ledger could end at another
       * score. The correction keeps the ledger amount; a person checks the difference (proposal 7.1).
       */
      readonly needsManualAdjustment: boolean;
    }
  | { readonly status: "duplicate"; readonly seq: number; readonly verdictId: string }
  | { readonly status: "conflict"; readonly reason: OverturnConflictReason; readonly current: CurrentDecision | null }
  | { readonly status: "denied"; readonly reason: "PERMISSION_DENIED" };

/** An explicit request to send an expired delivery again. `operationId` makes a repeated request a duplicate. */
export interface ResendRequest {
  readonly deliveryId: string;
  readonly operationId: string;
  readonly actor: DecisionActor;
}

export type ResendOutcome =
  | { readonly status: "resent"; readonly intent: DeliveryIntent }
  | { readonly status: "duplicate"; readonly deliveryId: string }
  | { readonly status: "refused"; readonly reason: ResendRefusalReason }
  | { readonly status: "denied"; readonly reason: "PERMISSION_DENIED" };

/**
 * Manual operations, version checks and transactions. The module decides; the storage port commits each decision in one
 * short transaction and checks the guards again before it writes.
 */
export interface DecisionService extends VersionedModule<"DecisionService"> {
  commit(taskId: string, verdict: Verdict, origin: CommitOrigin): Promise<CommitOutcome>;
  overturn(request: OverturnRequest): Promise<OverturnOutcome>;
  resend(request: ResendRequest): Promise<ResendOutcome>;
}
