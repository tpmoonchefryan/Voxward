import { describe, expect, it } from "vitest";
import {
  type CheckEnvironment,
  DEFAULT_LIMITS,
  evaluateMessage,
  type MessageInput,
} from "../../../src/modules/moderation-engine/rules/engine.js";
import { type CompiledRuleSet, compileRuleSet, type RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";
import { createTableTransliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";

const subject = { channelId: "channel-1", senderRef: "sender-1" };

function compiled(input: RuleSetInput): CompiledRuleSet {
  const result = compileRuleSet(input);
  if (!result.ok) throw new Error(`rule set refused: ${result.issues.map((issue) => issue.code).join(", ")}`);
  return result.ruleSet;
}

function environment(ruleSet: CompiledRuleSet | null, overrides: Partial<CheckEnvironment> = {}): CheckEnvironment {
  return {
    ruleSet,
    transliterator: createTableTransliterator(new Map()),
    limits: DEFAULT_LIMITS,
    now: () => 0,
    ...overrides,
  };
}

/** A clock that returns the scripted values in order, then keeps returning the last one. */
function scriptedClock(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;
    index += 1;
    return value;
  };
}

function input(nickname: string | null, body: string): MessageInput {
  return { subject, nickname, body };
}

const moderation = compiled({
  version: "v1",
  groups: [
    {
      id: "explicit",
      action: { kind: "BLOCK" },
      rules: [
        { id: "exact-badword", kind: "exact", text: "badword" },
        { id: "norm-wwww", kind: "normalized", text: "wwww" },
        { id: "combo-yz", kind: "normalized", text: "yz" },
      ],
    },
    { id: "soft", action: { kind: "DEDUCT", deduction: 3 }, rules: [{ id: "phone-digits", kind: "regex", source: "[0-9]{4,8}" }] },
    { id: "sound", action: { kind: "REVIEW" }, rules: [{ id: "sound-jiayi", kind: "reading", text: "jiayi" }] },
  ],
});

describe("message checks against the rule set", () => {
  it("routes an exact match to BLOCK and maps its span onto the original body", async () => {
    const verdict = await evaluateMessage(input("Viewer", "say badword now"), environment(moderation));
    expect(verdict.route).toBe("BLOCK");
    expect(verdict.ruleVersion).toBe("v1");
    const exact = verdict.hits.find((hit) => hit.ruleId === "exact-badword");
    expect(exact?.spans).toEqual([{ field: "body", start: 4, end: 11 }]);
  });

  it("still checks noise such as fullwidth letters with zero-width characters", async () => {
    const verdict = await evaluateMessage(input("Viewer", "ｗｗ\u200Bｗｗ!!"), environment(moderation));
    expect(verdict.route).toBe("BLOCK");
    expect(verdict.hits.find((hit) => hit.ruleId === "norm-wwww")?.spans).toEqual([{ field: "body", start: 0, end: 5 }]);
  });

  it("routes a homophone match to review only and never applies a deduction for it", async () => {
    const transliterator = createTableTransliterator(
      new Map([
        ["甲", "jia"],
        ["乙", "yi"],
      ]),
    );
    const verdict = await evaluateMessage(input("Viewer", "甲乙"), environment(moderation, { transliterator }));
    expect(verdict.route).toBe("REVIEW");
    expect(verdict.hitCount).toBe(1);
    expect(verdict.deductionsApplied).toBe(0);
    expect(verdict.hits.map((hit) => hit.action.kind)).toEqual(["REVIEW"]);
  });

  it("routes a deduction hit to review and records the applied deduction", async () => {
    const verdict = await evaluateMessage(input("Viewer", "call 12345678 now"), environment(moderation));
    expect(verdict.route).toBe("REVIEW");
    expect(verdict.deductionsApplied).toBe(1);
    expect(verdict.appliedDeduction).toEqual({ groupId: "soft", value: 3 });
  });

  it("finds a match that crosses from the nickname into the body once, in the combined scope", async () => {
    const verdict = await evaluateMessage(input("xy", "z"), environment(moderation));
    expect(verdict.route).toBe("BLOCK");
    expect(verdict.hits.map((hit) => hit.scope)).toEqual(["combined"]);
    expect(verdict.hits[0]?.spans).toEqual([
      { field: "nickname", start: 1, end: 2 },
      { field: "body", start: 0, end: 1 },
    ]);
  });

  it("counts a match inside the nickname once, not again in the combined scope", async () => {
    const verdict = await evaluateMessage(input("yz", "q"), environment(moderation));
    expect(verdict.hitCount).toBe(1);
    expect(verdict.hits.map((hit) => hit.scope)).toEqual(["nickname"]);
  });

  it("passes a clean message that has a nickname", async () => {
    const verdict = await evaluateMessage(input("Viewer", "hello there"), environment(moderation));
    expect(verdict).toMatchObject({ route: "PASS", hitCount: 0, reasons: [], ruleVersion: "v1" });
  });
});

describe("messages that cannot be fully checked", () => {
  it("routes a message without a nickname to review even when its body is clean", async () => {
    const verdict = await evaluateMessage(input(null, "hello"), environment(moderation));
    expect(verdict.route).toBe("REVIEW");
    expect(verdict.reasons).toEqual(["NICKNAME_UNAVAILABLE"]);
  });

  it("treats a blank nickname as missing, so it cannot pass as a checked nickname", async () => {
    const verdict = await evaluateMessage(input("   ", "hello"), environment(moderation));
    expect(verdict).toMatchObject({ route: "REVIEW", reasons: ["NICKNAME_UNAVAILABLE"] });
  });

  it("still lets a body block through when the nickname is missing", async () => {
    const verdict = await evaluateMessage(input(null, "badword"), environment(moderation));
    expect(verdict.route).toBe("BLOCK");
  });

  it("routes a body over the length limit to review without running any rule", async () => {
    const verdict = await evaluateMessage(input("Viewer", `badword${"a".repeat(500)}`), environment(moderation));
    expect(verdict).toMatchObject({ route: "REVIEW", hits: [], reasons: ["INPUT_TOO_LONG"] });
  });

  it("routes a nickname over the length limit to review", async () => {
    const verdict = await evaluateMessage(input("n".repeat(101), "hello"), environment(moderation));
    expect(verdict).toMatchObject({ route: "REVIEW", reasons: ["INPUT_TOO_LONG"] });
  });

  it("routes text that normalizes past the limit to review", async () => {
    const verdict = await evaluateMessage(input("Viewer", "㍿".repeat(300)), environment(moderation));
    expect(verdict).toMatchObject({ route: "REVIEW", reasons: ["NORMALIZED_TOO_LONG"], hits: [] });
  });

  it("keeps a block found before the budget ran out and routes the rest to review", async () => {
    const verdict = await evaluateMessage(
      input("Viewer", "badword"),
      environment(moderation, { now: scriptedClock([0, 0, 1000]) }),
    );
    expect(verdict.route).toBe("BLOCK");
    expect(verdict.reasons).toEqual(["RULE_BUDGET_EXCEEDED"]);
    expect(verdict.hits.map((hit) => hit.ruleId)).toEqual(["exact-badword"]);
  });

  it("routes a message to review when the budget runs out before any hit", async () => {
    const verdict = await evaluateMessage(input("Viewer", "hello"), environment(moderation, { now: scriptedClock([0, 1000]) }));
    expect(verdict).toMatchObject({ route: "REVIEW", reasons: ["RULE_BUDGET_EXCEEDED"], hits: [] });
  });

  it("flags an overrun by the last rule, so a slow final match cannot pass as complete", async () => {
    const single = compiled({
      version: "v1",
      groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "exact-badword", kind: "exact", text: "badword" }] }],
    });
    const verdict = await evaluateMessage(input(null, "hello"), environment(single, { now: scriptedClock([0, 0, 25]) }));
    expect(verdict.reasons).toContain("RULE_BUDGET_EXCEEDED");
  });

  it("routes every message to review when no rule set is published", async () => {
    const verdict = await evaluateMessage(input("Viewer", "badword"), environment(null));
    expect(verdict).toMatchObject({ route: "REVIEW", reasons: ["NO_RULE_SET"], ruleVersion: null });
  });
});
