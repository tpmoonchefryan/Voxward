import type { ScoreDecision, ScoreSubjectState } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { resolveScoringConfig } from "../../../src/modules/scoring-engine/config.js";
import { decideIdentityTransition, type IdentityTransition } from "../../../src/modules/scoring-engine/identity-events.js";

/** Synthetic limits and base scores for the decision tests. The numbers are test values, not product values. */
const CONFIG = resolveScoringConfig({
  enabled: true,
  minScore: -10,
  maxScore: 10,
  identityBaseScores: { PAID_MEMBER: 10, MODERATOR: 30 },
});

function stateOf(overrides: Partial<ScoreSubjectState>): ScoreSubjectState {
  return {
    subjectRef: "subject-1",
    identityKind: "UNKNOWN",
    identityBaseScore: 0,
    behaviorAdjustTotal: 0,
    currentScore: 0,
    version: 1,
    lastRewardAt: null,
    exceptionActive: false,
    ...overrides,
  };
}

function transition(nextKind: IdentityTransition["nextKind"], sourceEventRef = "evt-1"): IdentityTransition {
  return { channelId: "channel-a", subjectKey: "viewer-1", sourceEventRef, effectiveFrom: "2026-11-10T10:00:00.000Z", nextKind };
}

function writeOf(decision: ScoreDecision) {
  if (decision.kind !== "write") throw new Error(`expected a write, got ${decision.kind}`);
  return decision.write;
}

describe("identity decision (proposal 5.2)", () => {
  it("moves the base and the score by the full difference inside the range", () => {
    const write = writeOf(decideIdentityTransition(transition("PAID_MEMBER"), stateOf({}), CONFIG));

    expect(write).toMatchObject({
      requestedDelta: 10,
      actualDelta: 10,
      nextIdentityBaseScore: 10,
      nextBehaviorAdjustTotal: 0,
      nextCurrentScore: 10,
    });
  });

  it("at the upper limit gives the base the whole difference, changes no score, and leaves the behavior total alone", () => {
    const state = stateOf({ behaviorAdjustTotal: 10, currentScore: 10 });

    const write = writeOf(decideIdentityTransition(transition("PAID_MEMBER"), state, CONFIG));

    expect(write).toMatchObject({
      requestedDelta: 10,
      actualDelta: 0,
      nextIdentityBaseScore: 10,
      nextBehaviorAdjustTotal: 10,
      nextCurrentScore: 10,
    });
  });

  it("expiry after an upgrade at the limit returns the score to its value before the upgrade", () => {
    const upgraded = stateOf({ identityKind: "PAID_MEMBER", identityBaseScore: 10, behaviorAdjustTotal: 10, currentScore: 10 });

    const write = writeOf(decideIdentityTransition(transition("UNKNOWN", "evt-2"), upgraded, CONFIG));

    expect(write).toMatchObject({
      requestedDelta: -10,
      actualDelta: 0,
      nextIdentityBaseScore: 0,
      nextBehaviorAdjustTotal: 10,
      nextCurrentScore: 10,
    });
  });

  it("keeps a penalty taken at the limit, because expiry works from the behavior total and not from the old score", () => {
    // Upgraded at the limit (base 10, behavior 10, score 10). A penalty of 3 then leaves behavior 7 and score 7.
    const penalised = stateOf({ identityKind: "PAID_MEMBER", identityBaseScore: 10, behaviorAdjustTotal: 7, currentScore: 7 });

    const write = writeOf(decideIdentityTransition(transition("UNKNOWN", "evt-3"), penalised, CONFIG));

    expect(write).toMatchObject({ requestedDelta: -10, actualDelta: 0, nextIdentityBaseScore: 0, nextCurrentScore: 7 });
  });

  it("takes a downgrade by the full difference, and the visible score drops only by what the clamp lets through", () => {
    // A moderator at the upper limit: base 30, behavior 0, score 10. Losing 30 from the base leaves 0 for the score.
    const moderator = stateOf({ identityKind: "MODERATOR", identityBaseScore: 30, behaviorAdjustTotal: 0, currentScore: 10 });

    const write = writeOf(decideIdentityTransition(transition("UNKNOWN", "evt-4"), moderator, CONFIG));

    expect(write).toMatchObject({ requestedDelta: -30, actualDelta: -10, nextIdentityBaseScore: 0, nextCurrentScore: 0 });
  });

  it("does nothing for a repeated identity", () => {
    const decision = decideIdentityTransition(transition("PAID_MEMBER"), stateOf({ identityKind: "PAID_MEMBER" }), CONFIG);

    expect(decision).toEqual({ kind: "no_effect", reason: "SAME_IDENTITY" });
  });

  it("moves no score for a zero difference, and keeps the current score as it is", () => {
    const state = stateOf({ behaviorAdjustTotal: 3, currentScore: 3 });

    const write = writeOf(decideIdentityTransition(transition("VERIFIED_ACCOUNT"), state, CONFIG));

    expect(write).toMatchObject({ requestedDelta: 0, actualDelta: 0, nextIdentityBaseScore: 0, nextCurrentScore: 3 });
  });

  it("moves no base and no score while scoring is switched off, and still records the identity", () => {
    const disabled = resolveScoringConfig({ ...CONFIG, enabled: false });

    const write = writeOf(decideIdentityTransition(transition("PAID_MEMBER"), stateOf({}), disabled));

    expect(write).toMatchObject({ requestedDelta: 0, actualDelta: 0, nextIdentityBaseScore: 0, nextCurrentScore: 0 });
    expect(write.identityFact).toEqual({
      kind: "PAID_MEMBER",
      sourceEventRef: "evt-1",
      effectiveFrom: "2026-11-10T10:00:00.000Z",
    });
  });
});
