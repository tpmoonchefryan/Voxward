import { describe, expect, it } from "vitest";
import {
  identityField,
  joinMapped,
  normalizeField,
  normalizeText,
  splitUnits,
} from "../../../src/modules/moderation-engine/rules/normalize.js";
import { spansFor } from "../../../src/modules/moderation-engine/rules/span-map.js";

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
