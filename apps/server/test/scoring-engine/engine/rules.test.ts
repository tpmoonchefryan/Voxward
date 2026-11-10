import { describe, expect, it } from "vitest";
import { resolveScoringConfig } from "../../../src/modules/scoring-engine/config.js";
import { ruleForClassification, selectPenalty } from "../../../src/modules/scoring-engine/rules.js";

describe("selectPenalty", () => {
  it("returns zero when no rule applies", () => {
    expect(selectPenalty([])).toBe(0);
  });

  it("takes the largest applicable deduction instead of adding them up", () => {
    expect(
      selectPenalty([
        { code: "A", points: 3 },
        { code: "B", points: 7 },
        { code: "C", points: 5 },
      ]),
    ).toBe(7);
  });

  it("rejects a deduction that is negative or not an integer", () => {
    expect(() => selectPenalty([{ code: "A", points: -1 }])).toThrow(RangeError);
    expect(() => selectPenalty([{ code: "A", points: 1.5 }])).toThrow(RangeError);
  });
});

describe("ruleForClassification", () => {
  const config = resolveScoringConfig({ enabled: true, complianceReward: 2, violationPenalty: 4 });

  it("maps a meaningful allow to a reward", () => {
    expect(ruleForClassification("ALLOW_MEANINGFUL", config)).toEqual({ kind: "reward", requested: 2 });
  });

  it("maps a block to a penalty with a negative request", () => {
    expect(ruleForClassification("BLOCK", config)).toEqual({ kind: "penalty", requested: -4 });
  });

  it("maps noise to no action", () => {
    expect(ruleForClassification("ALLOW_NOISE", config)).toEqual({ kind: "none" });
  });
});
