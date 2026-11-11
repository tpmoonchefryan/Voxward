import { describe, expect, it } from "vitest";
import { createTableTransliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";
import {
  DAKUTEN,
  HW_DAKUTEN,
  HW_HANDAKUTEN,
  SPACING_DAKUTEN,
  SPACING_HANDAKUTEN,
  WORD_JOINER,
  ZERO_WIDTH_SPACE,
} from "./sound-mark-cases.js";

const table = new Map([
  ["甲", "jia"],
  ["乙", "yi"],
]);

describe("table transliterator", () => {
  it("reads tabled characters, keeps ASCII, and drops spaces and punctuation", () => {
    const reading = createTableTransliterator(table).transliterate("body", "甲 乙!ok");
    expect(reading.mapped.text).toBe("jiayiok");
    expect(reading.complete).toBe(true);
  });

  it("maps each reading back to the source character it came from", () => {
    const reading = createTableTransliterator(table).transliterate("body", "甲乙");
    expect(reading.mapped.units).toEqual([
      { start: 0, end: 3, srcStart: 0, srcEnd: 1, field: "body" },
      { start: 3, end: 5, srcStart: 1, srcEnd: 2, field: "body" },
    ]);
  });

  it("is incomplete when a character has no reading, so the partial reading is not trusted", () => {
    const reading = createTableTransliterator(table).transliterate("nickname", "甲丙");
    expect(reading.mapped.text).toBe("jia");
    expect(reading.complete).toBe(false);
  });

  it("refuses table entries whose key is not a normalized character or whose reading is not [a-z0-9]", () => {
    expect(() => createTableTransliterator(new Map([["Ａ", "a"]]))).toThrow(TypeError);
    expect(() => createTableTransliterator(new Map([["甲", "Jia"]]))).toThrow(TypeError);
  });
});

describe("table transliterator with voiced kana (S006 B1)", () => {
  it("accepts a voiced kana as a key and reads がか as gaka", () => {
    const reading = createTableTransliterator(new Map([["が", "ga"], ["か", "ka"]])).transliterate("body", "がか");
    expect(reading.mapped.text).toBe("gaka");
    expect(reading.complete).toBe(true);
  });

  it("does not read a voiced kana through the entry of its base kana", () => {
    const reading = createTableTransliterator(new Map([["か", "ka"]])).transliterate("body", "が");
    expect(reading.mapped.text).toBe("");
    expect(reading.complete).toBe(false);
  });

  it("validates keys with the options it was built with", () => {
    const keep = { stripCombiningMarks: false };
    expect(() => createTableTransliterator(new Map([["é", "e"]]), keep)).not.toThrow();
    expect(() => createTableTransliterator(new Map([["é", "e"]]))).toThrow(TypeError);
  });

  it("reads with the options it was built with", () => {
    const keep = createTableTransliterator(new Map([["é", "e"]]), { stripCombiningMarks: false });
    expect(keep.normalization).toEqual({ stripCombiningMarks: false });
    expect(keep.transliterate("body", "é").mapped.text).toBe("e");
  });
});

describe("table transliterator with half-width and spaced sound marks (S006 B3)", () => {
  const voiced = createTableTransliterator(
    new Map([
      ["ガ", "ga"],
      ["カ", "ka"],
      ["パ", "pa"],
      ["ハ", "ha"],
    ]),
  );

  it.each([
    ["full-width", "ガカ"],
    ["half-width", `ｶ${HW_DAKUTEN}ｶ`],
    ["full-width kana and half-width mark", `カ${HW_DAKUTEN}カ`],
    ["spacing mark", `カ${SPACING_DAKUTEN}カ`],
    ["combining mark", `カ${DAKUTEN}カ`],
    ["zero-width space before the combining mark", `カ${ZERO_WIDTH_SPACE}${DAKUTEN}カ`],
    ["word joiner before the half-width mark", `ｶ${WORD_JOINER}${HW_DAKUTEN}ｶ`],
  ])("reads the %s writing of ガカ as gaka", (_name, text) => {
    const reading = voiced.transliterate("body", text);
    expect(reading.mapped.text).toBe("gaka");
    expect(reading.complete).toBe(true);
  });

  it("maps the reading of a voiced kana back to every source character it was written with", () => {
    const reading = voiced.transliterate("body", `ｶ${ZERO_WIDTH_SPACE}${HW_DAKUTEN}ｶ`);
    expect(reading.mapped.units).toEqual([
      { start: 0, end: 2, srcStart: 0, srcEnd: 3, field: "body" },
      { start: 2, end: 4, srcStart: 3, srcEnd: 4, field: "body" },
    ]);
  });

  it("tells a semi-voiced kana from a voiced one and from the plain one", () => {
    expect(voiced.transliterate("body", `ﾊ${HW_HANDAKUTEN}`).mapped.text).toBe("pa");
    expect(voiced.transliterate("body", `ハ${SPACING_HANDAKUTEN}`).mapped.text).toBe("pa");
    expect(voiced.transliterate("body", `ﾊ${HW_DAKUTEN}`).complete).toBe(false);
    expect(voiced.transliterate("body", "ﾊ").mapped.text).toBe("ha");
  });

  it("does not read a half-width voiced kana through the entry of its base kana", () => {
    const plain = createTableTransliterator(new Map([["カ", "ka"]]));
    const reading = plain.transliterate("body", `ｶ${HW_DAKUTEN}`);
    expect(reading.mapped.text).toBe("");
    expect(reading.complete).toBe(false);
  });

  it("refuses a half-width key, because the key must already be the normalized character", () => {
    expect(() => createTableTransliterator(new Map([[`ｶ${HW_DAKUTEN}`, "ga"]]))).toThrow(TypeError);
    expect(() => createTableTransliterator(new Map([[`カ${DAKUTEN}`, "ga"]]))).toThrow(TypeError);
  });
});
