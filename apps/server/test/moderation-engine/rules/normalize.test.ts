import { describe, expect, it } from "vitest";
import {
  DEFAULT_NORMALIZE_OPTIONS,
  identityField,
  joinMapped,
  type NormalizeOptions,
  normalizeField,
  normalizeText,
  splitUnits,
} from "../../../src/modules/moderation-engine/rules/normalize.js";
import { spansFor } from "../../../src/modules/moderation-engine/rules/span-map.js";
import {
  BAKA_HALFWIDTH,
  DAKUTEN,
  HANDAKUTEN,
  HW_DAKUTEN,
  HW_HANDAKUTEN,
  SPACING_DAKUTEN,
  SPACING_HANDAKUTEN,
  WORDS,
  writingsOf,
} from "./sound-mark-cases.js";

describe("normalization for matching", () => {
  it("removes zero-width characters and combining marks from the matching copy", () => {
    expect(normalizeText("ba\u200Bd")).toBe("bad");
    expect(normalizeText("b\u0336a\u0336d\u0336")).toBe("bad");
  });

  it("applies compatibility decomposition and lower case", () => {
    expect(normalizeText("ＢＡＤ")).toBe("bad");
    expect(normalizeText("ﬁ")).toBe("fi");
  });

  it("composes Hangul jamo into a syllable", () => {
    expect(normalizeText("\u1100\u1161")).toBe("가");
  });

  it("attaches a mark to the character before it when splitting into units", () => {
    expect(splitUnits("e\u0301x").map((unit) => unit.raw)).toEqual(["e\u0301", "x"]);
  });
});

describe("span mapping back to the original text", () => {
  it("includes zero-width characters that sit inside a match", () => {
    const field = normalizeField("body", "ba\u200Bd!");
    expect(field.text).toBe("bad!");
    expect(spansFor(field, 0, 3)).toEqual([{ field: "body", start: 0, end: 4 }]);
  });

  it("maps a fullwidth match onto the fullwidth source characters", () => {
    const field = normalizeField("body", "x ＢＡＤ y");
    expect(field.text).toBe("x bad y");
    expect(spansFor(field, 2, 5)).toEqual([{ field: "body", start: 2, end: 5 }]);
  });

  it("maps a match over combining text onto the whole composed source", () => {
    const raw = "b\u0336a\u0336d\u0336 ok";
    const field = normalizeField("body", raw);
    expect(spansFor(field, 0, 3)).toEqual([{ field: "body", start: 0, end: 6 }]);
  });

  it("reports a match that crosses from the nickname into the body as one span per field", () => {
    const joined = joinMapped(normalizeField("nickname", "xy"), normalizeField("body", "z"));
    expect(joined.text).toBe("xyz");
    expect(spansFor(joined, 1, 3)).toEqual([
      { field: "nickname", start: 1, end: 2 },
      { field: "body", start: 0, end: 1 },
    ]);
  });

  it("maps every UTF-16 unit to itself in the identity copy", () => {
    const field = identityField("body", "a😀b");
    expect(spansFor(field, 1, 3)).toEqual([{ field: "body", start: 1, end: 3 }]);
  });
});

describe("composed combining marks (S006 Q6)", () => {
  it("removes a mark that composes with its base letter by default", () => {
    expect(normalizeText("ba\u0301dword")).toBe("badword");
    expect(normalizeText("b\u00e1dword")).toBe("badword");
  });

  it("keeps the composed letter when stripping is switched off", () => {
    const keep = { stripCombiningMarks: false };
    expect(normalizeText("ba\u0301dword", keep)).toBe("b\u00e1dword");
  });

  it("maps a stripped letter back to the original span, marks included", () => {
    const field = normalizeField("body", "x ba\u0301d");
    expect(field.text).toBe("x bad");
    expect(spansFor(field, 2, 5)).toEqual([{ field: "body", start: 2, end: 6 }]);
  });

  it("keeps Hangul syllables composed after stripping", () => {
    expect(normalizeText("\u1100\u1161\u11a8")).toBe("\uac01");
  });
});

describe("Q6 scope: only the composed diacritics are stripped (S006 B1)", () => {
  it("strips every mark in the combining diacritical blocks", () => {
    const marks = ["\u0300", "\u036F", "\u1AB0", "\u1ACE", "\u1DC0", "\u1DFF", "\u20D0", "\u20F0", "\uFE20", "\uFE2F"];
    for (const mark of marks) {
      expect(normalizeText(`a${mark}`)).toBe("a");
    }
  });

  it("keeps the Japanese sound marks, so voiced kana stay distinct from their base kana", () => {
    expect(normalizeText("ば")).toBe("ば");
    expect(normalizeText("ば")).not.toBe(normalizeText("は"));
    expect(normalizeText("バ")).toBe("バ");
    expect(normalizeText("ぱ")).toBe("ぱ");
    expect(normalizeText("が")).toBe("が");
  });

  it("composes a decomposed kana with its sound mark", () => {
    expect(normalizeText("か\u3099")).toBe("が");
    expect(normalizeText("ハ\u309A")).toBe("パ");
  });

  it("keeps the voiced kana in the matching copy, and its span maps back to the original kana", () => {
    const field = normalizeField("body", "x ば");
    expect(field.text).toBe("x ば");
    expect(spansFor(field, 2, 3)).toEqual([{ field: "body", start: 2, end: 3 }]);
  });

  it("still strips a stray sound mark that does not compose, so a Latin word cannot hide behind it", () => {
    expect(normalizeText("ba\u3099dword")).toBe("badword");
  });
});

/**
 * The reference for the sound-mark cases: remove the characters that never reach the matching copy, then normalize the
 * whole string at once. The unit-by-unit normalization must give the same text for every input in the corpus below.
 */
function wholeStringReference(raw: string, options: NormalizeOptions): string {
  const visible = raw
    .replace(/\p{Cf}|(?=\p{M})\p{Default_Ignorable_Code_Point}/gu, "")
    .replace(/\u309B/gu, DAKUTEN)
    .replace(/\u309C/gu, HANDAKUTEN);
  const composed = options.stripCombiningMarks
    ? visible
        .normalize("NFKD")
        .replace(/[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/gu, "")
        .normalize("NFKC")
    : visible.normalize("NFKC");
  return composed.toLowerCase().replace(/[\p{M}\p{Cf}]/gu, "");
}

function unitsOf(raw: string): Array<[string, number, number]> {
  return splitUnits(raw).map((unit) => [unit.raw, unit.srcStart, unit.srcEnd]);
}

describe("units keep a kana with its sound mark (S006 B3)", () => {
  it("puts a half-width sound mark in the unit of the kana before it", () => {
    expect(unitsOf(BAKA_HALFWIDTH)).toEqual([
      [`ﾊ${HW_DAKUTEN}`, 0, 2],
      ["ｶ", 2, 3],
    ]);
    expect(unitsOf(`ﾎ${HW_HANDAKUTEN}ﾝ`)).toEqual([
      [`ﾎ${HW_HANDAKUTEN}`, 0, 2],
      ["ﾝ", 2, 3],
    ]);
  });

  it("puts a spacing sound mark in the unit of the kana before it", () => {
    expect(unitsOf(`ハ${SPACING_DAKUTEN}カ`)).toEqual([
      [`ハ${SPACING_DAKUTEN}`, 0, 2],
      ["カ", 2, 3],
    ]);
    expect(unitsOf(`ハ${SPACING_HANDAKUTEN}`)).toEqual([[`ハ${SPACING_HANDAKUTEN}`, 0, 2]]);
  });

  it("keeps a format character between a kana and its mark in the same unit", () => {
    expect(unitsOf(`は\u200B${DAKUTEN}か`)).toEqual([
      [`は\u200B${DAKUTEN}`, 0, 3],
      ["か", 3, 4],
    ]);
    expect(unitsOf(`ﾊ\u2060${HW_DAKUTEN}ｶ`)).toEqual([
      [`ﾊ\u2060${HW_DAKUTEN}`, 0, 3],
      ["ｶ", 3, 4],
    ]);
  });

  it("starts a unit of its own for a mark with no character before it", () => {
    expect(unitsOf(`${HW_DAKUTEN}ｶ`)).toEqual([
      [HW_DAKUTEN, 0, 1],
      ["ｶ", 1, 2],
    ]);
  });

  it("does not attach the prolonged sound mark, which is a letter", () => {
    expect(unitsOf("ﾊｰ").map(([raw]) => raw)).toEqual(["ﾊ", "ｰ"]);
  });
});

describe("normalized text of the sound-mark writings (S006 B3)", () => {
  it.each(WORDS)("reads every writing of $word as the word", ({ word, halfwidth }) => {
    for (const writing of writingsOf(word, halfwidth)) {
      expect(normalizeText(writing.text), writing.name).toBe(word);
      expect(normalizeText(writing.text, { stripCombiningMarks: false }), writing.name).toBe(word);
    }
  });

  it("keeps the prolonged sound mark and reads half-width and full-width alike", () => {
    expect(normalizeText(`ﾊ${HW_DAKUTEN}ｰｶ`)).toBe("バーカ");
    expect(normalizeText("ﾊｰｶ")).toBe("ハーカ");
  });

  it("composes a half-width mark with a full-width kana and the reverse", () => {
    expect(normalizeText(`ハ${HW_DAKUTEN}カ`)).toBe("バカ");
    expect(normalizeText(`は${HW_DAKUTEN}か`)).toBe("ばか");
    expect(normalizeText(`ﾊ${DAKUTEN}ｶ`)).toBe("バカ");
    expect(normalizeText(`は${HW_HANDAKUTEN}`)).toBe("ぱ");
  });

  it("voices ｳ and ウ into ヴ, and ワ into ヷ, as NFKC composes them", () => {
    expect(normalizeText(`ｳ${HW_DAKUTEN}`)).toBe("ヴ");
    expect(normalizeText(`ウ${SPACING_DAKUTEN}`)).toBe("ヴ");
    expect(normalizeText(`ﾜ${HW_DAKUTEN}`)).toBe("ヷ");
  });

  it("drops a sound mark that composes with nothing, so a Latin word cannot hide behind it", () => {
    expect(normalizeText(`ba${HW_DAKUTEN}dword`)).toBe("badword");
    expect(normalizeText(`ba${SPACING_DAKUTEN}dword`)).toBe("badword");
    expect(normalizeText(`ba${HW_HANDAKUTEN}dword`)).toBe("badword");
    expect(normalizeText(`ｱ${HW_DAKUTEN}`)).toBe("ア");
  });

  it("leaves the half-width semi-voiced mark of a face alone", () => {
    expect(normalizeText("(ﾟДﾟ)")).toBe("(д)");
  });
});

describe("format characters before composition (S006 B3)", () => {
  // One pass over the code points of this runtime's Unicode version: the format characters, and the marks that are
  // default-ignorable (variation selectors, the combining grapheme joiner and a few more).
  const formatChars: string[] = [];
  const invisibleMarks: string[] = [];
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint += 1) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
    const char = String.fromCodePoint(codePoint);
    if (/^\p{Cf}$/u.test(char)) formatChars.push(char);
    if (/^(?=\p{M})\p{Default_Ignorable_Code_Point}$/u.test(char)) invisibleMarks.push(char);
  }
  const label = (char: string) => `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;

  it("finds the format characters and invisible marks of this Unicode version", () => {
    expect(formatChars).toContain("\u200B");
    expect(formatChars).toContain("\u2060");
    expect(formatChars).toContain("\u00AD");
    expect(invisibleMarks).toContain("\uFE0F");
    expect(invisibleMarks).toContain("\u034F");
  });

  it("composes a kana with its combining mark across any format character", () => {
    for (const formatChar of formatChars) {
      expect(normalizeText(`は${formatChar}${DAKUTEN}か`), label(formatChar)).toBe("ばか");
      expect(normalizeText(`ﾊ${formatChar}${HW_DAKUTEN}ｶ`), label(formatChar)).toBe("バカ");
    }
  });

  it("composes a kana with its combining mark across any invisible mark", () => {
    for (const invisible of invisibleMarks) {
      expect(normalizeText(`は${invisible}${DAKUTEN}か`), label(invisible)).toBe("ばか");
    }
  });

  it("composes Hangul jamo across a format character", () => {
    expect(normalizeText("\u1107\u200B\u1161")).toBe("바");
    expect(normalizeText("\u1107\u1161\u200B\u11A8")).toBe("박");
  });

  it("takes a mark off a Latin letter across a format character, or composes it when stripping is off", () => {
    expect(normalizeText("a\u200B\u0301")).toBe("a");
    expect(normalizeText("a\u200B\u0301", { stripCombiningMarks: false })).toBe("\u00E1");
  });
});

describe("unit-by-unit normalization equals whole-string normalization after the invisible characters go (S006 B3)", () => {
  const bases = ["は", "ハ", "ﾊ", "か", "ｶ", "う", "ウ", "ｳ", "ワ", "ﾜ", "ゝ", "ヽ", "a", "é"];
  const invisibles = ["", "\u200B", "\u2060", "\u00AD", "\u200D", "\uFEFF", "\uFE0F", "\u034F"];
  const marks = [DAKUTEN, HANDAKUTEN, SPACING_DAKUTEN, SPACING_HANDAKUTEN, HW_DAKUTEN, HW_HANDAKUTEN];

  const corpus: string[] = [];
  for (const base of bases) {
    for (const invisible of invisibles) {
      for (const mark of marks) {
        corpus.push(`${base}${invisible}${mark}か`);
        corpus.push(`x${base}${invisible}${mark}${invisible}${mark}ハ`);
      }
    }
  }

  it.each([DEFAULT_NORMALIZE_OPTIONS, { stripCombiningMarks: false }])(
    "agrees on every input of the corpus with %j",
    (options) => {
      const disagreements = corpus.filter((raw) => normalizeText(raw, options) !== wholeStringReference(raw, options));
      expect(disagreements.map((raw) => [...raw].map((char) => char.codePointAt(0)?.toString(16)))).toEqual([]);
    },
  );
});

describe("span mapping of the sound-mark writings (S006 B3)", () => {
  it("maps a half-width voiced kana to the two source characters it was written with", () => {
    const raw = `x ﾊ${HW_DAKUTEN}ｶ y`;
    const field = normalizeField("body", raw);
    expect(field.text).toBe("x バカ y");
    expect(field.units.map((unit) => [unit.start, unit.end, unit.srcStart, unit.srcEnd])).toEqual([
      [0, 1, 0, 1],
      [1, 2, 1, 2],
      [2, 3, 2, 4],
      [3, 4, 4, 5],
      [4, 5, 5, 6],
      [5, 6, 6, 7],
    ]);
    expect(spansFor(field, 2, 4)).toEqual([{ field: "body", start: 2, end: 5 }]);
    expect(spansFor(field, 2, 3)).toEqual([{ field: "body", start: 2, end: 4 }]);
  });

  it("maps a kana with a format character before its mark to the whole run, and not beyond it", () => {
    const raw = `あは\u200B${DAKUTEN}か!`;
    const field = normalizeField("body", raw);
    expect(field.text).toBe("あばか!");
    expect(spansFor(field, 1, 3)).toEqual([{ field: "body", start: 1, end: 5 }]);
    expect(spansFor(field, 0, 1)).toEqual([{ field: "body", start: 0, end: 1 }]);
    expect(spansFor(field, 3, 4)).toEqual([{ field: "body", start: 5, end: 6 }]);
  });

  it("covers the source text with the units, in order and without a gap", () => {
    for (const { word, halfwidth } of WORDS) {
      for (const writing of writingsOf(word, halfwidth)) {
        const field = normalizeField("body", `ー${writing.text}ー`);
        let sourceAt = 0;
        let copyAt = 0;
        for (const unit of field.units) {
          expect(unit.srcStart, writing.name).toBe(sourceAt);
          expect(unit.start, writing.name).toBe(copyAt);
          sourceAt = unit.srcEnd;
          copyAt = unit.end;
        }
        expect(sourceAt, writing.name).toBe(writing.text.length + 2);
        expect(copyAt, writing.name).toBe(field.text.length);
      }
    }
  });

  it("maps a match over a spacing sound mark to the kana and its mark", () => {
    const field = normalizeField("body", `ハ${SPACING_DAKUTEN}カ`);
    expect(field.text).toBe("バカ");
    expect(spansFor(field, 0, 1)).toEqual([{ field: "body", start: 0, end: 2 }]);
    expect(spansFor(field, 0, 2)).toEqual([{ field: "body", start: 0, end: 3 }]);
  });
});
