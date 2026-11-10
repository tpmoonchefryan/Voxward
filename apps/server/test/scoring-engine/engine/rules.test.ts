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
    expect(ruleForClassification("ALLOW_MEANINGFUL", config, [])).toEqual({ kind: "reward", requested: 2 });
  });

  it("maps a block to a penalty with a negative request", () => {
    expect(ruleForClassification("BLOCK", config, [])).toEqual({ kind: "penalty", requested: -4 });
  });

  it("maps noise to no action", () => {
    expect(ruleForClassification("ALLOW_NOISE", config, [])).toEqual({ kind: "none" });
  });

  it("takes the largest of the base penalty and the rule deductions for a block (S006 Q22)", () => {
    const hits = [
      { code: "group-a", points: 9 },
      { code: "group-b", points: 2 },
    ];
    expect(ruleForClassification("BLOCK", config, hits)).toEqual({ kind: "penalty", requested: -9 });
    expect(ruleForClassification("BLOCK", config, [{ code: "group-b", points: 2 }])).toEqual({
      kind: "penalty",
      requested: -4,
    });
  });

  it("ignores rule deductions for an allow", () => {
    const hits = [{ code: "group-a", points: 9 }];
    expect(ruleForClassification("ALLOW_MEANINGFUL", config, hits)).toEqual({ kind: "reward", requested: 2 });
    expect(ruleForClassification("ALLOW_NOISE", config, hits)).toEqual({ kind: "none" });
  });
});
