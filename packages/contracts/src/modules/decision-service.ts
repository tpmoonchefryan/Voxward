import type { DownstreamVerdict, InternalClassification, Verdict } from "../decisions/verdict.js";
import type { DeliveryIntent } from "../delivery/delivery-intent.js";
import type { ScoringStatus } from "../ports/decision-store.js";
import type { Versioned } from "../version.js";
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

/** The decision stored for an event now. An operator sees it when a commit loses a race. */
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

/** The capability a human needs to commit or correct a verdict. */
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

/**
 * Manual operations, version checks and transactions. The module decides; the storage port commits each decision in one
 * short transaction and checks the guards again before it writes.
 */
export interface DecisionService extends VersionedModule<"DecisionService"> {
  /** Settles one task by its identifier. The stored task, event and subject are checked again inside the transaction. */
  commit(taskId: string, verdict: Verdict, origin: CommitOrigin): Promise<CommitOutcome>;
}
