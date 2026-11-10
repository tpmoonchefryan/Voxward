import { describe, expect, it } from "vitest";
import { type SchemaIssue, validateReviewBatchResult } from "../../src/index.js";

const reviewItem = {
  itemId: "review-1",
  verdict: "BLOCK",
  reasonCodes: ["HATE"],
  candidateTerms: [{ term: "newterm", note: "seen twice in the batch" }],
};

function reviewIssuesOf(value: unknown): SchemaIssue[] {
  const result = validateReviewBatchResult(value);
  if (result.ok) throw new Error("expected the value to be rejected");
  return [...result.issues];
}

describe("review extension schema", () => {
  it("accepts candidate terms with and without a note, and an empty list", () => {
    const withBare = { ...reviewItem, itemId: "review-2", candidateTerms: [{ term: "bare" }] };
    const withNone = { ...reviewItem, itemId: "review-3", candidateTerms: [] };
    const result = validateReviewBatchResult({ items: [reviewItem, withBare, withNone] });
    expect(result).toEqual({
      ok: true,
      schema: { name: "VoxWardReviewBatchV1", version: 1 },
      value: { items: [reviewItem, withBare, withNone] },
    });
  });

  it("requires the candidate term list", () => {
    const { candidateTerms: _omitted, ...withoutTerms } = reviewItem;
    expect(reviewIssuesOf({ items: [withoutTerms] })).toEqual([
      { code: "REQUIRED_MISSING", path: "/items/0/candidateTerms" },
    ]);
  });

  it("bounds the number, length and fields of candidate terms", () => {
    const six = Array.from({ length: 6 }, (_, index) => ({ term: `term-${index}` }));
    expect(reviewIssuesOf({ items: [{ ...reviewItem, candidateTerms: six }] })).toEqual([
      { code: "COUNT_INVALID", path: "/items/0/candidateTerms" },
    ]);
    expect(reviewIssuesOf({ items: [{ ...reviewItem, candidateTerms: [{ term: "" }] }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/candidateTerms/0/term" },
    ]);
    expect(reviewIssuesOf({ items: [{ ...reviewItem, candidateTerms: [{ term: "x".repeat(65) }] }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/candidateTerms/0/term" },
    ]);
    expect(
      reviewIssuesOf({ items: [{ ...reviewItem, candidateTerms: [{ term: "ok", note: "x".repeat(201) }] }] }),
    ).toEqual([{ code: "LENGTH_INVALID", path: "/items/0/candidateTerms/0/note" }]);
    expect(reviewIssuesOf({ items: [{ ...reviewItem, candidateTerms: [{ term: "ok", weight: 2 }] }] })).toEqual([
      { code: "FIELD_UNKNOWN", path: "/items/0/candidateTerms/0" },
    ]);
  });
});
