import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createModerationChecker } from "../../../src/modules/moderation-engine/index.js";
import type { GroupAction, RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";
import {
  COMPOSED_NORMALIZE_OPTIONS,
  type NormalizeOptions,
  normalizeField,
  normalizeText,
} from "../../../src/modules/moderation-engine/rules/normalize.js";
import { createTableTransliterator, type Transliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";
import {
  ALL_RULE_CASES,
  BAKA_HALFWIDTH,
  BUSU_HALFWIDTH,
  type CaseRule,
  DEBU_HALFWIDTH,
  describeRule,
  E20_SECTION_2_KANA,
  E21_ROWS,
  EXTRA_CASES,
  expectedSpans,
  HAGE_HALFWIDTH,
  HW_DAKUTEN,
  HW_HANDAKUTEN,
  normalized,
  PONKOTSU_HALFWIDTH,
  regex,
  show,
  SPACING_DAKUTEN,
  WORDS,
  writingsOf,
} from "./sound-mark-cases.js";

/**
 * S006 B3: the matching copy keeps the voiced and semi-voiced sound marks of Japanese kana when they are written as
 * half-width marks, as spacing marks, or with a format character in between (acceptance E20 and E21). Every check goes
 * through the real checker, so the rule compiler, the three matching copies and the span mapping all take part.
 */

const NICKNAME = "Viewer";

let counter = 0;
function eventWithBody(body: string): ChannelEvent {
  counter += 1;
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "channel-1",
    platformMessageId: `message-${counter}`,
    platformOrder: counter,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: `correlation-${counter}`,
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "sender-1" },
  };
}

interface CheckOptions {
  readonly action?: GroupAction;
  readonly nickname?: string;
  readonly normalization?: Partial<NormalizeOptions>;
  readonly transliterator?: Transliterator;
}

function ruleSetOf(rule: CaseRule, options: CheckOptions): RuleSetInput {
  const input =
    rule.kind === "regex"
      ? ({ id: "r1", kind: "regex", source: rule.source } as const)
      : ({ id: "r1", kind: rule.kind, text: rule.text } as const);
  return {
    version: "v1",
    groups: [{ id: "g1", action: options.action ?? { kind: "BLOCK" }, rules: [input] }],
    ...(options.normalization === undefined ? {} : { normalization: options.normalization }),
  };
}

function check(rule: CaseRule, body: string, options: CheckOptions = {}) {
  const checker = createModerationChecker({
    ruleSet: ruleSetOf(rule, options),
    nicknames: { displayNicknameOf: () => Promise.resolve(options.nickname ?? NICKNAME) },
    ...(options.transliterator === undefined ? {} : { transliterator: options.transliterator }),
    now: () => 0,
  });
  return checker.check(eventWithBody(body));
}

function bodySpans(spans: ReadonlyArray<readonly [number, number]>) {
  return spans.map(([start, end]) => [{ field: "body", start, end }]);
}

describe("fixtures", () => {
  it("write the half-width forms with the code points of the acceptance inputs", () => {
    const codePoints = (text: string) => [...text].map((char) => char.codePointAt(0));
    expect(codePoints(BAKA_HALFWIDTH)).toEqual([0xff8a, 0xff9e, 0xff76]);
    expect(codePoints(BUSU_HALFWIDTH)).toEqual([0xff8c, 0xff9e, 0xff7d]);
    expect(codePoints(DEBU_HALFWIDTH)).toEqual([0xff83, 0xff9e, 0xff8c, 0xff9e]);
    expect(codePoints(HAGE_HALFWIDTH)).toEqual([0xff8a, 0xff79, 0xff9e]);
    expect(codePoints(PONKOTSU_HALFWIDTH)).toEqual([0xff8e, 0xff9f, 0xff9d, 0xff7a, 0xff82]);
  });

  it("read as the full-width words under whole-string NFKC, which is what the matching copy must equal", () => {
    expect(WORDS.map((entry) => entry.halfwidth.normalize("NFKC"))).toEqual(WORDS.map((entry) => entry.word));
  });
});

describe.each(ALL_RULE_CASES)("rule cases: $group", ({ cases }) => {
  it.each(cases.map((testCase) => [`${testCase.id} ${describeRule(testCase.rule)} against ${show(testCase.body)}`, testCase] as const))(
    "%s",
    async (_title, testCase) => {
      const spans = expectedSpans(testCase);
      const verdict = await check(testCase.rule, testCase.body);
      expect(verdict.route).toBe(spans.length === 0 ? "PASS" : "BLOCK");
      expect(verdict.hits.map((hit) => hit.spans)).toEqual(bodySpans(spans));
    },
  );
});

describe.each(WORDS)("$word in every writing (acceptance E20, E21)", ({ word, halfwidth, unvoiced }) => {
  const writings = writingsOf(word, halfwidth);
  const titled = writings.map((writing) => [`${writing.name}: ${show(writing.text)}`, writing.text] as const);

  it.each(titled)("a normalized rule hits %s and reports the span of the whole writing", async (_name, text) => {
    const verdict = await check(normalized(word), `x ${text} y`);
    expect(verdict.route).toBe("BLOCK");
    expect(verdict.hits.map((hit) => hit.spans)).toEqual(bodySpans([[2, 2 + text.length]]));
  });

  it.each(titled)("a regex rule hits %s and reports the span of the whole writing", async (_name, text) => {
    const verdict = await check(regex(word), `x ${text} y`);
    expect(verdict.route).toBe("BLOCK");
    expect(verdict.hits.map((hit) => hit.spans)).toEqual(bodySpans([[2, 2 + text.length]]));
  });

  it.each(titled)(`the rule for ${unvoiced} (no sound mark) does not hit %s`, async (_name, text) => {
    expect((await check(normalized(unvoiced), `x ${text} y`)).hits).toEqual([]);
    expect((await check(regex(unvoiced), `x ${text} y`)).hits).toEqual([]);
  });

  it(`the rule for ${word} does not hit the word without sound marks`, async () => {
    expect((await check(normalized(word), `x ${unvoiced} y`)).hits).toEqual([]);
    expect((await check(regex(word), `x ${unvoiced} y`)).hits).toEqual([]);
  });
});

describe("a rule set that switches mark stripping off sees the same kana", () => {
  const withoutVietnamese = EXTRA_CASES.filter((testCase) => !["X-31", "X-32", "X-33", "X-34"].includes(testCase.id));
  const cases = [...E21_ROWS, ...E20_SECTION_2_KANA, ...withoutVietnamese];

  it.each(cases.map((testCase) => [`${testCase.id} ${describeRule(testCase.rule)} against ${show(testCase.body)}`, testCase] as const))(
    "%s",
    async (_title, testCase) => {
      const spans = expectedSpans(testCase);
      const verdict = await check(testCase.rule, testCase.body, { normalization: { stripCombiningMarks: false } });
      expect(verdict.route).toBe(spans.length === 0 ? "PASS" : "BLOCK");
      expect(verdict.hits.map((hit) => hit.spans)).toEqual(bodySpans(spans));
    },
  );
});

describe("fields stay apart", () => {
  it("reports a hit in the nickname with a nickname span", async () => {
    const verdict = await check(normalized("バカ"), "hello", { nickname: BAKA_HALFWIDTH });
    expect(verdict.route).toBe("BLOCK");
    expect(verdict.hits.map((hit) => [hit.scope, hit.spans])).toEqual([
      ["nickname", [{ field: "nickname", start: 0, end: 3 }]],
    ]);
  });

  it("does not let a sound mark at the start of the body voice the last kana of the nickname", async () => {
    const body = `${HW_DAKUTEN}ｶ`;
    const voiced = await check(normalized("バカ"), body, { nickname: "ﾊ" });
    expect(voiced.route).toBe("PASS");
    const unvoiced = await check(normalized("ハカ"), body, { nickname: "ﾊ" });
    expect(unvoiced.hits.map((hit) => [hit.scope, hit.spans])).toEqual([
      [
        "combined",
        [
          { field: "nickname", start: 0, end: 1 },
          { field: "body", start: 0, end: 2 },
        ],
      ],
    ]);
  });

  it("finds a half-width word that starts in the nickname and ends in the body", async () => {
    const verdict = await check(normalized("バカ"), "ｶ", { nickname: `ﾊ${HW_DAKUTEN}` });
    expect(verdict.hits.map((hit) => [hit.scope, hit.spans])).toEqual([
      [
        "combined",
        [
          { field: "nickname", start: 0, end: 2 },
          { field: "body", start: 0, end: 1 },
        ],
      ],
    ]);
  });
});

describe("a deduction rule on the unvoiced word (acceptance E21)", () => {
  const deduct: GroupAction = { kind: "DEDUCT", deduction: 5 };

  it.each([
    ["full-width ガス", "ガス代が高い"],
    ["half-width ｶﾞｽ", `ｶ${HW_DAKUTEN}ｽ代が高い`],
    ["half-width ｶ + ZWSP + ﾞ + ｽ", `ｶ\u200B${HW_DAKUTEN}ｽ代が高い`],
  ])("does not take points for %s", async (_name, body) => {
    const verdict = await check(normalized("カス"), body, { action: deduct });
    expect(verdict).toMatchObject({ route: "PASS", hits: [], appliedDeduction: null, deductionsApplied: 0 });
  });

  it.each([
    ["full-width カスタード", "カスタード", [0, 2]],
    ["half-width ｶｽﾀｰﾄﾞ", `ｶｽﾀｰﾄ${HW_DAKUTEN}`, [0, 2]],
  ] as const)("still takes the points for %s", async (_name, body, span) => {
    const verdict = await check(normalized("カス"), body, { action: deduct });
    expect(verdict.route).toBe("REVIEW");
    expect(verdict.appliedDeduction).toEqual({ groupId: "g1", value: 5 });
    expect(verdict.hits.map((hit) => hit.spans)).toEqual(bodySpans([span]));
  });
});

describe("reading of voiced kana (acceptance E21)", () => {
  const table = new Map([
    ["ガ", "ga"],
    ["カ", "ka"],
  ]);

  it("reads ｶﾞｶ as gaka, the same as ガカ", () => {
    const transliterator = createTableTransliterator(table);
    const half = transliterator.transliterate("body", `ｶ${HW_DAKUTEN}ｶ`);
    const full = transliterator.transliterate("body", "ガカ");
    expect(half.mapped.text).toBe("gaka");
    expect(half.complete).toBe(true);
    expect(full.mapped.text).toBe("gaka");
    expect(half.mapped.units.map((unit) => [unit.srcStart, unit.srcEnd])).toEqual([
      [0, 2],
      [2, 3],
    ]);
  });

  it("matches a reading rule on every writing of ガカ and on none of カカ", async () => {
    const transliterator = createTableTransliterator(table);
    const readingRule: RuleSetInput = {
      version: "v1",
      groups: [{ id: "sound", action: { kind: "REVIEW" }, rules: [{ id: "rd", kind: "reading", text: "gaka" }] }],
    };
    const checker = createModerationChecker({
      ruleSet: readingRule,
      transliterator,
      nicknames: { displayNicknameOf: () => Promise.resolve(NICKNAME) },
      now: () => 0,
    });
    const writings = [
      `ｶ${HW_DAKUTEN}ｶ`,
      `カ${HW_DAKUTEN}カ`,
      `カ${SPACING_DAKUTEN}カ`,
      `カ\u200B\u3099カ`,
      `ｶ\u2060${HW_DAKUTEN}ｶ`,
      "ガカ",
      "カ\u3099カ",
    ];
    for (const text of writings) {
      const verdict = await checker.check(eventWithBody(text));
      expect(verdict.hits.map((hit) => hit.spans), show(text)).toEqual(bodySpans([[0, text.length]]));
    }
    for (const text of ["カカ", "ｶｶ", "カ\u200Bカ"]) {
      expect((await checker.check(eventWithBody(text))).hits, show(text)).toEqual([]);
    }
  });

  it("does not read ｶﾞ through the entry of カ alone, and marks the reading incomplete", () => {
    const reading = createTableTransliterator(new Map([["カ", "ka"]])).transliterate("body", `ｶ${HW_DAKUTEN}`);
    expect(reading.mapped.text).toBe("");
    expect(reading.complete).toBe(false);
  });
});

describe("one normalization for the normalized rules, the regex rules and the readings", () => {
  const kanaTexts = WORDS.flatMap(({ word, halfwidth }) => writingsOf(word, halfwidth).map((writing) => writing.text));
  const mixed = [
    `${HW_DAKUTEN}${BAKA_HALFWIDTH}`,
    `${BAKA_HALFWIDTH}\u200B`,
    `\u200B${BAKA_HALFWIDTH}`,
    `ﾊ${HW_HANDAKUTEN}${HW_DAKUTEN}ｶ`,
    `ハ\u200B\u3099\u200B\u309Aカ`,
  ];

  it.each([...kanaTexts, ...mixed].map((text) => [show(text), text] as const))(
    "%s: the three paths split the text at the same places and read the same normalized text",
    (_title, text) => {
      const forNormalizedRules = normalizeField("body", text);
      const forRegexRules = normalizeField("body", text, COMPOSED_NORMALIZE_OPTIONS);
      expect(forRegexRules).toEqual(forNormalizedRules);
      expect(normalizeText(text)).toBe(forNormalizedRules.text);

      const unitTexts = forNormalizedRules.units.map((unit) => forNormalizedRules.text.slice(unit.start, unit.end));
      const readings = new Map<string, string>();
      for (const unitText of unitTexts) {
        if (unitText !== "" && !readings.has(unitText)) readings.set(unitText, `k${readings.size}`);
      }
      const reading = createTableTransliterator(readings).transliterate("body", text);
      expect(reading.complete).toBe(true);
      expect(reading.mapped.units.map((unit) => [unit.srcStart, unit.srcEnd])).toEqual(
        forNormalizedRules.units.map((unit) => [unit.srcStart, unit.srcEnd]),
      );
      expect(reading.mapped.text).toBe(unitTexts.map((unitText) => readings.get(unitText) ?? "").join(""));
    },
  );
});
