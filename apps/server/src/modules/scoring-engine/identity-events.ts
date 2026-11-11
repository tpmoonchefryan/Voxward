import type { IdentityKind, ScoreDecision, ScoreSubjectState } from "@voxward/contracts";
import { clampScore } from "./clamp.js";
import type { ScoringConfig } from "./config.js";
import { identityBaseDelta } from "./identity-delta.js";

/** A platform-verified identity change for one subject in one channel. */
export interface IdentityTransition {
  readonly channelId: string;
  readonly subjectKey: string;
  /** Platform reference of the identity event. One reference applies at most once. */
  readonly sourceEventRef: string;
  /** ISO 8601 UTC time at which the new identity took effect. */
  readonly effectiveFrom: string;
  readonly nextKind: IdentityKind;
}

export function identityIdempotencyKey(sourceEventRef: string): string {
  return `identity:${sourceEventRef}`;
}

/**
 * Pure decision for an identity change (proposal §5.2). The identity base score takes the whole configured difference,
 * even when a limit is reached. The current score is then the clamped sum of the identity base and the behavior
 * adjustment, and the behavior adjustment is not touched. So a member who is upgraded at the upper limit and later
 * expires returns to the score they had before the upgrade, with no deduction from nothing.
 *
 * A repeated identity is no change. The identity fact is recorded even when the score does not move, so the next
 * transition is computed from the true previous identity.
 */
export function decideIdentityTransition(
  transition: IdentityTransition,
  state: ScoreSubjectState,
  config: ScoringConfig,
): ScoreDecision {
  if (state.identityKind === transition.nextKind) return { kind: "no_effect", reason: "SAME_IDENTITY" };

  const requested = config.enabled
    ? identityBaseDelta(state.identityKind, transition.nextKind, config.identityBaseScores)
    : 0;
  const nextIdentityBaseScore = state.identityBaseScore + requested;
  const nextCurrentScore =
    requested === 0 ? state.currentScore : clampScore(nextIdentityBaseScore + state.behaviorAdjustTotal, config);

  return {
    kind: "write",
    write: {
      reasonCode: "IDENTITY_BASE_CHANGE",
      requestedDelta: requested,
      actualDelta: nextCurrentScore - state.currentScore,
      nextIdentityBaseScore,
      nextBehaviorAdjustTotal: state.behaviorAdjustTotal,
      nextCurrentScore,
      lastRewardAt: state.lastRewardAt,
      ruleVersion: null,
      verdictRef: null,
      correlationId: null,
      identityFact: {
        kind: transition.nextKind,
        sourceEventRef: transition.sourceEventRef,
        effectiveFrom: transition.effectiveFrom,
      },
    },
  };
}
