/**
 * Inputs of the S006 B3 regression (acceptance E20 and E21). The matching copy used to lose the voiced and semi-voiced
 * sound marks of Japanese kana when they were written as half-width marks (U+FF9E, U+FF9F), as spacing marks (U+309B,
 * U+309C), or with a format character between the kana and a combining mark. One table feeds the checker test and the
 * before/after probe kept with the evidence, so both run the same inputs.
 */

/** Combining voiced and semi-voiced sound marks. */
export const DAKUTEN = "\u3099";
export const HANDAKUTEN = "\u309A";
/** Spacing sound marks, as in `ハ゛カ`. NFKC turns each into a space plus the combining mark. */
export const SPACING_DAKUTEN = "\u309B";
export const SPACING_HANDAKUTEN = "\u309C";
/** Half-width sound marks, as in `ﾊﾞｶ`. NFKC turns each into the combining mark. */
export const HW_DAKUTEN = "\uFF9E";
export const HW_HANDAKUTEN = "\uFF9F";

/** Format characters (`\p{Cf}`) that were seen between a kana and its combining mark. */
export const ZERO_WIDTH_SPACE = "\u200B";
export const WORD_JOINER = "\u2060";
export const SOFT_HYPHEN = "\u00AD";
export const FORMAT_CHARS: readonly string[] = [ZERO_WIDTH_SPACE, WORD_JOINER, SOFT_HYPHEN];

export type CaseRule =
  | { readonly kind: "exact" | "normalized"; readonly text: string }
  | { readonly kind: "regex"; readonly source: string };

export const exact = (text: string): CaseRule => ({ kind: "exact", text });
export const normalized = (text: string): CaseRule => ({ kind: "normalized", text });
export const regex = (source: string): CaseRule => ({ kind: "regex", source });

/** One rule checked against one body. */
export interface RuleCase {
  readonly id: string;
  readonly rule: CaseRule;
  readonly body: string;
  /**
   * The original text of each hit, in order. Where that text sits in the body is the span the checker must report,
   * so every expected span is fixed by how the body was written and not by what the code computes.
   */
  readonly hits: readonly string[];
}

/** Expected `[start, end)` of every hit, in UTF-16 code units of the body. */
export function expectedSpans(testCase: RuleCase): Array<readonly [number, number]> {
  const spans: Array<readonly [number, number]> = [];
  let from = 0;
  for (const hit of testCase.hits) {
    const start = testCase.body.indexOf(hit, from);
    if (start < 0) throw new Error(`case ${testCase.id}: the hit text is not in the body`);
    spans.push([start, start + hit.length]);
    from = start + hit.length;
  }
  return spans;
}

/** Text with invisible, combining and look-alike characters written as code points, for test titles and probe output. */
export function show(text: string): string {
  return [...text]
    .map((char) =>
      /[\p{M}\p{Cf}\u1100-\u11FF\uD7B0-\uD7FF\u309B\u309C\uFF9E\uFF9F]/u.test(char)
        ? `\\u${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`
        : char,
    )
    .join("");
}

export function describeRule(rule: CaseRule): string {
  return rule.kind === "regex" ? `regex ${show(rule.source)}` : `${rule.kind} ${show(rule.text)}`;
}

/** Puts `formatChar` in front of every sound mark of `text`, between the kana and its mark. */
export function formatBeforeMarks(text: string, formatChar: string): string {
  return text.replace(/[\u3099\u309A\u309B\u309C\uFF9E\uFF9F]/gu, (mark) => `${formatChar}${mark}`);
}

export const BAKA_HALFWIDTH = `ﾊ${HW_DAKUTEN}ｶ`;
export const BUSU_HALFWIDTH = `ﾌ${HW_DAKUTEN}ｽ`;
export const DEBU_HALFWIDTH = `ﾃ${HW_DAKUTEN}ﾌ${HW_DAKUTEN}`;
export const HAGE_HALFWIDTH = `ﾊｹ${HW_DAKUTEN}`;
export const PONKOTSU_HALFWIDTH = `ﾎ${HW_HANDAKUTEN}ﾝｺﾂ`;

/**
 * Voiced and semi-voiced katakana words of acceptance E20 and E21, with their half-width writing and the same word
 * without the sound marks. A voiced word must never match its unvoiced word, in either direction.
 */
export const WORDS: ReadonlyArray<{ readonly word: string; readonly halfwidth: string; readonly unvoiced: string }> = [
  { word: "バカ", halfwidth: BAKA_HALFWIDTH, unvoiced: "ハカ" },
  { word: "ブス", halfwidth: BUSU_HALFWIDTH, unvoiced: "フス" },
  { word: "デブ", halfwidth: DEBU_HALFWIDTH, unvoiced: "テフ" },
  { word: "ハゲ", halfwidth: HAGE_HALFWIDTH, unvoiced: "ハケ" },
  { word: "ポンコツ", halfwidth: PONKOTSU_HALFWIDTH, unvoiced: "ホンコツ" },
];

export interface Writing {
  readonly name: string;
  readonly text: string;
}

function codePointLabel(char: string): string {
  return `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Every writing of a word that NFKC (or NFKC after removing the format characters) reads as the word itself. */
export function writingsOf(word: string, halfwidth: string): Writing[] {
  const decomposed = word.normalize("NFD");
  const halfwidthMarks = decomposed.replace(/\u3099/gu, HW_DAKUTEN).replace(/\u309A/gu, HW_HANDAKUTEN);
  const spacingMarks = decomposed.replace(/\u3099/gu, SPACING_DAKUTEN).replace(/\u309A/gu, SPACING_HANDAKUTEN);
  return [
    { name: "precomposed", text: word },
    { name: "kana + combining mark", text: decomposed },
    { name: "half-width kana + half-width mark", text: halfwidth },
    { name: "full-width kana + half-width mark", text: halfwidthMarks },
    { name: "kana + spacing mark", text: spacingMarks },
    ...FORMAT_CHARS.flatMap((formatChar) => [
      {
        name: `kana + ${codePointLabel(formatChar)} + combining mark`,
        text: formatBeforeMarks(decomposed, formatChar),
      },
      {
        name: `half-width kana + ${codePointLabel(formatChar)} + half-width mark`,
        text: formatBeforeMarks(halfwidth, formatChar),
      },
    ]),
  ];
}

/**
 * Acceptance E20 section 1, rows 1 to 17: the B1 contrast inputs and their neighbours. Every row has the result the
 * acceptance expected. Row 13 is the one that B3 changes.
 */
export const E20_SECTION_1: readonly RuleCase[] = [
  { id: "E20-01", rule: normalized("badword"), body: "ba\u0301dword", hits: ["ba\u0301dword"] },
  { id: "E20-02", rule: normalized("badword"), body: "b\u00E1dword", hits: ["b\u00E1dword"] },
  { id: "E20-03", rule: normalized("ばか"), body: "ばか", hits: ["ばか"] },
  { id: "E20-04", rule: normalized("ばか"), body: "はかまいりにいく", hits: [] },
  { id: "E20-05", rule: normalized("バカ"), body: "ハカセ", hits: [] },
  { id: "E20-06", rule: regex("ばか"), body: "ばか", hits: ["ばか"] },
  { id: "E20-07", rule: regex("バカ"), body: "バカ", hits: ["バカ"] },
  { id: "E20-08", rule: regex("caf\u00E9"), body: "caf\u00E9", hits: ["caf\u00E9"] },
  { id: "E20-09", rule: exact("ばか"), body: "ばか", hits: ["ばか"] },
  { id: "E20-10", rule: regex("caf\u00E9"), body: "cafe\u0301", hits: ["cafe\u0301"] },
  { id: "E20-11", rule: normalized("ばか"), body: `は${DAKUTEN}か`, hits: [`は${DAKUTEN}か`] },
  { id: "E20-12", rule: regex("ばか"), body: `は${DAKUTEN}か`, hits: [`は${DAKUTEN}か`] },
  { id: "E20-13", rule: normalized("バカ"), body: BAKA_HALFWIDTH, hits: [BAKA_HALFWIDTH] },
  { id: "E20-14", rule: normalized("はか"), body: "ばか", hits: [] },
  { id: "E20-15", rule: normalized("ハカ"), body: "バカ", hits: [] },
  { id: "E20-16", rule: normalized("ぱん"), body: "はん", hits: [] },
  // Documented residual risk (S006 design 4.8): a regex rule matches the composed copy, which keeps the accent.
  { id: "E20-17", rule: regex("badword"), body: "ba\u0301dword", hits: [] },
];

/** Acceptance E21, rows 1 to 10, in table order. */
export const E21_ROWS: readonly RuleCase[] = [
  { id: "E21-01", rule: normalized("バカ"), body: BAKA_HALFWIDTH, hits: [BAKA_HALFWIDTH] },
  { id: "E21-02", rule: normalized("ブス"), body: BUSU_HALFWIDTH, hits: [BUSU_HALFWIDTH] },
  { id: "E21-03", rule: normalized("デブ"), body: DEBU_HALFWIDTH, hits: [DEBU_HALFWIDTH] },
  { id: "E21-04", rule: normalized("ハゲ"), body: HAGE_HALFWIDTH, hits: [HAGE_HALFWIDTH] },
  { id: "E21-05", rule: normalized("ポンコツ"), body: PONKOTSU_HALFWIDTH, hits: [PONKOTSU_HALFWIDTH] },
  { id: "E21-06", rule: regex("バカ"), body: BAKA_HALFWIDTH, hits: [BAKA_HALFWIDTH] },
  { id: "E21-07", rule: normalized("ハカ"), body: BAKA_HALFWIDTH, hits: [] },
  { id: "E21-08", rule: normalized("バカ"), body: `ハ${SPACING_DAKUTEN}カ`, hits: [`ハ${SPACING_DAKUTEN}カ`] },
  {
    id: "E21-09",
    rule: normalized("ばか"),
    body: `は${ZERO_WIDTH_SPACE}${DAKUTEN}か`,
    hits: [`は${ZERO_WIDTH_SPACE}${DAKUTEN}か`],
  },
  // The whole-string NFKC of ﾊﾞｶ, which the matching copy has to equal.
  { id: "E21-10", rule: normalized("バカ"), body: "バカ", hits: ["バカ"] },
];

/**
 * Acceptance E20 section 2, rows with a Japanese kana: a format character between the kana and its combining mark,
 * and the same text with the reverse rule. ZW-03 and ZW-04 have no mark between and were correct before B3.
 */
export const E20_SECTION_2_KANA: readonly RuleCase[] = [
  { id: "ZW-03", rule: normalized("ばか"), body: `ば${ZERO_WIDTH_SPACE}か`, hits: [`ば${ZERO_WIDTH_SPACE}か`] },
  { id: "ZW-04", rule: regex("ばか"), body: `ば${ZERO_WIDTH_SPACE}か`, hits: [`ば${ZERO_WIDTH_SPACE}か`] },
  {
    id: "ZW-05",
    rule: normalized("ばか"),
    body: `は${ZERO_WIDTH_SPACE}${DAKUTEN}か`,
    hits: [`は${ZERO_WIDTH_SPACE}${DAKUTEN}か`],
  },
  {
    id: "ZW-06",
    rule: normalized("ばか"),
    body: `は${WORD_JOINER}${DAKUTEN}か`,
    hits: [`は${WORD_JOINER}${DAKUTEN}か`],
  },
  {
    id: "ZW-07",
    rule: normalized("ばか"),
    body: `は${SOFT_HYPHEN}${DAKUTEN}か`,
    hits: [`は${SOFT_HYPHEN}${DAKUTEN}か`],
  },
  // The reverse: text that displays as ばか no longer hits the rule for はか.
  { id: "ZW-08", rule: normalized("はか"), body: `は${ZERO_WIDTH_SPACE}${DAKUTEN}か`, hits: [] },
  {
    id: "ZW-09",
    rule: normalized("ばか"),
    body: `ば${ZERO_WIDTH_SPACE}${DAKUTEN}か`,
    hits: [`ば${ZERO_WIDTH_SPACE}${DAKUTEN}か`],
  },
];

/** Acceptance E20 section 2: Korean, Vietnamese, Arabic, Latin with zero-width characters, Cyrillic and Chinese. */
export const E20_SECTION_2_OTHER: readonly RuleCase[] = [
  { id: "KO-01", rule: normalized("바보"), body: "바보", hits: ["바보"] },
  { id: "KO-02", rule: normalized("바보"), body: "바보".normalize("NFD"), hits: ["바보".normalize("NFD")] },
  { id: "KO-03", rule: regex("바보"), body: "바보".normalize("NFD"), hits: ["바보".normalize("NFD")] },
  { id: "KO-04", rule: normalized("바보"), body: "파보", hits: [] },
  { id: "KO-05", rule: normalized("바보"), body: "바부", hits: [] },
  { id: "KO-06", rule: normalized("바보"), body: `바${ZERO_WIDTH_SPACE}보`, hits: [`바${ZERO_WIDTH_SPACE}보`] },
  // Observation (judgment N11): compatibility jamo are not folded into syllables. Unchanged by B3.
  { id: "KO-07", rule: normalized("바보"), body: "ㅂㅏㅂㅗ", hits: [] },
  { id: "VI-01", rule: normalized("m\u00E1"), body: "m\u00E1", hits: ["m\u00E1"] },
  // Observation (judgment N11): the normalized copy folds tones. Unchanged by B3.
  { id: "VI-02", rule: normalized("m\u00E1"), body: "ma", hits: ["ma"] },
  { id: "VI-03", rule: normalized("m\u00E1"), body: "m\u00E0", hits: ["m\u00E0"] },
  { id: "VI-04", rule: regex("m\u00E1"), body: "ma", hits: [] },
  { id: "VI-05", rule: regex("m\u00E1"), body: "ma\u0301", hits: ["ma\u0301"] },
  { id: "VI-06", rule: exact("m\u00E1"), body: "m\u00E1", hits: ["m\u00E1"] },
  { id: "AR-01", rule: normalized("كلب"), body: "كَلْبٌ", hits: ["كَلْبٌ"] },
  { id: "AR-02", rule: regex("كلب"), body: "كَلْبٌ", hits: ["كَلْبٌ"] },
  { id: "AR-03", rule: normalized("كلب"), body: "ﻛﻠﺐ", hits: ["ﻛﻠﺐ"] },
  // Observation (judgment N11): tatweel is not removed. Unchanged by B3.
  { id: "AR-04", rule: normalized("كلب"), body: "كـلـب", hits: [] },
  {
    id: "ZW-01",
    rule: normalized("badword"),
    body: `ba${ZERO_WIDTH_SPACE}\u0301dword`,
    hits: [`ba${ZERO_WIDTH_SPACE}\u0301dword`],
  },
  {
    id: "ZW-02",
    rule: normalized("badword"),
    body: `b\u200Dad${WORD_JOINER}word`,
    hits: [`b\u200Dad${WORD_JOINER}word`],
  },
  // Observation (judgment N11): й and ё fold to и and е. Unchanged by B3.
  { id: "RU-01", rule: normalized("мой"), body: "мои", hits: ["мои"] },
  { id: "RU-02", rule: normalized("ёж"), body: "еж", hits: ["еж"] },
  { id: "ZH-01", rule: normalized("笨蛋"), body: "笨蛋", hits: ["笨蛋"] },
  { id: "ZH-02", rule: normalized("笨蛋"), body: `笨${ZERO_WIDTH_SPACE}蛋`, hits: [`笨${ZERO_WIDTH_SPACE}蛋`] },
];

/** Combinations chosen for this rework: mixed width, semi-voiced, long vowel, Hangul, Vietnamese, offsets. */
export const EXTRA_CASES: readonly RuleCase[] = [
  // Full-width and half-width characters in one word.
  { id: "X-01", rule: normalized("バカ"), body: `ハ${HW_DAKUTEN}カ`, hits: [`ハ${HW_DAKUTEN}カ`] },
  { id: "X-02", rule: normalized("バカ"), body: `ﾊ${HW_DAKUTEN}カ`, hits: [`ﾊ${HW_DAKUTEN}カ`] },
  { id: "X-03", rule: normalized("ばか"), body: `は${HW_DAKUTEN}か`, hits: [`は${HW_DAKUTEN}か`] },
  { id: "X-04", rule: regex("バカ"), body: `ハ${HW_DAKUTEN}カ`, hits: [`ハ${HW_DAKUTEN}カ`] },
  { id: "X-05", rule: normalized("ハカ"), body: `ハ${HW_DAKUTEN}カ`, hits: [] },
  // Semi-voiced marks: パ is neither バ nor ハ.
  { id: "X-06", rule: normalized("パン"), body: `ﾊ${HW_HANDAKUTEN}ﾝ`, hits: [`ﾊ${HW_HANDAKUTEN}ﾝ`] },
  { id: "X-07", rule: normalized("ハン"), body: `ﾊ${HW_HANDAKUTEN}ﾝ`, hits: [] },
  { id: "X-08", rule: normalized("パン"), body: `ハ${SPACING_HANDAKUTEN}ン`, hits: [`ハ${SPACING_HANDAKUTEN}ン`] },
  {
    id: "X-09",
    rule: normalized("パン"),
    body: `ハ${WORD_JOINER}${HANDAKUTEN}ン`,
    hits: [`ハ${WORD_JOINER}${HANDAKUTEN}ン`],
  },
  { id: "X-10", rule: normalized("パン"), body: `ﾊ${HW_DAKUTEN}ﾝ`, hits: [] },
  { id: "X-11", rule: normalized("バン"), body: `ﾊ${HW_HANDAKUTEN}ﾝ`, hits: [] },
  // The prolonged sound mark is a letter of the word, not a mark to drop.
  { id: "X-12", rule: normalized("バーカ"), body: `ﾊ${HW_DAKUTEN}ｰｶ`, hits: [`ﾊ${HW_DAKUTEN}ｰｶ`] },
  { id: "X-13", rule: normalized("バカ"), body: `ﾊ${HW_DAKUTEN}ｰｶ`, hits: [] },
  { id: "X-14", rule: normalized("ハーカ"), body: `ﾊ${HW_DAKUTEN}ｰｶ`, hits: [] },
  { id: "X-15", rule: regex("バーカ"), body: `ﾊ${HW_DAKUTEN}ｰｶ`, hits: [`ﾊ${HW_DAKUTEN}ｰｶ`] },
  // Hangul jamo with a format character inside a syllable, and between syllables.
  {
    id: "X-16",
    rule: normalized("바보"),
    body: `\u1107${ZERO_WIDTH_SPACE}\u1161\u1107\u1169`,
    hits: [`\u1107${ZERO_WIDTH_SPACE}\u1161\u1107\u1169`],
  },
  {
    id: "X-17",
    rule: normalized("바보"),
    body: `\u1107\u1161${ZERO_WIDTH_SPACE}\u1107\u1169`,
    hits: [`\u1107\u1161${ZERO_WIDTH_SPACE}\u1107\u1169`],
  },
  // Invisible marks (variation selector, combining grapheme joiner) between a kana and its sound mark.
  { id: "X-18", rule: normalized("ばか"), body: `は\uFE0F${DAKUTEN}か`, hits: [`は\uFE0F${DAKUTEN}か`] },
  { id: "X-19", rule: normalized("ばか"), body: `は\u034F${DAKUTEN}か`, hits: [`は\u034F${DAKUTEN}か`] },
  { id: "X-20", rule: normalized("はか"), body: `は\uFE0F${DAKUTEN}か`, hits: [] },
  // A sound mark cannot hide a Latin word.
  { id: "X-21", rule: normalized("badword"), body: `ba${HW_DAKUTEN}dword`, hits: [`ba${HW_DAKUTEN}dword`] },
  { id: "X-22", rule: normalized("badword"), body: `ba${SPACING_DAKUTEN}dword`, hits: [`ba${SPACING_DAKUTEN}dword`] },
  // Offsets: an astral character before the match, two hits, and a format character before the match.
  { id: "X-23", rule: normalized("バカ"), body: `\u{1F600}ﾊ${HW_DAKUTEN}ｶ`, hits: [`ﾊ${HW_DAKUTEN}ｶ`] },
  { id: "X-24", rule: normalized("バカ"), body: `ﾊ${HW_DAKUTEN}ｶ ﾊ${HW_DAKUTEN}ｶ`, hits: [`ﾊ${HW_DAKUTEN}ｶ`, `ﾊ${HW_DAKUTEN}ｶ`] },
  { id: "X-25", rule: normalized("バカ"), body: `あ${ZERO_WIDTH_SPACE}ﾊ${HW_DAKUTEN}ｶ`, hits: [`ﾊ${HW_DAKUTEN}ｶ`] },
  // A format character belongs to the character before it, so one after the match is inside the span.
  {
    id: "X-26",
    rule: normalized("バカ"),
    body: `ﾊ${HW_DAKUTEN}ｶ${ZERO_WIDTH_SPACE}x`,
    hits: [`ﾊ${HW_DAKUTEN}ｶ${ZERO_WIDTH_SPACE}`],
  },
  { id: "X-27", rule: normalized("バカ"), body: `${ZERO_WIDTH_SPACE}ﾊ${HW_DAKUTEN}ｶ`, hits: [`ﾊ${HW_DAKUTEN}ｶ`] },
  // Rule text written in the same unusual forms is normalized the same way.
  { id: "X-28", rule: normalized(`ﾊ${HW_DAKUTEN}ｶ`), body: "バカ", hits: ["バカ"] },
  { id: "X-29", rule: normalized(`ﾊ${HW_DAKUTEN}ｶ`), body: "ハカ", hits: [] },
  { id: "X-30", rule: normalized(`は${ZERO_WIDTH_SPACE}${DAKUTEN}か`), body: "ばか", hits: ["ばか"] },
  // Vietnamese tones: stacked marks, a format character between the marks, and the precomposed letter.
  { id: "X-31", rule: normalized("tieng"), body: "tie\u0302\u0301ng", hits: ["tie\u0302\u0301ng"] },
  {
    id: "X-32",
    rule: normalized("tieng"),
    body: `tie\u0302${ZERO_WIDTH_SPACE}\u0301ng`,
    hits: [`tie\u0302${ZERO_WIDTH_SPACE}\u0301ng`],
  },
  { id: "X-33", rule: normalized("tieng"), body: "ti\u1EBFng", hits: ["ti\u1EBFng"] },
  { id: "X-34", rule: normalized("tieng"), body: "ti\u00EAu", hits: [] },
  // A regex rule matches the composed copy, where an accent must not be kept apart by a format character either.
  {
    id: "X-35",
    rule: regex("caf\u00E9"),
    body: `cafe${ZERO_WIDTH_SPACE}\u0301`,
    hits: [`cafe${ZERO_WIDTH_SPACE}\u0301`],
  },
  // The source of a regex rule is not normalized (S004 section 5), so a half-width source matches neither writing.
  { id: "X-36", rule: regex(BAKA_HALFWIDTH), body: "バカ", hits: [] },
  { id: "X-37", rule: regex(BAKA_HALFWIDTH), body: BAKA_HALFWIDTH, hits: [] },
];

/** Every group of rule cases, in the order the evidence lists them. */
export const ALL_RULE_CASES: ReadonlyArray<{ readonly group: string; readonly cases: readonly RuleCase[] }> = [
  { group: "E20 section 1 (B1 contrast and neighbours)", cases: E20_SECTION_1 },
  { group: "E21 (half-width, spacing mark, whole-string NFKC)", cases: E21_ROWS },
  { group: "E20 section 2 (kana and format characters)", cases: E20_SECTION_2_KANA },
  { group: "E20 section 2 (Korean, Vietnamese, Arabic, Latin, Cyrillic, Chinese)", cases: E20_SECTION_2_OTHER },
  { group: "Extra combinations of this rework", cases: EXTRA_CASES },
];
