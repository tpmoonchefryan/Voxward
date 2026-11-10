import type { IdentityKind, ScoreDecision, ScoreSubjectState } from "@voxward/contracts";
import { applyClampedDelta } from "./clamp.js";
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
 * Pure decision for an identity change. The identity base score moves by the configured difference, through the same
 * running clamp as every other change. A repeated identity is no change. The identity fact is recorded even when
 * the score does not move, so the next transition is computed from the true previous identity.
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
  const change =
    requested === 0
      ? { nextScore: state.currentScore, actualDelta: 0 }
      : applyClampedDelta(state.currentScore, requested, config);

  return {
    kind: "write",
    write: {
      reasonCode: "IDENTITY_BASE_CHANGE",
      requestedDelta: requested,
      actualDelta: change.actualDelta,
      nextIdentityBaseScore: state.identityBaseScore + change.actualDelta,
      nextBehaviorAdjustTotal: state.behaviorAdjustTotal,
      nextCurrentScore: change.nextScore,
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
