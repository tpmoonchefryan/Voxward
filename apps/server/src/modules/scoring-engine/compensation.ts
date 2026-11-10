import type { ScoreDecision, ScoreSubjectState } from "@voxward/contracts";
import { applyClampedDelta } from "./clamp.js";
import type { ScoringConfig } from "./config.js";

/** An operator correction of one subject's score. */
export interface ManualCorrection {
  readonly channelId: string;
  readonly subjectKey: string;
  /** Operator-supplied identifier. One identifier applies at most once. */
  readonly operationId: string;
  /** Points to add (positive) or remove (negative). */
  readonly delta: number;
  /**
   * Reference to the operator. The ledger has no column for it, so the audit trail must keep it.
   * The audit store is not wired yet.
   */
  readonly operatorRef: string;
}

export function manualIdempotencyKey(operationId: string): string {
  return `manual:${operationId}`;
}

/**
 * Pure decision for a manual correction. It is recorded as a behavior adjustment and goes through the running clamp.
 * Switching scoring off also stops corrections, because the switch means no score changes.
 */
export function decideManualCorrection(
  correction: ManualCorrection,
  state: ScoreSubjectState,
  config: ScoringConfig,
): ScoreDecision {
  if (!config.enabled) return { kind: "no_effect", reason: "SCORING_DISABLED" };
  if (correction.delta === 0) return { kind: "no_effect", reason: "ZERO_DELTA" };

  const { nextScore, actualDelta } = applyClampedDelta(state.currentScore, correction.delta, config);
  if (actualDelta === 0) return { kind: "no_effect", reason: "CLAMPED" };

  return {
    kind: "write",
    write: {
      reasonCode: "MANUAL_CORRECTION",
      requestedDelta: correction.delta,
      actualDelta,
      nextIdentityBaseScore: state.identityBaseScore,
      nextBehaviorAdjustTotal: state.behaviorAdjustTotal + actualDelta,
      nextCurrentScore: nextScore,
      lastRewardAt: state.lastRewardAt,
      ruleVersion: null,
      verdictRef: null,
      correlationId: `manual:${correction.operationId}`,
    },
  };
}
