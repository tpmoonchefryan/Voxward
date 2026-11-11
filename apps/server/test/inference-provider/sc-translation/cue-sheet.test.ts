import { describe, expect, it } from "vitest";
import { isShowableAddressText, SAFE_ADDRESS_MAX_LENGTH } from "../../../src/modules/inference-provider/index.js";

describe("showable address text", () => {
  it("accepts a short alias and a Chinese placeholder", () => {
    expect(isShowableAddressText("synthetic-alias")).toBe(true);
    expect(isShowableAddressText("观众")).toBe(true);
  });

  it("counts the limit in code points: exactly the limit is accepted, one more is refused", () => {
    expect(SAFE_ADDRESS_MAX_LENGTH).toBe(40);
    // Each emoji is one code point but two UTF-16 units.
    expect(isShowableAddressText("😀".repeat(40))).toBe(true);
    expect(isShowableAddressText("😀".repeat(41))).toBe(false);
  });

  it("refuses blank text and text with control characters", () => {
    expect(isShowableAddressText("")).toBe(false);
    expect(isShowableAddressText("   ")).toBe(false);
    expect(isShowableAddressText("line\nbreak")).toBe(false);
    expect(isShowableAddressText("tab\there")).toBe(false);
  });
});
