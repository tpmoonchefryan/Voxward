import { type ChannelEvent, CONTRACT_VERSION } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createChannelModerationCache } from "../../../src/modules/moderation-engine/channel-cache.js";
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

describe("composed combining marks through the checker (S006 Q6)", () => {
  const stripRules: RuleSetInput = {
    version: "v2",
    groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "norm-badword", kind: "normalized", text: "badword" }] }],
  };

  it("blocks a composed mark that hides a rule, under the default option", async () => {
    const verdict = await evaluateMessage(input("Viewer", "ba\u0301dword"), environment(compiled(stripRules)));
    expect(verdict.route).toBe("BLOCK");
  });

  it("matches a pattern written with a composed letter against the stripped text", async () => {
    const pattern: RuleSetInput = {
      version: "v2",
      groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "norm-accented", kind: "normalized", text: "b\u00e1dword" }] }],
    };
    const verdict = await evaluateMessage(input("Viewer", "badword"), environment(compiled(pattern)));
    expect(verdict.route).toBe("BLOCK");
  });

  it("lets the same text through when the rule set turns stripping off", async () => {
    const off = compiled({ ...stripRules, normalization: { stripCombiningMarks: false } });
    const verdict = await evaluateMessage(input("Viewer", "ba\u0301dword"), environment(off));
    expect(verdict.route).toBe("PASS");
  });
});

describe("kana and accented letters through the checker (S006 B1, E20 §3)", () => {
  const normalizedSet = compiled({
    version: "v3",
    groups: [
      {
        id: "explicit",
        action: { kind: "BLOCK" },
        rules: [
          { id: "norm-baka", kind: "normalized", text: "ばか" },
          { id: "norm-baka-katakana", kind: "normalized", text: "バカ" },
          { id: "norm-badword", kind: "normalized", text: "badword" },
        ],
      },
    ],
  });

  const regexSet = compiled({
    version: "v3",
    groups: [
      {
        id: "explicit",
        action: { kind: "BLOCK" },
        rules: [
          { id: "re-baka", kind: "regex", source: "ばか" },
          { id: "re-baka-katakana", kind: "regex", source: "バカ" },
          { id: "re-cafe", kind: "regex", source: "café" },
        ],
      },
    ],
  });

  it("does not block a normalized kana rule on the homophone with the other voicing", async () => {
    const verdict = await evaluateMessage(input("Viewer", "はかまいりにいく"), environment(normalizedSet));
    expect(verdict.route).toBe("PASS");
  });

  it("does not block a normalized katakana rule on its unvoiced homophone", async () => {
    const verdict = await evaluateMessage(input("Viewer", "ハカセ"), environment(normalizedSet));
    expect(verdict.route).toBe("PASS");
  });

  it("still blocks a normalized kana rule on the same kana", async () => {
    const verdict = await evaluateMessage(input("Viewer", "ばか"), environment(normalizedSet));
    expect(verdict.route).toBe("BLOCK");
  });

  it("blocks a kana regex on the original text", async () => {
    expect((await evaluateMessage(input("Viewer", "ばか"), environment(regexSet))).route).toBe("BLOCK");
    expect((await evaluateMessage(input("Viewer", "バカ"), environment(regexSet))).route).toBe("BLOCK");
  });

  it("does not block a kana regex on the other voicing", async () => {
    const verdict = await evaluateMessage(input("Viewer", "はかまいりにいく"), environment(regexSet));
    expect(verdict.route).toBe("PASS");
  });

  it("blocks an accented regex on the original text, and on the decomposed form of the same text", async () => {
    expect((await evaluateMessage(input("Viewer", "café"), environment(regexSet))).route).toBe("BLOCK");
    expect((await evaluateMessage(input("Viewer", "cafe\u0301"), environment(regexSet))).route).toBe("BLOCK");
  });

  it("still blocks a normalized rule hidden behind a composed mark", async () => {
    const verdict = await evaluateMessage(input("Viewer", "ba\u0301dword"), environment(normalizedSet));
    expect(verdict.route).toBe("BLOCK");
  });
});

describe("whole-field exact matching, whitelist suppression, and channel cache (PR A)", () => {
  it("treats wholeField exact as whole-message match while substring exact still matches substrings", async () => {
    const wholeRule = compiled({
      version: "v1",
      groups: [{ id: "g-exact", action: { kind: "REVIEW" }, rules: [{ id: "e1", kind: "exact", text: "spam", wholeField: true }] }],
    });
    expect((await evaluateMessage(input("Viewer", "  spam  "), environment(wholeRule))).route).toBe("REVIEW");
    expect((await evaluateMessage(input("Viewer", "anti-spam message"), environment(wholeRule))).route).toBe("PASS");

    const containsRule = compiled({
      version: "v1",
      groups: [{ id: "g-contains", action: { kind: "REVIEW" }, rules: [{ id: "c1", kind: "exact", text: "spam" }] }],
    });
    expect((await evaluateMessage(input("Viewer", "anti-spam message"), environment(containsRule))).route).toBe("REVIEW");
  });

  it("suppresses non-BLOCK body hits covered by whitelist while never suppressing BLOCK hits", async () => {
    const ruleSet = compiled({
      version: "v1",
      groups: [
        { id: "soft", action: { kind: "REVIEW" }, rules: [{ id: "c-soft", kind: "exact", text: "grass" }] },
        { id: "hard", action: { kind: "BLOCK" }, rules: [{ id: "c-hard", kind: "exact", text: "slur" }] },
      ],
      whitelist: [
        { id: "w-1", kind: "exact", text: "lemongrass" },
        { id: "w-2", kind: "exact", text: "safe slur quote" },
      ],
    });
    const covered = await evaluateMessage(input("Viewer", "drinking lemongrass tea"), environment(ruleSet));
    expect(covered.route).toBe("PASS");
    expect(covered.whitelistMatches ?? []).toHaveLength(1);
    expect(covered.whitelistMatches?.[0]?.ruleId).toBe("w-1");

    const blocked = await evaluateMessage(input("Viewer", "safe slur quote"), environment(ruleSet));
    expect(blocked.route).toBe("BLOCK");
    expect(blocked.hits.some((h) => h.ruleId === "c-hard")).toBe(true);
  });

  it("caches ModerationChecker per (channelId, version) and recompiles on version bump", async () => {
    let version = 1;
    let term = "alpha";
    let loads = 0;
    const cache = createChannelModerationCache({
      nicknames: { displayNicknameOf: async () => "Viewer" },
      loadRuleSet: () => {
        loads += 1;
        return {
          version,
          ruleSet: {
            version: `v${version}`,
            groups: [{ id: "g1", action: { kind: "BLOCK" }, rules: [{ id: "r1", kind: "exact", text: term }] }],
          },
        };
      },
    });

    const event = (body: string): ChannelEvent => ({
      contractVersion: CONTRACT_VERSION,
      channelId: "ch-1",
      platform: "youtube",
      platformMessageId: `pm-${loads}`,
      platformOrder: loads,
      receivedAt: "2026-11-25T00:00:00.000Z",
      correlationId: `corr-${loads}`,
      body,
      sender: { contractVersion: CONTRACT_VERSION, senderRef: "s-1" },
    });

    expect((await cache.moderate(event("alpha"))).route).toBe("BLOCK");
    expect(cache.size()).toBe(1);
    expect((await cache.moderate(event("beta"))).route).toBe("PASS");

    version = 2;
    term = "beta";
    expect((await cache.moderate(event("beta"))).route).toBe("BLOCK");
    expect((await cache.moderate(event("alpha"))).route).toBe("PASS");
  });
});

describe("language-scoped rules and READING_UNAVAILABLE scoping (PR C)", () => {
  it("skips rules with disjoint language tags while matching matching/mixed/und rules", async () => {
    const ruleSet = compiled({
      version: "v1",
      groups: [
        {
          id: "lang-scoped",
          action: { kind: "BLOCK" },
          rules: [
            { id: "r-fr", kind: "exact", text: "alerte", language: "fr" },
            { id: "r-hant", kind: "exact", text: "測試詞", language: "zh-Hant" },
            { id: "r-any", kind: "exact", text: "globalban", language: "und" },
          ],
        },
      ],
    });

    // Korean message does not trigger zh-Hant rule; explicit pt-BR triggers r-any ("und")
    expect((await evaluateMessage({ subject, nickname: "Viewer", body: "測試詞", language: "zh-Hans" }, environment(ruleSet))).route).toBe("PASS");
    expect((await evaluateMessage({ subject, nickname: "Viewer", body: "測試詞", language: "zh-Hant" }, environment(ruleSet))).route).toBe("BLOCK");
    expect((await evaluateMessage({ subject, nickname: "Viewer", body: "alerte", language: "fr" }, environment(ruleSet))).route).toBe("BLOCK");
    expect((await evaluateMessage({ subject, nickname: "Viewer", body: "alerte", language: "ja" }, environment(ruleSet))).route).toBe("PASS");
    expect((await evaluateMessage({ subject, nickname: "Viewer", body: "globalban", language: "pt-BR" }, environment(ruleSet))).route).toBe("BLOCK");
  });

  it("emits READING_UNAVAILABLE only when an applicable reading rule exists and transliterator has no table", async () => {
    const readingRules = compiled({
      version: "v1",
      groups: [
        {
          id: "r",
          action: { kind: "REVIEW" },
          rules: [{ id: "r-zh", kind: "reading", text: "jinci", language: "zh-Hans" }],
        },
      ],
    });
    const noTable = environment(readingRules);
    const zhUnreadable = await evaluateMessage(input("Viewer", "进词"), noTable);
    expect(zhUnreadable.reasons).toContain("READING_UNAVAILABLE");

    // Different language: reading rule is not applicable -> no READING_UNAVAILABLE
    const jaMessage = await evaluateMessage(input("Viewer", "こんにちは"), noTable);
    expect(jaMessage.reasons).not.toContain("READING_UNAVAILABLE");

    // With partial table present (like bench): transliterator.available is true -> no READING_UNAVAILABLE
    const withTable = environment(readingRules, {
      transliterator: createTableTransliterator(new Map([["词", "ci"]])),
    });
    const partialMsg = await evaluateMessage(input("Viewer", "进词"), withTable);
    expect(partialMsg.reasons).not.toContain("READING_UNAVAILABLE");
  });
});
