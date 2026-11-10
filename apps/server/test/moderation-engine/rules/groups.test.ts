import { describe, expect, it } from "vitest";
import {
  compileRuleSet,
  decideVerdict,
  type GroupAction,
  type RuleHit,
  type RuleIssue,
  type RuleSetInput,
} from "../../../src/modules/moderation-engine/rules/groups.js";

const block: GroupAction = { kind: "BLOCK" };
const review: GroupAction = { kind: "REVIEW" };
const deduct = (value: number): GroupAction => ({ kind: "DEDUCT", deduction: value });

function issuesOf(input: RuleSetInput): RuleIssue[] {
  const result = compileRuleSet(input);
  if (result.ok) throw new Error("rule set should have been refused");
  return [...result.issues];
}

function hit(action: GroupAction, groupId: string): RuleHit {
  return { ruleId: `${groupId}-rule`, groupId, action, scope: "body", spans: [] };
}

describe("rule set compilation", () => {
  it("compiles a set that uses every rule kind", () => {
    const result = compileRuleSet({
      version: "2026-11-10.1",
      groups: [
        {
          id: "explicit",
          action: block,
          rules: [
            { id: "exact-term", kind: "exact", text: "Foo" },
            { id: "normal-term", kind: "normalized", text: "ＢＡＤ" },
          ],
        },
        { id: "soft", action: deduct(2), rules: [{ id: "digits", kind: "regex", source: "[0-9]{4,8}" }] },
        { id: "sound", action: review, rules: [{ id: "sound-alike", kind: "reading", text: "jiayi" }] },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("refuses a reading rule in a group that blocks or deducts", () => {
    const issues = issuesOf({
      version: "v1",
      groups: [
        { id: "explicit", action: block, rules: [{ id: "sound-block", kind: "reading", text: "jiayi" }] },
        { id: "soft", action: deduct(1), rules: [{ id: "sound-deduct", kind: "reading", text: "jiayi" }] },
      ],
    });
    expect(issues).toEqual([
      { code: "READING_CANNOT_PENALIZE", ref: "sound-block" },
      { code: "READING_CANNOT_PENALIZE", ref: "sound-deduct" },
    ]);
  });

  it("refuses duplicate group and rule ids, invalid deductions and empty groups", () => {
    const issues = issuesOf({
      version: "v1",
      groups: [
        { id: "g", action: deduct(-1), rules: [{ id: "r1", kind: "exact", text: "a" }] },
        { id: "g", action: deduct(1.5), rules: [{ id: "r1", kind: "exact", text: "b" }] },
        { id: "empty", action: block, rules: [] },
      ],
    });
    expect(issues).toEqual([
      { code: "DEDUCTION_INVALID", ref: "g" },
      { code: "GROUP_ID_DUPLICATE", ref: "g" },
      { code: "DEDUCTION_INVALID", ref: "g" },
      { code: "RULE_ID_DUPLICATE", ref: "r1" },
      { code: "GROUP_EMPTY", ref: "empty" },
    ]);
  });

  it("reports a rejected regex by its reason code and never echoes the pattern", () => {
    const issues = issuesOf({
      version: "v1",
      groups: [{ id: "g", action: block, rules: [{ id: "nested", kind: "regex", source: "(a+)+" }] }],
    });
    expect(issues).toEqual([{ code: "REGEX_QUANTIFIED_GROUP", ref: "nested" }]);
    expect(JSON.stringify(issues)).not.toContain("(a+)+");
  });

  it("refuses an empty rule set, an uppercase reading pattern and an empty normalized pattern", () => {
    expect(issuesOf({ version: "v1", groups: [] })).toEqual([{ code: "NO_GROUPS", ref: "rule-set" }]);
    expect(
      issuesOf({
        version: "v1",
        groups: [
          {
            id: "g",
            action: review,
            rules: [
              { id: "upper", kind: "reading", text: "Jiayi" },
              { id: "zero-width", kind: "normalized", text: "\u200B" },
            ],
          },
        ],
      }),
    ).toEqual([
      { code: "READING_PATTERN_INVALID", ref: "upper" },
      { code: "PATTERN_EMPTY", ref: "zero-width" },
    ]);
  });
});

describe("verdict routing", () => {
  it("passes a message with no hit and no review reason", () => {
    expect(decideVerdict([], [])).toEqual({
      route: "PASS",
      reasons: [],
      hits: [],
      hitCount: 0,
      deductionsApplied: 0,
      appliedDeduction: null,
    });
  });

  it("lets a block hit win over review hits and review reasons", () => {
    const verdict = decideVerdict([hit(deduct(5), "soft"), hit(block, "explicit")], ["RULE_BUDGET_EXCEEDED"]);
    expect(verdict.route).toBe("BLOCK");
  });

  it("applies only the largest deduction, once, and records hit count apart from it", () => {
    const verdict = decideVerdict([hit(deduct(2), "g1"), hit(deduct(5), "g2"), hit(deduct(3), "g3"), hit(review, "g4")], []);
    expect(verdict.route).toBe("REVIEW");
    expect(verdict.hitCount).toBe(4);
    expect(verdict.deductionsApplied).toBe(1);
    expect(verdict.appliedDeduction).toEqual({ groupId: "g2", value: 5 });
  });

  it("routes to review when a review reason exists even without hits", () => {
    expect(decideVerdict([], ["NICKNAME_UNAVAILABLE"]).route).toBe("REVIEW");
  });
});
