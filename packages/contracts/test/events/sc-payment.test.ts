import { describe, expect, it } from "vitest";
import { readScPayment, resolveScTierFromPayment } from "../../src/index.js";

describe("ScPayment & tier resolution", () => {
  it("validates structured ScPayment payloads strictly", () => {
    expect(readScPayment({ amountMicros: 5_000_000, currency: "USD", amountDisplay: "$5.00", tier: 3 })).toEqual({
      amountMicros: 5_000_000,
      currency: "USD",
      amountDisplay: "$5.00",
      tier: 3,
    });
    expect(readScPayment({ amountMicros: -1, currency: "USD" })).toBeNull();
    expect(readScPayment({ amountMicros: 1000, currency: "usd" })).toBeNull();
    expect(readScPayment({ amountMicros: 1000, currency: "USD", tier: 9 })).toBeNull();
  });

  it("resolves known tiers from structured fields and returns null for unknown currencies without guessing", () => {
    expect(resolveScTierFromPayment({ amountMicros: 100_000_000, currency: "USD", amountDisplay: "$100.00" })).toBe("t7");
    expect(resolveScTierFromPayment({ amountMicros: 1_500_000_000, currency: "JPY", amountDisplay: "¥1,500" })).toBe("t4");
    expect(resolveScTierFromPayment({ amountMicros: 25_000_000, currency: "XYZ", amountDisplay: "25 XYZ" })).toBeNull();
    expect(resolveScTierFromPayment({ amountMicros: 25_000_000, currency: "XYZ", amountDisplay: "25 XYZ", tier: 5 })).toBe("t5");
  });
});
