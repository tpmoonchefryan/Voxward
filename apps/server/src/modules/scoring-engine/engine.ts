import type { ChannelEvent, ScoreDecision, ScoreSubjectState, Verdict } from "@voxward/contracts";
import { applyClampedDelta } from "./clamp.js";
import type { ScoringConfig } from "./config.js";
import { ruleForClassification } from "./rules.js";

/**
 * True while a reward is still inside its cooldown. A zero cooldown never blocks. An event that is older than
 * the last reward counts as inside the cooldown, which is the conservative reading of an out-of-order event.
 */
export function isRewardCoolingDown(lastRewardAt: string | null, eventTime: string, cooldownMs: number): boolean {
  if (cooldownMs <= 0 || lastRewardAt === null) return false;
  return Date.parse(eventTime) - Date.parse(lastRewardAt) < cooldownMs;
}

/**
 * Pure decision for one verdict: the rule table, the reward cooldown and the running clamp. It performs no I/O,
 * so the storage port can call it inside its transaction. The caller has already validated the verdict.
 */
export function decideVerdictChange(
  event: ChannelEvent,
  verdict: Verdict,
  state: ScoreSubjectState,
  config: ScoringConfig,
): ScoreDecision {
  if (!config.enabled) return { kind: "no_effect", reason: "SCORING_DISABLED" };

  const action = ruleForClassification(verdict.classification, config, verdict.penaltyHits);
  if (action.kind === "none") return { kind: "no_effect", reason: "NOISE" };
  if (action.kind === "reward" && isRewardCoolingDown(state.lastRewardAt, event.receivedAt, config.rewardCooldownMs)) {
    return { kind: "no_effect", reason: "COOLDOWN" };
  }
  if (action.requested === 0) return { kind: "no_effect", reason: "ZERO_DELTA" };

  const { nextScore, actualDelta } = applyClampedDelta(state.currentScore, action.requested, config);
  if (actualDelta === 0) return { kind: "no_effect", reason: "CLAMPED" };

  const isReward = action.kind === "reward";
  return {
    kind: "write",
    write: {
      reasonCode: isReward ? "COMPLIANT_REWARD" : "RULE_PENALTY",
      requestedDelta: action.requested,
      actualDelta,
      nextIdentityBaseScore: state.identityBaseScore,
      nextBehaviorAdjustTotal: state.behaviorAdjustTotal + actualDelta,
      nextCurrentScore: nextScore,
      lastRewardAt: isReward ? event.receivedAt : state.lastRewardAt,
      ruleVersion: null,
      verdictRef: null,
      correlationId: event.correlationId,
    },
  };
}
