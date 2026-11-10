/**
 * Scoring storage as the scoring module sees it. The module never imports the database. A server binding
 * implements this port with one short synchronous transaction per call.
 */

/** Why a score moved. The values match the reason_code CHECK in the database schema. */
export const SCORE_REASON_CODES = [
  "COMPLIANT_REWARD",
  "RULE_PENALTY",
  "IDENTITY_BASE_CHANGE",
  "MANUAL_CORRECTION",
] as const;
export type ScoreReasonCode = (typeof SCORE_REASON_CODES)[number];

/** Identity a subject holds. The values match the identity_kind CHECK in the database schema. */
export const IDENTITY_KINDS = ["CHANNEL_OWNER", "MODERATOR", "PAID_MEMBER", "VERIFIED_ACCOUNT", "UNKNOWN"] as const;
export type IdentityKind = (typeof IDENTITY_KINDS)[number];

/** Scores are kept per channel. The same platform account in two channels is two subjects. */
export interface ScoreSubjectKey {
  readonly channelId: string;
  readonly subjectKey: string;
}

/** Snapshot of one subject, read inside the transaction. */
export interface ScoreSubjectState {
  readonly subjectRef: string;
  readonly identityKind: IdentityKind;
  readonly identityBaseScore: number;
  readonly behaviorAdjustTotal: number;
  readonly currentScore: number;
  readonly version: number;
  readonly lastRewardAt: string | null;
  /** True while a scoring-exception marker is active for this subject in this channel. */
  readonly exceptionActive: boolean;
}

/** A platform-verified identity change. Recorded once per source event reference. */
export interface IdentityFact {
  readonly kind: IdentityKind;
  readonly sourceEventRef: string;
  readonly effectiveFrom: string;
}

/**
 * The change a decision asks the port to persist. `actualDelta` is the change after clamping, and it is the
 * only value written to the ledger. The next* fields are the stored values after this change.
 */
export interface ScoreWrite {
  readonly reasonCode: ScoreReasonCode;
  readonly requestedDelta: number;
  readonly actualDelta: number;
  readonly nextIdentityBaseScore: number;
  readonly nextBehaviorAdjustTotal: number;
  readonly nextCurrentScore: number;
  readonly lastRewardAt: string | null;
  readonly ruleVersion: number | null;
  readonly verdictRef: string | null;
  readonly correlationId: string | null;
  readonly identityFact?: IdentityFact;
}

export type NoEffectReason =
  | "SCORING_DISABLED"
  | "NOISE"
  | "COOLDOWN"
  | "CLAMPED"
  | "ZERO_DELTA"
  | "SAME_IDENTITY";

/** Result of the pure decision. `decide` must return one of these without performing I/O. */
export type ScoreDecision =
  | { readonly kind: "write"; readonly write: ScoreWrite }
  | { readonly kind: "no_effect"; readonly reason: NoEffectReason }
  | { readonly kind: "refused"; readonly reason: "EXCEPTION_ACTIVE" };

export interface ScoreCommitRequest {
  readonly subject: ScoreSubjectKey;
  /** Ledger idempotency key. A key that is already recorded means the change was applied before. */
  readonly idempotencyKey: string;
  /** Set for identity events. An identity event reference that is already recorded is a duplicate. */
  readonly identityEventRef?: string;
  /** ISO 8601 UTC time for the ledger row and the updated_at column. */
  readonly committedAt: string;
  readonly decide: (state: ScoreSubjectState) => ScoreDecision;
}

export type ScoreCommitResult =
  | {
      readonly status: "applied";
      readonly subjectRef: string;
      readonly actualDelta: number;
      readonly ledgerId: string | null;
    }
  | { readonly status: "duplicate"; readonly subjectRef: string; readonly actualDelta: number }
  | { readonly status: "no_effect"; readonly subjectRef: string; readonly reason: NoEffectReason }
  | { readonly status: "refused"; readonly subjectRef: string; readonly reason: "EXCEPTION_ACTIVE" };

export interface ScoringLedgerPort {
  commitScoreDecision(request: ScoreCommitRequest): ScoreCommitResult;
}
