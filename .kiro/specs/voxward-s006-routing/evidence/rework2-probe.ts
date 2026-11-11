/**
 * S006 rework 2 (B3) before/after probe. It records what the checker, the reading port and the noise classifier
 * return for every input of the B3 regression, so the evidence can list the result and the span of each one.
 *
 * Usage: copy this file as `rework2-probe.test.ts` next to `sound-mark-cases.ts`
 * (apps/server/test/moderation-engine/rules/), then run, from apps/server,
 *   PROBE_OUT=<file.json> pnpm exec vitest run test/moderation-engine/rules/rework2-probe.test.ts
 * once on the code before the change (git show fe93a49:apps/server/src/modules/moderation-engine/rules/normalize.ts)
 * and once after it. Without PROBE_OUT the test does nothing. Remove the copy afterwards: it is evidence, not a test.
 */
import { writeFileSync } from "node:fs";
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { describe, it } from "vitest";
import { createModerationChecker } from "../../../src/modules/moderation-engine/index.js";
import type { GroupAction, RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";
import { COMPOSED_NORMALIZE_OPTIONS, normalizeField, normalizeText } from "../../../src/modules/moderation-engine/rules/normalize.js";
import { createTableTransliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";
import { classifyDeterministicNoise } from "../../../src/modules/moderation-engine/routing/classification.js";
import {
  ALL_RULE_CASES,
  BAKA_HALFWIDTH,
  type CaseRule,
  describeRule,
  HW_DAKUTEN,
  normalized,
  regex,
  show,
  SPACING_DAKUTEN,
  WORDS,
  writingsOf,
} from "./sound-mark-cases.js";

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

function ruleSetOf(rule: CaseRule, action: GroupAction): RuleSetInput {
  const input =
    rule.kind === "regex"
      ? ({ id: "r1", kind: "regex", source: rule.source } as const)
      : ({ id: "r1", kind: rule.kind, text: rule.text } as const);
  return { version: "v1", groups: [{ id: "g1", action, rules: [input] }] };
}

async function run(rule: CaseRule, body: string, action: GroupAction = { kind: "BLOCK" }) {
  const checker = createModerationChecker({
    ruleSet: ruleSetOf(rule, action),
    nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") },
    now: () => 0,
  });
  const verdict = await checker.check(eventWithBody(body));
  return {
    route: verdict.route,
    deduction: verdict.appliedDeduction?.value ?? 0,
    spans: verdict.hits.map((hit) => hit.spans.map((span) => [span.start, span.end])),
  };
}

describe("rework2 probe", () => {
  it("records the results", async () => {
    const out = process.env.PROBE_OUT;
    if (out === undefined) return;

    const cases: unknown[] = [];
    for (const { group, cases: rows } of ALL_RULE_CASES) {
      for (const row of rows) {
        cases.push({ group, id: row.id, rule: describeRule(row.rule), body: show(row.body), ...(await run(row.rule, row.body)) });
      }
    }

    const matrix: unknown[] = [];
    for (const { word, halfwidth, unvoiced } of WORDS) {
      for (const writing of writingsOf(word, halfwidth)) {
        const body = `x ${writing.text} y`;
        matrix.push({
          word,
          writing: writing.name,
          text: show(writing.text),
          normalized: await run(normalized(word), body),
          regex: await run(regex(word), body),
          unvoicedRule: await run(normalized(unvoiced), body),
        });
      }
    }

    const copyInputs: Array<[string, string, CaseRule]> = [
      ["half-width kana + half-width mark", BAKA_HALFWIDTH, normalized("バカ")],
      ["same, inside a sentence", `x ${BAKA_HALFWIDTH} y`, normalized("バカ")],
      ["kana + spacing mark U+309B", `ハ${SPACING_DAKUTEN}カ`, normalized("バカ")],
      ["kana + ZWSP + combining mark", "は\u200B\u3099か", normalized("ばか")],
      ["half-width kana + word joiner + half-width mark", `ﾊ\u2060${HW_DAKUTEN}ｶ`, normalized("バカ")],
      ["kana + variation selector + combining mark", "は\uFE0F\u3099か", normalized("ばか")],
      ["Latin + half-width mark", `ba${HW_DAKUTEN}dword`, normalized("badword")],
      ["Hangul jamo + ZWSP + jamo", "\u1107\u200B\u1161\u1107\u1169", normalized("바보")],
      ["astral character before the match", `\u{1F600}${BAKA_HALFWIDTH}`, normalized("バカ")],
      ["format character before the match", `あ\u200B${BAKA_HALFWIDTH}`, normalized("バカ")],
      ["format character after the match", `${BAKA_HALFWIDTH}\u200Bx`, normalized("バカ")],
      ["prolonged sound mark", `ﾊ${HW_DAKUTEN}ｰｶ`, normalized("バーカ")],
      ["mark at the start of the text", `${HW_DAKUTEN}ｶ`, normalized("カ")],
      ["Latin letter + ZWSP + acute, normalized rule", "ba\u200B\u0301dword", normalized("badword")],
      ["Latin letter + ZWSP + acute, regex rule", "caf" + "e\u200B\u0301", regex("caf\u00E9")],
    ];
    const copies = [] as unknown[];
    for (const [name, text, rule] of copyInputs) {
      copies.push({
        name,
        text: show(text),
        length: text.length,
        rule: describeRule(rule),
        ...(await run(rule, text)),
        normalCopy: show(normalizeText(text)),
        composedCopy: show(normalizeField("body", text, COMPOSED_NORMALIZE_OPTIONS).text),
        units: normalizeField("body", text).units.map((unit) => [unit.start, unit.end, unit.srcStart, unit.srcEnd]),
      });
    }

    const table = new Map([
      ["ガ", "ga"],
      ["カ", "ka"],
    ]);
    const transliterator = createTableTransliterator(table);
    const readings = ["ガカ", `ｶ${HW_DAKUTEN}ｶ`, `カ${SPACING_DAKUTEN}カ`, "カ\u200B\u3099カ"].map((text) => {
      const reading = transliterator.transliterate("body", text);
      return {
        text: show(text),
        reading: reading.mapped.text,
        complete: reading.complete,
        units: reading.mapped.units.map((unit) => [unit.start, unit.end, unit.srcStart, unit.srcEnd]),
      };
    });

    const deduct: GroupAction = { kind: "DEDUCT", deduction: 5 };
    const deductions = [] as unknown[];
    for (const body of ["ガス代が高い", `ｶ${HW_DAKUTEN}ｽ代が高い`, "カスタード", `ｶｽﾀｰﾄ${HW_DAKUTEN}`]) {
      deductions.push({ body: show(body), ...(await run(normalized("カス"), body, deduct)) });
    }

    const classes = [`ﾊ${HW_DAKUTEN}ﾊ${HW_DAKUTEN}ﾊ${HW_DAKUTEN}`, `ﾊ${HW_DAKUTEN}ﾊ\uFF9Fﾊ`, `ｶｶ${HW_DAKUTEN}ｶ`, `ハ${SPACING_DAKUTEN}ハ${SPACING_DAKUTEN}ハ${SPACING_DAKUTEN}`].map(
      (body) => ({ body: show(body), class: classifyDeterministicNoise(body) }),
    );

    writeFileSync(out, JSON.stringify({ cases, matrix, copies, readings, deductions, classes }, null, 1));
  });
});
