import { createVerdict, type InternalClassification, type ScoreDecision, type ScoreSubjectState } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORING_CONFIG,
  resolveScoringConfig,
  type ScoringConfig,
} from "../../../src/modules/scoring-engine/config.js";
import { ScoringConfigError } from "../../../src/modules/scoring-engine/errors.js";
import { decideVerdictChange, isRewardCoolingDown } from "../../../src/modules/scoring-engine/engine.js";
import { makeEvent, makeState, seededRandom } from "../synthetic.js";

const T = "2026-11-10T10:00:00.000Z";
const CONFIG: ScoringConfig = resolveScoringConfig({
  enabled: true,
  minScore: -10,
  maxScore: 10,
  complianceReward: 2,
  violationPenalty: 3,
  rewardCooldownMs: 60_000,
});

function decide(
  classification: InternalClassification,
  state: Partial<ScoreSubjectState> = {},
  options: { readonly receivedAt?: string; readonly config?: ScoringConfig } = {},
): ScoreDecision {
  const event = makeEvent({ receivedAt: options.receivedAt ?? T });
  return decideVerdictChange(event, createVerdict(classification), makeState(state), options.config ?? CONFIG);
}

describe("resolveScoringConfig", () => {
  it("uses the placeholder defaults, with scoring switched off", () => {
    expect(resolveScoringConfig()).toEqual(DEFAULT_SCORING_CONFIG);
    expect(DEFAULT_SCORING_CONFIG.enabled).toBe(false);
  });

  it("merges one identity kind onto the defaults and keeps the others", () => {
    const config = resolveScoringConfig({ identityBaseScores: { PAID_MEMBER: 10 } });
    expect(config.identityBaseScores.PAID_MEMBER).toBe(10);
    expect(config.identityBaseScores.UNKNOWN).toBe(0);
  });

  it("rejects a range that does not contain the starting score of zero", () => {
    expect(() => resolveScoringConfig({ minScore: 1 })).toThrow(ScoringConfigError);
    expect(() => resolveScoringConfig({ maxScore: -1 })).toThrow(ScoringConfigError);
    expect(() => resolveScoringConfig({ minScore: 5, maxScore: 4 })).toThrow(ScoringConfigError);
  });

  it("rejects values that are not integers, not non-negative, or not a known identity kind", () => {
    expect(() => resolveScoringConfig({ complianceReward: 1.5 })).toThrow(/complianceReward/);
    expect(() => resolveScoringConfig({ violationPenalty: -1 })).toThrow(ScoringConfigError);
    expect(() => resolveScoringConfig({ rewardCooldownMs: -1 })).toThrow(ScoringConfigError);
    expect(() => resolveScoringConfig({ identityBaseScores: { GHOST: 1 } as never })).toThrow(ScoringConfigError);
  });
});

describe("decideVerdictChange", () => {
  it("adds the compliance reward and records it as behavior, with the reward time", () => {
    const decision = decide("ALLOW_MEANINGFUL", { currentScore: 3, behaviorAdjustTotal: 3 });
    expect(decision.kind).toBe("write");
    if (decision.kind !== "write") return;
    expect(decision.write).toMatchObject({
      reasonCode: "COMPLIANT_REWARD",
      requestedDelta: 2,
      actualDelta: 2,
      nextIdentityBaseScore: 0,
      nextBehaviorAdjustTotal: 5,
      nextCurrentScore: 5,
      lastRewardAt: T,
      correlationId: "corr-msg-1",
    });
  });

  it("refuses a reward while the cooldown is running, and the boundary is exactly one cooldown", () => {
    const lastRewardAt = "2026-11-10T09:59:00.000Z";
    expect(decide("ALLOW_MEANINGFUL", { lastRewardAt }).kind).toBe("write");
    expect(decide("ALLOW_MEANINGFUL", { lastRewardAt: "2026-11-10T09:59:00.001Z" })).toEqual({
      kind: "no_effect",
      reason: "COOLDOWN",
    });
  });

  it("treats an event older than the last reward as inside the cooldown", () => {
    expect(decide("ALLOW_MEANINGFUL", { lastRewardAt: T }, { receivedAt: "2026-11-10T09:59:00.000Z" })).toEqual({
      kind: "no_effect",
      reason: "COOLDOWN",
    });
  });

  it("never blocks a reward when the cooldown is zero", () => {
    const config = resolveScoringConfig({ enabled: true, rewardCooldownMs: 0, complianceReward: 1 });
    expect(decide("ALLOW_MEANINGFUL", { lastRewardAt: T }, { config }).kind).toBe("write");
  });

  it("applies a penalty even inside the reward cooldown, and leaves the reward time unchanged", () => {
    const decision = decide("BLOCK", { lastRewardAt: T });
    expect(decision.kind).toBe("write");
    if (decision.kind !== "write") return;
    expect(decision.write).toMatchObject({
      reasonCode: "RULE_PENALTY",
      requestedDelta: -3,
      actualDelta: -3,
      nextCurrentScore: -3,
      nextBehaviorAdjustTotal: -3,
      lastRewardAt: T,
    });
  });

  it("changes nothing for noise", () => {
    expect(decide("ALLOW_NOISE", { currentScore: 4, behaviorAdjustTotal: 4 })).toEqual({
      kind: "no_effect",
      reason: "NOISE",
    });
  });

  it("changes nothing for any verdict while scoring is switched off", () => {
    const off = resolveScoringConfig({ enabled: false, complianceReward: 2, violationPenalty: 3 });
    for (const classification of ["ALLOW_MEANINGFUL", "BLOCK", "ALLOW_NOISE"] as const) {
      expect(decide(classification, {}, { config: off })).toEqual({ kind: "no_effect", reason: "SCORING_DISABLED" });
    }
  });

  it("lowers the score by the violation penalty", () => {
    const decision = decide("BLOCK", { currentScore: 1, behaviorAdjustTotal: 1 });
    expect(decision.kind === "write" && decision.write.nextCurrentScore).toBe(-2);
  });

  it("records only the part of a reward that fits below the upper limit", () => {
    const decision = decide("ALLOW_MEANINGFUL", { currentScore: 9, behaviorAdjustTotal: 9 });
    expect(decision.kind).toBe("write");
    if (decision.kind !== "write") return;
    expect(decision.write).toMatchObject({ requestedDelta: 2, actualDelta: 1, nextCurrentScore: 10, nextBehaviorAdjustTotal: 10 });
  });

  it("records only the part of a penalty that fits above the lower limit", () => {
    const decision = decide("BLOCK", { currentScore: -9, behaviorAdjustTotal: -9 });
    expect(decision.kind === "write" && decision.write).toMatchObject({ actualDelta: -1, nextCurrentScore: -10 });
  });

  it("records nothing when the score is already at the limit the change pushes toward", () => {
    expect(decide("ALLOW_MEANINGFUL", { currentScore: 10, behaviorAdjustTotal: 10 })).toEqual({
      kind: "no_effect",
      reason: "CLAMPED",
    });
    expect(decide("BLOCK", { currentScore: -10, behaviorAdjustTotal: -10 })).toEqual({
      kind: "no_effect",
      reason: "CLAMPED",
    });
  });

  it("does not move the reward time when a clamped reward changes nothing", () => {
    expect(decide("ALLOW_MEANINGFUL", { currentScore: 10, behaviorAdjustTotal: 10, lastRewardAt: null })).toEqual({
      kind: "no_effect",
      reason: "CLAMPED",
    });
  });

  it("changes nothing when the compliance reward is configured as zero", () => {
    const config = resolveScoringConfig({ enabled: true, complianceReward: 0 });
    expect(decide("ALLOW_MEANINGFUL", {}, { config })).toEqual({ kind: "no_effect", reason: "ZERO_DELTA" });
  });

  it("keeps current = identity base + behavior, inside the range, over a synthetic sequence", () => {
    const random = seededRandom(20261110);
    const kinds: InternalClassification[] = ["ALLOW_MEANINGFUL", "ALLOW_NOISE", "BLOCK"];
    let state: ScoreSubjectState = makeState();
    let elapsedMs = Date.parse(T);
    let sumOfActual = 0;
    let clampedSteps = 0;

    for (let step = 0; step < 300; step += 1) {
      elapsedMs += Math.floor(random() * 90_000);
      const event = makeEvent({ messageId: `msg-${step}`, receivedAt: new Date(elapsedMs).toISOString() });
      const verdict = createVerdict(kinds[Math.floor(random() * kinds.length)] ?? "ALLOW_NOISE");
      const decision = decideVerdictChange(event, verdict, state, CONFIG);

      if (decision.kind === "write") {
        const write = decision.write;
        sumOfActual += write.actualDelta;
        state = {
          ...state,
          identityBaseScore: write.nextIdentityBaseScore,
          behaviorAdjustTotal: write.nextBehaviorAdjustTotal,
          currentScore: write.nextCurrentScore,
          lastRewardAt: write.lastRewardAt,
          version: state.version + 1,
        };
      } else if (decision.reason === "CLAMPED") {
        clampedSteps += 1;
      }

      expect(state.currentScore).toBe(state.identityBaseScore + state.behaviorAdjustTotal);
      expect(state.currentScore).toBeGreaterThanOrEqual(CONFIG.minScore);
      expect(state.currentScore).toBeLessThanOrEqual(CONFIG.maxScore);
    }

    expect(sumOfActual).toBe(state.currentScore);
    expect(clampedSteps).toBeGreaterThan(0);
  });
});

describe("isRewardCoolingDown", () => {
  it("never reports a cooldown without a previous reward", () => {
    expect(isRewardCoolingDown(null, T, 60_000)).toBe(false);
  });
});
