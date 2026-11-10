import { describe, expect, it } from "vitest";
import { createTableTransliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";

const table = new Map([
  ["沙", "sha"],
  ["比", "bi"],
]);

describe("table transliterator", () => {
  it("reads tabled characters, keeps ASCII, and drops spaces and punctuation", () => {
    const reading = createTableTransliterator(table).transliterate("body", "沙 比!ok");
    expect(reading.mapped.text).toBe("shabiok");
    expect(reading.complete).toBe(true);
  });

  it("maps each reading back to the source character it came from", () => {
    const reading = createTableTransliterator(table).transliterate("body", "沙比");
    expect(reading.mapped.units).toEqual([
      { start: 0, end: 3, srcStart: 0, srcEnd: 1, field: "body" },
      { start: 3, end: 5, srcStart: 1, srcEnd: 2, field: "body" },
    ]);
  });

  it("is incomplete when a character has no reading, so the partial reading is not trusted", () => {
    const reading = createTableTransliterator(table).transliterate("nickname", "沙猫");
    expect(reading.mapped.text).toBe("sha");
    expect(reading.complete).toBe(false);
  });

  it("refuses table entries whose key is not a normalized character or whose reading is not [a-z0-9]", () => {
    expect(() => createTableTransliterator(new Map([["Ａ", "a"]]))).toThrow(TypeError);
    expect(() => createTableTransliterator(new Map([["沙", "Sha"]]))).toThrow(TypeError);
  });
});
