import { describe, expect, it } from "vitest";
import {
  compileRuleSet,
  decideVerdict,
  type GroupAction,
  ModerationConfigError,
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

describe("regex rejection hints (S006 Q12)", () => {
  it("names the top-level rewrite for a grouped alternation, and never echoes the pattern", () => {
    const issues = issuesOf({
      version: "v1",
      groups: [{ id: "g", action: block, rules: [{ id: "alt", kind: "regex", source: "(ab|cd)e" }] }],
    });
    expect(issues).toEqual([
      {
        code: "REGEX_GROUP_ALTERNATION",
        ref: "alt",
        hint: "write the alternatives as top-level branches, such as a|b, or split them into several rules",
      },
    ]);
    expect(JSON.stringify(issues)).not.toContain("(ab|cd)e");
  });

  it("gives a split-or-fix hint for an unbounded quantifier combined with a variable one", () => {
    const issues = issuesOf({
      version: "v1",
      groups: [{ id: "g", action: block, rules: [{ id: "mixed", kind: "regex", source: "a+b?c" }] }],
    });
    expect(issues).toEqual([
      {
        code: "REGEX_UNBOUNDED_WITH_VARIABLE_REPEAT",
        ref: "mixed",
        hint: "split the pattern into several rules, or give one of the quantifiers a fixed count",
      },
    ]);
  });

  it("puts the hint into the thrown configuration error, next to the code and the rule id", () => {
    const result = compileRuleSet({
      version: "v1",
      groups: [{ id: "g", action: block, rules: [{ id: "alt", kind: "regex", source: "(ab|cd)e" }] }],
    });
    if (result.ok) throw new Error("expected a refusal");
    const error = new ModerationConfigError(result.issues);
    expect(error.message).toContain("REGEX_GROUP_ALTERNATION at alt (hint: write the alternatives as top-level branches");
    expect(error.message).not.toContain("(ab|cd)e");
  });
});

describe("normalization options in a rule set (S006 Q6)", () => {
  it("defaults to stripping composed marks and records the value on the compiled set", () => {
    const result = compileRuleSet({ version: "v1", groups: [{ id: "g", action: block, rules: [{ id: "r", kind: "exact", text: "x" }] }] });
    if (!result.ok) throw new Error("rule set should compile");
    expect(result.ruleSet.normalization).toEqual({ stripCombiningMarks: true });
  });

  it("refuses a non-boolean value and an unknown key, naming only the code", () => {
    const base = { version: "v1", groups: [{ id: "g", action: block, rules: [{ id: "r", kind: "exact" as const, text: "x" }] }] };
    const notBoolean = issuesOf({ ...base, normalization: { stripCombiningMarks: "yes" as unknown as boolean } });
    const unknownKey = issuesOf({ ...base, normalization: { stripMarks: true } as unknown as { stripCombiningMarks: boolean } });
    expect(notBoolean).toEqual([{ code: "NORMALIZATION_INVALID", ref: "rule-set" }]);
    expect(unknownKey).toEqual([{ code: "NORMALIZATION_INVALID", ref: "rule-set" }]);
  });
});
