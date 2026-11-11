// Batch 5b acceptance probe for S006 B3 (third round). Usage: tsx probe-s006-b5b.mts <checkout> <work>
// Every case runs through the real checker (createModerationChecker) and asserts the route and the exact original
// span of each hit. Columns: f4808fb (S004 baseline), b1a1471 (rejected B3 candidate), candidate.
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";

const [C, W] = process.argv.slice(2);
if (!C || !W) throw new Error("usage: probe-s006-b5b.mts <checkout> <work>");
const MOD = "apps/server/src/modules/moderation-engine";
const cand = await import(`${C}/${MOD}/index.ts`);
const candNorm = await import(`${C}/${MOD}/rules/normalize.ts`);
const candTr = await import(`${C}/${MOD}/rules/transliterate.ts`);
const prev = await import(`${W}/old/b1a1471/${MOD}/index.ts`);
const base = await import(`${W}/old/f4808fb/${MOD}/index.ts`);

let checks = 0;
let failures = 0;
function expectEq(label: string, actual: unknown, expected: unknown): boolean {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
  return ok;
}
const show = (s: string) =>
  [...s]
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      return /[\p{M}\p{Cf}\p{Default_Ignorable_Code_Point}]/u.test(ch) || cp === 0x3164 || cp === 0xffa0
        ? `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`
        : ch;
    })
    .join("");

let counter = 0;
function eventWith(body: string): ChannelEvent {
  counter += 1;
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "channel-1",
    platformMessageId: `m-${counter}`,
    platformOrder: counter,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: `corr-${counter}`,
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "viewer-1" },
  };
}

type Rule = { id: string; kind: "exact" | "normalized" | "reading"; text: string } | { id: string; kind: "regex"; source: string };
const nm = (text: string): Rule => ({ id: "r", kind: "normalized", text });
const rx = (source: string): Rule => ({ id: "r", kind: "regex", source });
const rd = (text: string): Rule => ({ id: "r", kind: "reading", text });

interface Outcome {
  route: string;
  spans: string[];
  deduction: number;
}
async function run(
  mod: any,
  rule: Rule,
  body: string,
  opts: { action?: unknown; nickname?: string; table?: Map<string, string>; strip?: boolean } = {},
): Promise<Outcome | string> {
  try {
    const ruleSet: Record<string, unknown> = {
      version: "v1",
      groups: [{ id: "g", action: opts.action ?? { kind: "BLOCK" }, rules: [rule] }],
    };
    if (opts.strip === false) ruleSet.normalization = { stripCombiningMarks: false };
    const options: Record<string, unknown> = {
      ruleSet,
      nicknames: { displayNicknameOf: () => Promise.resolve(opts.nickname ?? "Viewer") },
      now: () => 0,
    };
    if (opts.table) {
      const tr = mod === cand ? candTr : await import(`${mod === prev ? `${W}/old/b1a1471` : `${W}/old/f4808fb`}/${MOD}/rules/transliterate.ts`);
      options.transliterator = tr.createTableTransliterator(opts.table, { stripCombiningMarks: opts.strip ?? true });
    }
    const checker = mod.createModerationChecker(options);
    const verdict = await checker.check(eventWith(body));
    const spans = verdict.hits.map(
      (hit: any) => `${hit.scope}:${hit.spans.map((span: any) => `${span.field}[${span.start},${span.end})`).join("+")}`,
    );
    return { route: verdict.route, spans, deduction: verdict.appliedDeduction?.value ?? 0 };
  } catch (error) {
    return `THROW:${(error as Error).message.slice(0, 80)}`;
  }
}
const fmt = (o: Outcome | string) => (typeof o === "string" ? o : `${o.route}${o.spans.length ? ` ${o.spans.join(" ")}` : ""}`);

/** Expected span of `writing` placed after `prefix`, in the body scope. */
const bodySpan = (prefix: string, writing: string) => `body:body[${prefix.length},${prefix.length + writing.length})`;

interface Case {
  group: string;
  label: string;
  rule: Rule;
  body: string;
  expected: { route: string; spans: string[] } | null; // null = observation only
  opts?: { action?: unknown; nickname?: string; table?: Map<string, string>; strip?: boolean };
}
const cases: Case[] = [];
const P = "x "; // a visible prefix and suffix, so a span that leaks past the word shows up
const S = " y";
function block(group: string, label: string, rule: Rule, writing: string, opts?: Case["opts"]) {
  cases.push({ group, label, rule, body: P + writing + S, expected: { route: "BLOCK", spans: [bodySpan(P, writing)] }, opts });
}
function pass(group: string, label: string, rule: Rule, body: string, opts?: Case["opts"]) {
  cases.push({ group, label, rule, body, expected: { route: "PASS", spans: [] }, opts });
}
function observe(group: string, label: string, rule: Rule, body: string, opts?: Case["opts"]) {
  cases.push({ group, label, rule, body, expected: null, opts });
}

// ---------- §1 the five words: half-width, spacing marks and format-separated writings ----------
const ZW = ["\u200B", "\u2060", "\u00AD", "\uFEFF", "\u200D"];
const words: Array<{ word: string; half: string; unvoiced: string; decomposed: string; spacing: string }> = [
  { word: "バカ", half: "ﾊﾞｶ", unvoiced: "ハカ", decomposed: "ハ\u3099カ", spacing: "ハ\u309Bカ" },
  { word: "ブス", half: "ﾌﾞｽ", unvoiced: "フス", decomposed: "フ\u3099ス", spacing: "フ\u309Bス" },
  { word: "デブ", half: "ﾃﾞﾌﾞ", unvoiced: "テフ", decomposed: "テ\u3099フ\u3099", spacing: "テ\u309Bフ\u309B" },
  { word: "ハゲ", half: "ﾊｹﾞ", unvoiced: "ハケ", decomposed: "ハケ\u3099", spacing: "ハケ\u309B" },
  { word: "ポンコツ", half: "ﾎﾟﾝｺﾂ", unvoiced: "ホンコツ", decomposed: "ホ\u309Aンコツ", spacing: "ホ\u309Cンコツ" },
];
/** Puts `zw` in front of every sound mark of `text`. */
const beforeMarks = (text: string, zw: string) => text.replace(/[\u3099\u309A\uFF9E\uFF9F\u309B\u309C]/gu, (m) => zw + m);
for (const w of words) {
  block("§1", `normalized ${w.word} / half-width ${w.half}`, nm(w.word), w.half);
  block("§1", `regex ${w.word} / half-width ${w.half}`, rx(w.word), w.half);
  block("§1", `normalized ${w.word} / spacing marks ${show(w.spacing)}`, nm(w.word), w.spacing);
  for (const zw of ZW) {
    block("§1", `normalized ${w.word} / ${show(beforeMarks(w.decomposed, zw))}`, nm(w.word), beforeMarks(w.decomposed, zw));
    block("§1", `normalized ${w.word} / half-width ${show(beforeMarks(w.half, zw))}`, nm(w.word), beforeMarks(w.half, zw));
  }
  block("§1", `regex ${w.word} / ${show(beforeMarks(w.decomposed, "\u200B"))}`, rx(w.word), beforeMarks(w.decomposed, "\u200B"));
  block("§1", `regex ${w.word} / half-width ${show(beforeMarks(w.half, "\u2060"))}`, rx(w.word), beforeMarks(w.half, "\u2060"));
  // reverse: a rule for the unvoiced word must not hit any voiced writing
  for (const writing of [w.half, w.spacing, beforeMarks(w.decomposed, "\u200B"), beforeMarks(w.half, "\u00AD")]) {
    pass("§1r", `normalized ${w.unvoiced} / ${show(writing)}`, nm(w.unvoiced), P + writing + S);
  }
}
// ハカ against ﾊﾞｶ (E21 explicit) and カス against ｶﾞｽ with a deduction group
pass("§1r", "normalized ハカ / ﾊﾞｶ", nm("ハカ"), "ﾊﾞｶ");
const deduct = { kind: "DEDUCT", deduction: 5 };
cases.push({ group: "§1r", label: "deduct カス / ｶﾞｽ代が高い", rule: nm("カス"), body: "ｶﾞｽ代が高い", expected: { route: "PASS", spans: [] }, opts: { action: deduct } });
cases.push({ group: "§1r", label: "deduct カス / ｶ\\u200B\\u3099ス代", rule: nm("カス"), body: "ｶ\u200B\u3099ス代", expected: { route: "PASS", spans: [] }, opts: { action: deduct } });
cases.push({ group: "§1r", label: "deduct カス / カスタード (a true hit)", rule: nm("カス"), body: "カスタード", expected: { route: "REVIEW", spans: ["body:body[0,2)"] }, opts: { action: deduct } });

// ---------- §1b the B1 contrast inputs, with their spans ----------
const b1span = (label: string, rule: Rule, body: string, spans: string[]) =>
  cases.push({ group: "§1b B1 contrast", label, rule, body, expected: { route: spans.length ? "BLOCK" : "PASS", spans } });
b1span("normalized badword / ba\\u0301dword", nm("badword"), "ba\u0301dword", ["body:body[0,8)"]);
b1span("normalized badword / bádword", nm("badword"), "bádword", ["body:body[0,7)"]);
b1span("normalized ばか / ばか", nm("ばか"), "ばか", ["body:body[0,2)"]);
b1span("normalized ばか / はかまいりにいく", nm("ばか"), "はかまいりにいく", []);
b1span("normalized バカ / ハカセ", nm("バカ"), "ハカセ", []);
b1span("regex ばか / ばか", rx("ばか"), "ばか", ["body:body[0,2)"]);
b1span("regex バカ / バカ", rx("バカ"), "バカ", ["body:body[0,2)"]);
b1span("regex café / café", rx("café"), "café", ["body:body[0,4)"]);
b1span("regex café / cafe\\u0301", rx("café"), "cafe\u0301", ["body:body[0,5)"]);
b1span("normalized ばか / は\\u3099か", nm("ばか"), "は\u3099か", ["body:body[0,3)"]);
b1span("regex ばか / は\\u3099か", rx("ばか"), "は\u3099か", ["body:body[0,3)"]);
b1span("normalized はか / ばか", nm("はか"), "ばか", []);
b1span("normalized ハカ / バカ", nm("ハカ"), "バカ", []);
b1span("normalized ぱん / はん", nm("ぱん"), "はん", []);
b1span("exact ばか / ばか", { id: "r", kind: "exact", text: "ばか" }, "ばか", ["body:body[0,2)"]);

// ---------- §2 new combinations (at least five kinds) ----------
// (a) full-width and half-width mixed in one word
block("§2a mixed widths", "normalized バカ / バｶ", nm("バカ"), "バｶ");
block("§2a mixed widths", "normalized バカ / ﾊﾞカ", nm("バカ"), "ﾊﾞカ");
block("§2a mixed widths", "normalized バカ / ハﾞカ (full-width kana, half-width mark)", nm("バカ"), "ハﾞカ");
block("§2a mixed widths", "normalized ばか / はﾞか (hiragana, half-width mark)", nm("ばか"), "はﾞか");
block("§2a mixed widths", "normalized ポンコツ / ポンｺﾂ", nm("ポンコツ"), "ポンｺﾂ");
block("§2a mixed widths", "normalized ポンコツ / ﾎﾟﾝコツ", nm("ポンコツ"), "ﾎﾟﾝコツ");
block("§2a mixed widths", "regex デブ / ﾃﾞブ", rx("デブ"), "ﾃﾞブ");
block("§2a mixed widths", "normalized バカ / ﾊ\\u3099ｶ (half-width kana, combining mark)", nm("バカ"), "ﾊ\u3099ｶ");
pass("§2a mixed widths", "normalized バカ / ﾊｶｾ (no mark)", nm("バカ"), "ﾊｶｾ");
// (b) semi-voiced ﾊﾟ
block("§2b handakuten", "normalized パン / ﾊﾟﾝ", nm("パン"), "ﾊﾟﾝ");
block("§2b handakuten", "regex パン / ﾊﾟﾝ", rx("パン"), "ﾊﾟﾝ");
block("§2b handakuten", "normalized パン / ハ\\u309Cン", nm("パン"), "ハ\u309Cン");
block("§2b handakuten", "normalized パン / ﾊ\\u200Bﾟﾝ", nm("パン"), "ﾊ\u200Bﾟﾝ");
pass("§2b handakuten", "normalized ハン / ﾊﾟﾝ", nm("ハン"), P + "ﾊﾟﾝ" + S);
pass("§2b handakuten", "normalized バン / ﾊﾟﾝ (voiced vs semi-voiced)", nm("バン"), P + "ﾊﾟﾝ" + S);
pass("§2b handakuten", "normalized パン / ﾊﾞﾝ (semi-voiced vs voiced)", nm("パン"), P + "ﾊﾞﾝ" + S);
// (c) several format characters in a row
block("§2c format runs", "normalized バカ / ﾊ\\u200B\\u2060\\uFEFF\\u00ADﾞｶ", nm("バカ"), "ﾊ\u200B\u2060\uFEFF\u00ADﾞｶ");
block("§2c format runs", "normalized ばか / は\\u200B\\u200D\\u2060\\u3099か", nm("ばか"), "は\u200B\u200D\u2060\u3099か");
block("§2c format runs", "normalized バカ / ﾊﾞ\\u200B\\u200Bｶ (between letters)", nm("バカ"), "ﾊﾞ\u200B\u200Bｶ");
block("§2c format runs", "regex バカ / ﾊ\\u2060\\u2060ﾞｶ", rx("バカ"), "ﾊ\u2060\u2060ﾞｶ");
block("§2c format runs", "normalized ばか / は\\u202E\\u3099か (bidi override)", nm("ばか"), "は\u202E\u3099か");
// (d) combining marks with variation selectors and the grapheme joiner
block("§2d marks + VS", "normalized ばか / は\\uFE0F\\u3099か", nm("ばか"), "は\uFE0F\u3099か");
block("§2d marks + VS", "normalized ばか / は\\u3099\\uFE0Fか", nm("ばか"), "は\u3099\uFE0Fか");
block("§2d marks + VS", "normalized ばか / は\\u034F\\u3099か (CGJ)", nm("ばか"), "は\u034F\u3099か");
block("§2d marks + VS", "normalized バカ / ﾊ\\uFE0Eﾞｶ", nm("バカ"), "ﾊ\uFE0Eﾞｶ");
block("§2d marks + VS", "regex ばか / は\\uDB40\\uDD00\\u3099か (VS17)", rx("ばか"), "は\u{E0100}\u3099か");
block("§2d marks + VS", "normalized badword / ba\\u0301\\uFE0Fdword", nm("badword"), "ba\u0301\uFE0Fdword");
block("§2d marks + VS", "regex café / cafe\\uFE0F\\u0301", rx("café"), "cafe\uFE0F\u0301");
block("§2d marks + VS", "regex café / cafe\\u034F\\u0301 (CGJ)", rx("café"), "cafe\u034F\u0301");
// (e) Latin accents with zero-width characters
block("§2e latin + ZW", "regex café / cafe\\u200B\\u0301", rx("café"), "cafe\u200B\u0301");
block("§2e latin + ZW", "regex naïve / nai\\u2060\\u0308ve", rx("naïve"), "nai\u2060\u0308ve");
block("§2e latin + ZW", "normalized badword / b\\u200Bádword", nm("badword"), "b\u200Bádword");
block("§2e latin + ZW", "normalized badword / ba\\uFEFF\\u0301\\u200Bdword", nm("badword"), "ba\uFEFF\u0301\u200Bdword");
pass("§2e latin + ZW", "regex café / cafe\\u200B (no accent)", rx("café"), P + "cafe\u200B" + S);
pass("§2e latin + ZW", "regex café / cafe\\u200B\\u0300 (other accent)", rx("café"), P + "cafe\u200B\u0300" + S);
// (f) Korean
block("§2f korean", "normalized 바보 / \\u1107\\u200B\\u1161보 (jamo split by ZWSP)", nm("바보"), "\u1107\u200B\u1161보");
block("§2f korean", "regex 바보 / \\u1107\\u2060\\u1161\\u1107\\u1169", rx("바보"), "\u1107\u2060\u1161\u1107\u1169");
block("§2f korean", "normalized 밥 / 바\\u200B\\u11B8 (LV + ZWSP + T)", nm("밥"), "바\u200B\u11B8");
block("§2f korean", "normalized 바보 / 바\\u00AD보", nm("바보"), "바\u00AD보");
pass("§2f korean", "normalized 바보 / 파\\u200B보", nm("바보"), P + "파\u200B보" + S);
pass("§2f korean", "normalized 바보 / 바\\u200B부", nm("바보"), P + "바\u200B부" + S);
// (g) Vietnamese
block("§2g vietnamese", "regex tiếng / tie\\u200B\\u0302\\u0301ng", rx("tiếng"), "tie\u200B\u0302\u0301ng");
block("§2g vietnamese", "regex tiếng / tiê\\u2060\\u0301ng", rx("tiếng"), "tiê\u2060\u0301ng");
block("§2g vietnamese", "normalized tieng / tiếng (tones folded, design 4.8)", nm("tieng"), "tiếng");
pass("§2g vietnamese", "regex tiếng / tiềng (other tone)", rx("tiếng"), P + "tiềng" + S);
pass("§2g vietnamese", "regex má / ma", rx("má"), P + "ma" + S);
// (h) more Japanese writings
block("§2h japanese", "normalized ヴ / ｳﾞ", nm("ヴ"), "ｳﾞ");
block("§2h japanese", "normalized ヴ / ウ\\u309B", nm("ヴ"), "ウ\u309B");
block("§2h japanese", "normalized バーカ / ﾊﾞｰｶ", nm("バーカ"), "ﾊﾞｰｶ");
block("§2h japanese", "normalized ばか / は\\u200B\\u309Bか (format char + spacing mark)", nm("ばか"), "は\u200B\u309Bか");
pass("§2h japanese", "normalized ウ / ｳﾞ", nm("ウ"), P + "ｳﾞ" + S);
pass("§2h japanese", "normalized はか / は\\u2060\\u3099か", nm("はか"), P + "は\u2060\u3099か" + S);
pass("§2h japanese", "normalized ハカ / ハ\\u200B\\u3099カ", nm("ハカ"), P + "ハ\u200B\u3099カ" + S);
pass("§2h japanese", "normalized ばか / はか", nm("ばか"), P + "はか" + S);
// (i) offsets: supplementary plane before the word, two hits, trailing format character
cases.push({ group: "§2i offsets", label: "normalized バカ / 😀ﾊﾞｶ ﾊﾞｶ (two hits)", rule: nm("バカ"), body: "😀ﾊﾞｶ ﾊﾞｶ", expected: { route: "BLOCK", spans: ["body:body[2,5)", "body:body[6,9)"] } });
cases.push({ group: "§2i offsets", label: "normalized バカ / ﾊﾞｶ\\u200Bx (trailing format char joins the last unit)", rule: nm("バカ"), body: "ﾊﾞｶ\u200Bx", expected: { route: "BLOCK", spans: ["body:body[0,4)"] } });
cases.push({ group: "§2i offsets", label: "normalized バカ / あ\\u200Bﾊﾞｶ (leading format char stays outside)", rule: nm("バカ"), body: "あ\u200Bﾊﾞｶ", expected: { route: "BLOCK", spans: ["body:body[2,5)"] } });
cases.push({ group: "§2i offsets", label: "normalized バカ / \\u200Bﾊﾞｶ (format char at text start)", rule: nm("バカ"), body: "\u200Bﾊﾞｶ", expected: { route: "BLOCK", spans: ["body:body[1,4)"] } });
cases.push({ group: "§2i offsets", label: "exact ﾊﾞｶ / ﾊﾞｶ (exact copy is the original)", rule: { id: "r", kind: "exact", text: "ﾊﾞｶ" }, body: "xﾊﾞｶ", expected: { route: "BLOCK", spans: ["body:body[1,4)"] } });
pass("§2i offsets", "exact バカ / ﾊﾞｶ (exact does not normalize)", { id: "r", kind: "exact", text: "バカ" }, "ﾊﾞｶ");
// (j) nickname and body
cases.push({ group: "§2j fields", label: "normalized バカ / nickname ﾊﾞ + body ｶ (combined)", rule: nm("バカ"), body: "ｶ", expected: { route: "BLOCK", spans: ["combined:nickname[0,2)+body[0,1)"] }, opts: { nickname: "ﾊﾞ" } });
cases.push({ group: "§2j fields", label: "normalized バカ / nickname ﾊﾞｶ (nickname scope)", rule: nm("バカ"), body: "hello", expected: { route: "BLOCK", spans: ["nickname:nickname[0,3)"] }, opts: { nickname: "ﾊﾞｶ" } });
observe("§2j fields", "normalized バカ / nickname ﾊ + body ﾞｶ (mark at body start; units do not cross fields, design 4.11)", nm("バカ"), "ﾞｶ", { nickname: "ﾊ" });
// (k) readings
const table = new Map([["ガ", "ga"], ["カ", "ka"], ["パ", "pa"], ["ハ", "ha"]]);
cases.push({ group: "§2k reading", label: "reading gaka / ｶﾞｶ", rule: rd("gaka"), body: "ｶﾞｶ", expected: { route: "REVIEW", spans: ["body:body[0,3)"] }, opts: { action: { kind: "REVIEW" }, table } });
cases.push({ group: "§2k reading", label: "reading gaka / ｶ\\u200B\\u3099カ", rule: rd("gaka"), body: "ｶ\u200B\u3099カ", expected: { route: "REVIEW", spans: ["body:body[0,4)"] }, opts: { action: { kind: "REVIEW" }, table } });
cases.push({ group: "§2k reading", label: "reading kaka / ｶﾞｶ (must not hit)", rule: rd("kaka"), body: "ｶﾞｶ", expected: { route: "PASS", spans: [] }, opts: { action: { kind: "REVIEW" }, table } });
cases.push({ group: "§2k reading", label: "reading paha / ﾊﾟﾊ", rule: rd("paha"), body: "ﾊﾟﾊ", expected: { route: "REVIEW", spans: ["body:body[0,3)"] }, opts: { action: { kind: "REVIEW" }, table } });
// (l) stripCombiningMarks off: Japanese marks must survive in that mode too
block("§2l strip off", "normalized バカ / ﾊﾞｶ with stripCombiningMarks=false", nm("バカ"), "ﾊﾞｶ", { strip: false });
block("§2l strip off", "normalized ばか / は\\u200B\\u3099か with stripCombiningMarks=false", nm("ばか"), "は\u200B\u3099か", { strip: false });
// (m) observations outside B3: default-ignorable letters that are neither \p{Cf} nor \p{M}
for (const [name, ch] of [["U+3164 HANGUL FILLER", "\u3164"], ["U+FFA0 HALFWIDTH HANGUL FILLER", "\uFFA0"], ["U+115F CHOSEONG FILLER", "\u115F"], ["U+1160 JUNGSEONG FILLER", "\u1160"]] as const) {
  observe("§3 fillers", `normalized badword / bad${name}word`, nm("badword"), `bad${ch}word`);
  observe("§3 fillers", `normalized バカ / ﾊﾞ${name}ｶ`, nm("バカ"), `ﾊﾞ${ch}ｶ`);
}

const results: unknown[] = [];
let group = "";
for (const c of cases) {
  if (c.group !== group) {
    group = c.group;
    console.log(`\n## ${group}  (f4808fb | b1a1471 | candidate)`);
  }
  const row = [await run(base, c.rule, c.body, c.opts), await run(prev, c.rule, c.body, c.opts), await run(cand, c.rule, c.body, c.opts)];
  console.log(`   ${c.label}: body ${show(c.body)} :: ${row.map(fmt).join(" | ")}${c.expected === null ? "   (observation)" : ""}`);
  const got = row[2];
  results.push({ group: c.group, label: c.label, body: show(c.body), f4808fb: fmt(row[0]), b1a1471: fmt(row[1]), candidate: fmt(got), expected: c.expected });
  if (c.expected !== null) {
    const actual = typeof got === "string" ? got : { route: got.route, spans: got.spans };
    expectEq(`${c.group} ${c.label}`, actual, c.expected);
  }
}
{
  const reading = candTr.createTableTransliterator(new Map([["ガ", "ga"], ["カ", "ka"]])).transliterate("body", "ｶﾞｶ");
  expectEq("transliterate ｶﾞｶ with {ガ:ga,カ:ka}", { text: reading.mapped.text, complete: reading.complete }, { text: "gaka", complete: true });
}

// ---------- §4 differential check: unit-by-unit copy against a whole-text reference ----------
// Reference: remove every \p{Cf} and every default-ignorable mark, map U+309B/U+309C to the combining marks, then
// normalize the whole text at once. The candidate normalizes unit by unit. Any difference is a unit-boundary defect.
const DROP = /\p{Cf}|(?=\p{M})\p{Default_Ignorable_Code_Point}/gu;
const DIACRITIC = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/gu;
function reference(raw: string, strip: boolean): string {
  const visible = raw.replace(DROP, "").replace(/[\u309B\u309C]/gu, (m) => (m === "\u309B" ? "\u3099" : "\u309A"));
  const composed = strip ? visible.normalize("NFKD").replace(DIACRITIC, "").normalize("NFKC") : visible.normalize("NFKC");
  return composed.toLowerCase().replace(/[\p{M}\p{Cf}]/gu, "");
}
const alphabet = [
  ..."はかばぱカガハバパｶﾊﾎﾝｽﾌｳあいアイー", "ｰ", "\u3099", "\u309A", "\u309B", "\u309C", "\uFF9E", "\uFF9F",
  "\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF", "\u00AD", "\u202E", "\u2066", "\uFE0F", "\uFE0E", "\u{E0100}", "\u034F",
  ..."abeiouAEZ09", "\u0301", "\u0302", "\u0308", "\u0300", "\u0323", "é", "ế", "\u1107", "\u1161", "\u1169", "\u11B8", "바", "보",
  "笨", "蛋", " ", "😀", "ﬁ", "㋕", "\u20DD",
];
let seed = 20261111;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
let compared = 0;
let mismatchCount = 0;
const mismatches: string[] = [];
for (let n = 0; n < 200_000; n += 1) {
  const length = 1 + Math.floor(rand() * 8);
  let raw = "";
  for (let i = 0; i < length; i += 1) raw += alphabet[Math.floor(rand() * alphabet.length)];
  for (const strip of [true, false]) {
    compared += 1;
    const got = candNorm.normalizeText(raw, { stripCombiningMarks: strip });
    const want = reference(raw, strip);
    if (got === want) continue;
    mismatchCount += 1;
    if (mismatches.length < 12) mismatches.push(`${show(raw)} strip=${strip}: unit=${show(got)} whole=${show(want)}`);
  }
}
console.log(`\n## §4 differential: ${compared} comparisons, ${mismatchCount} mismatches`);
for (const line of mismatches) console.log(`   ${line}`);
expectEq("§4 unit-by-unit copy equals the whole-text reference on 200000 random strings × 2 options", mismatchCount, 0);

// ---------- §5 span invariants on random messages that contain a voiced word ----------
// Each random message embeds one writing of バカ between random filler; the hit must start at the first code unit of
// the writing and end at its last unit (plus any invisible characters glued to it). The filler never contains kana.
const fillers = [..."xyz 01", "\u200B", "😀", "é", "\u0301"];
let spanChecks = 0;
let spanFailures = 0;
const spanExamples: string[] = [];
const writings = ["ﾊﾞｶ", "ハ\u309Bカ", "ハ\u200B\u3099カ", "ﾊ\u2060ﾞｶ", "バｶ", "ﾊﾞカ", "ハ\uFE0F\u3099カ"];
const checker = cand.createModerationChecker({
  ruleSet: { version: "v1", groups: [{ id: "g", action: { kind: "BLOCK" }, rules: [nm("バカ")] }] },
  nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") },
  now: () => 0,
});
for (let n = 0; n < 3000; n += 1) {
  let before = "";
  let after = "";
  const lb = Math.floor(rand() * 4);
  const la = Math.floor(rand() * 4);
  for (let i = 0; i < lb; i += 1) before += fillers[Math.floor(rand() * fillers.length)];
  for (let i = 0; i < la; i += 1) after += fillers[Math.floor(rand() * fillers.length)];
  if (/^[\p{M}]/u.test(after)) after = `x${after}`; // a mark right after the word would join its last unit
  if (/^\u200B/u.test(after)) after = `x${after}`;
  const writing = writings[Math.floor(rand() * writings.length)]!;
  const body = before + writing + after;
  const verdict = await checker.check(eventWith(body));
  spanChecks += 1;
  const spans = verdict.hits.map((hit: any) => hit.spans.map((s: any) => `${s.field}[${s.start},${s.end})`).join("+"));
  const want = [`body[${before.length},${before.length + writing.length})`];
  if (JSON.stringify(spans) !== JSON.stringify(want) || verdict.route !== "BLOCK") {
    spanFailures += 1;
    if (spanExamples.length < 8) spanExamples.push(`${show(body)} -> ${verdict.route} ${JSON.stringify(spans)} (want ${JSON.stringify(want)})`);
  }
}
for (const line of spanExamples) console.log(`   ${line}`);
expectEq(`§5 random embedded writings: exact spans on ${spanChecks} messages`, spanFailures, 0);

console.log(`\nchecks ${checks}, failures ${failures}`);
await import("node:fs").then((fs) => fs.writeFileSync(`${W}/logs/e22-results.json`, JSON.stringify(results, null, 1)));
process.exit(failures === 0 ? 0 : 1);
