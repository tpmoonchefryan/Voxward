import { IDENTITY_KINDS, SCORE_REASON_CODES } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  IDENTITY_KINDS as DATABASE_IDENTITY_KINDS,
  SCORE_REASON_CODES as DATABASE_REASON_CODES,
} from "../../../src/db/schema/subjects.js";

// The contract and the database schema each list these values. A change in one must reach the other.
describe("contract and database agree on scoring vocabulary", () => {
  it("reason codes match the reason_code CHECK", () => {
    expect([...SCORE_REASON_CODES]).toEqual([...DATABASE_REASON_CODES]);
  });

  it("identity kinds match the identity_kind CHECK", () => {
    expect([...IDENTITY_KINDS]).toEqual([...DATABASE_IDENTITY_KINDS]);
  });
});
