import { describe, expect, it } from "vitest";
import { classifyDeterministicNoise } from "../../../src/modules/moderation-engine/routing/classification.js";

describe("deterministic noise classification (S006 design 4.4)", () => {
  it.each([
    "www",
    "WWW",
    "\uff57\uff57\uff57",
    "w\u200bw\u200bw",
    "66666",
    "\u54c8\u54c8\u54c8\u54c8",
    "\ud83d\ude02",
    "www \ud83d\ude02\ud83d\ude02",
    "\ud83d\udc4d\ud83c\udffd\ud83d\udc4d\ud83c\udffd\ud83d\udc4d\ud83c\udffd",
    "666 666",
  ])("classifies %j as NOISE", (body) => {
    expect(classifyDeterministicNoise(body)).toBe("NOISE");
  });

  it.each(["", "   ", "w", "ww", "nice", "666 nice", "www!!", "good game", "a\ud83d\ude02", "\u54c8\u54c8 \u597d"])(
    "keeps %j UNCERTAIN, so it goes to review",
    (body) => {
      expect(classifyDeterministicNoise(body)).toBe("UNCERTAIN");
    },
  );
});

describe("noise classification keeps the sound marks of kana (S006 B3)", () => {
  it.each([
    ["the same voiced kana three times", "ﾊ\uFF9Eﾊ\uFF9Eﾊ\uFF9E", "NOISE"],
    ["the same voiced kana three times with spacing marks", "ハ\u309Bハ\u309Bハ\u309B", "NOISE"],
    ["voiced, semi-voiced and plain ハ", "ﾊ\uFF9Eﾊ\uFF9Fﾊ", "UNCERTAIN"],
    ["voiced and semi-voiced ハ, then voiced again", "ﾊ\uFF9Eﾊ\uFF9Fﾊ\uFF9E", "UNCERTAIN"],
    ["a kana and its voiced twin, half-width", "ｶｶ\uFF9Eｶ", "UNCERTAIN"],
  ])("classifies %s as %s", (_name, body, expected) => {
    expect(classifyDeterministicNoise(body)).toBe(expected);
  });
});
