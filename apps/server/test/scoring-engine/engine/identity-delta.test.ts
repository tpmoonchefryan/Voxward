import { describe, expect, it } from "vitest";
import { identityBaseDelta } from "../../../src/modules/scoring-engine/identity-delta.js";

const SCORES = { CHANNEL_OWNER: 50, MODERATOR: 30, PAID_MEMBER: 10, VERIFIED_ACCOUNT: 2, UNKNOWN: 0 };

describe("identityBaseDelta", () => {
  it("gives the difference between the new and the old identity base score", () => {
    expect(identityBaseDelta("UNKNOWN", "PAID_MEMBER", SCORES)).toBe(10);
  });

  it("is negative for a downgrade or an expiry", () => {
    expect(identityBaseDelta("PAID_MEMBER", "UNKNOWN", SCORES)).toBe(-10);
    expect(identityBaseDelta("MODERATOR", "PAID_MEMBER", SCORES)).toBe(-20);
  });

  it("is zero for the same identity, so a re-identification adds nothing", () => {
    expect(identityBaseDelta("PAID_MEMBER", "PAID_MEMBER", SCORES)).toBe(0);
  });
});
