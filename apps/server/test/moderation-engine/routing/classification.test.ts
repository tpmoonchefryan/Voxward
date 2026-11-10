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
