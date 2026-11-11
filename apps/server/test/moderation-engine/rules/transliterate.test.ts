import { describe, expect, it } from "vitest";
import { createTableTransliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";

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
