import { describe, expect, it } from "vitest";
import {
  MODERATION_BATCH_SCHEMA,
  MODERATION_ITEM_FIELDS,
  type SchemaIssue,
  validateModerationBatchResult,
} from "../../src/index.js";

const allowed = { itemId: "item-1", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] };
const blocked = { itemId: "item-2", verdict: "BLOCK", reasonCodes: ["HARASSMENT"], matchedSpan: { start: 0, end: 4 } };

function issuesOf(value: unknown): SchemaIssue[] {
  const result = validateModerationBatchResult(value);
  if (result.ok) throw new Error("expected the value to be rejected");
  return [...result.issues];
}

describe("moderation batch schema, valid input", () => {
  it("accepts one item per classification and names its schema version", () => {
    const noise = { itemId: "item-3", verdict: "ALLOW_NOISE", reasonCodes: ["NOISE"] };
    const result = validateModerationBatchResult({ items: [allowed, blocked, noise] });
    expect(result).toEqual({
      ok: true,
      schema: { name: "VoxWardModerationBatchV1", version: 1 },
      value: { items: [allowed, blocked, noise] },
    });
    expect(MODERATION_BATCH_SCHEMA).toEqual({ name: "VoxWardModerationBatchV1", version: 1 });
  });

  it("accepts a BLOCK with several policy reasons, and an item without a span", () => {
    const result = validateModerationBatchResult({
      items: [{ itemId: "item-4", verdict: "BLOCK", reasonCodes: ["SCAM", "SPAM"] }],
    });
    expect(result.ok).toBe(true);
  });
});

describe("moderation batch schema, structure", () => {
  it("rejects a non-object root, a missing items key and an empty batch", () => {
    expect(issuesOf([allowed])).toEqual([{ code: "NOT_OBJECT", path: "" }]);
    expect(issuesOf({})).toEqual([{ code: "REQUIRED_MISSING", path: "/items" }]);
    expect(issuesOf({ items: [] })).toEqual([{ code: "COUNT_INVALID", path: "/items" }]);
  });

  it("rejects an item that is not an object", () => {
    expect(issuesOf({ items: ["item-1"] })).toEqual([{ code: "NOT_OBJECT", path: "/items/0" }]);
  });

  it("rejects extra fields at the root and in an item, and does not echo their names", () => {
    expect(issuesOf({ items: [allowed], note: "extra" })).toEqual([{ code: "FIELD_UNKNOWN", path: "" }]);
    expect(issuesOf({ items: [{ ...allowed, score: -5 }] })).toEqual([{ code: "FIELD_UNKNOWN", path: "/items/0" }]);
    expect(issuesOf({ items: [{ ...allowed, toolCommand: "rm" }] })).toEqual([
      { code: "FIELD_UNKNOWN", path: "/items/0" },
    ]);
    expect(JSON.stringify(issuesOf({ items: [{ ...allowed, score: -5 }] }))).not.toContain("score");
  });

  it("rejects a missing required field, a wrong type and an unknown enum value", () => {
    expect(issuesOf({ items: [{ verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] }] })).toEqual([
      { code: "REQUIRED_MISSING", path: "/items/0/itemId" },
    ]);
    expect(issuesOf({ items: [{ ...allowed, itemId: 7 }] })).toEqual([{ code: "NOT_STRING", path: "/items/0/itemId" }]);
    expect(issuesOf({ items: [{ ...allowed, verdict: "MAYBE" }] })).toEqual([
      { code: "ENUM_INVALID", path: "/items/0/verdict" },
    ]);
    expect(issuesOf({ items: [{ ...allowed, reasonCodes: ["SOMETHING"] }] })).toEqual([
      { code: "ENUM_INVALID", path: "/items/0/reasonCodes" },
    ]);
  });
});

describe("moderation batch schema, bounds", () => {
  it("rejects an item id that is empty or longer than 64 code points", () => {
    expect(issuesOf({ items: [{ ...allowed, itemId: "" }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/itemId" },
    ]);
    expect(issuesOf({ items: [{ ...allowed, itemId: "x".repeat(65) }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/itemId" },
    ]);
  });

  it("counts an item id in code points, so 64 emoji are accepted and 65 are not", () => {
    expect(validateModerationBatchResult({ items: [{ ...allowed, itemId: "😀".repeat(64) }] }).ok).toBe(true);
    expect(issuesOf({ items: [{ ...allowed, itemId: "😀".repeat(65) }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/itemId" },
    ]);
  });

  it("rejects a span that is empty, reversed, negative or fractional", () => {
    expect(issuesOf({ items: [{ ...blocked, matchedSpan: { start: 3, end: 3 } }] })).toEqual([
      { code: "RANGE_INVALID", path: "/items/0/matchedSpan" },
    ]);
    expect(issuesOf({ items: [{ ...blocked, matchedSpan: { start: -1, end: 2 } }] })).toEqual([
      { code: "RANGE_INVALID", path: "/items/0/matchedSpan/start" },
    ]);
    expect(issuesOf({ items: [{ ...blocked, matchedSpan: { start: 0, end: 1.5 } }] })).toEqual([
      { code: "NOT_INTEGER", path: "/items/0/matchedSpan/end" },
    ]);
  });

  it("rejects extra fields inside a span", () => {
    expect(issuesOf({ items: [{ ...blocked, matchedSpan: { start: 0, end: 2, extra: 1 } }] })).toEqual([
      { code: "FIELD_UNKNOWN", path: "/items/0/matchedSpan" },
    ]);
  });

  it("requires between one and the maximum number of reason codes, with no repeats", () => {
    expect(issuesOf({ items: [{ ...allowed, reasonCodes: [] }] })).toEqual([
      { code: "COUNT_INVALID", path: "/items/0/reasonCodes" },
    ]);
    expect(issuesOf({ items: [{ itemId: "b", verdict: "BLOCK", reasonCodes: ["HATE", "HATE"] }] })).toEqual([
      { code: "DUPLICATE_VALUE", path: "/items/0/reasonCodes" },
    ]);
  });
});

describe("moderation batch schema, classification and reasons", () => {
  it("keeps each classification to its own reason codes", () => {
    const conflict = [{ code: "RULE_CONFLICT", path: "/items/0/reasonCodes" }];
    // ALLOW_MEANINGFUL carries only NONE.
    expect(issuesOf({ items: [{ ...allowed, reasonCodes: ["SPAM"] }] })).toEqual(conflict);
    // ALLOW_NOISE carries only NOISE.
    expect(issuesOf({ items: [{ itemId: "n", verdict: "ALLOW_NOISE", reasonCodes: ["NONE"] }] })).toEqual(conflict);
    // BLOCK cannot be justified by NONE alone, nor combined with NOISE.
    expect(issuesOf({ items: [{ itemId: "b", verdict: "BLOCK", reasonCodes: ["NONE"] }] })).toEqual(conflict);
    expect(issuesOf({ items: [{ itemId: "b", verdict: "BLOCK", reasonCodes: ["NOISE", "SPAM"] }] })).toEqual(conflict);
  });

  it("accepts BLOCK with a policy reason", () => {
    expect(validateModerationBatchResult({ items: [{ itemId: "b", verdict: "BLOCK", reasonCodes: ["SPAM"] }] }).ok).toBe(
      true,
    );
  });
});

describe("moderation batch field set", () => {
  it("declares only the identifier, classification, reasons and span", () => {
    expect(MODERATION_ITEM_FIELDS).toEqual(["itemId", "verdict", "reasonCodes", "matchedSpan"]);
  });

  it("declares no model score and no tool instruction field", () => {
    for (const forbidden of ["score", "delta", "tool", "command", "instruction"]) {
      expect(MODERATION_ITEM_FIELDS.some((field) => field.toLowerCase().includes(forbidden))).toBe(false);
    }
  });
});
