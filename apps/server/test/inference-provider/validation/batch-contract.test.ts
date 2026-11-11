import type { AiBatchInput } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  type AiBatchValidation,
  type BatchValidationError,
  validateModerationBatch,
  validateReviewBatch,
  validateScBatch,
} from "../../../src/modules/inference-provider/index.js";
import { EXPLICIT_RULES, ruleEngineTextChecker } from "./rule-engine-port.js";

const options = { maxItems: 10 };

// Synthetic input. "😀😀a" is 3 code points but 5 UTF-16 units.
const input: AiBatchInput = {
  items: [
    { itemId: "b-1", text: "hello" },
    { itemId: "b-2", text: "😀😀a" },
  ],
};

const allowedItem = { itemId: "b-1", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] };
const blockedItem = { itemId: "b-2", verdict: "BLOCK", reasonCodes: ["HARASSMENT"], matchedSpan: { start: 0, end: 2 } };
const validOutput = { items: [allowedItem, blockedItem] };

function errorsOf<Item>(result: AiBatchValidation<Item>): BatchValidationError[] {
  if (result.ok) throw new Error("expected the batch to be rejected");
  return [...result.errors];
}

describe("batch completeness and identifiers", () => {
  it("accepts a complete batch and returns its items in output order", async () => {
    const result = await validateModerationBatch(validOutput, input, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.map((item) => item.itemId)).toEqual(["b-1", "b-2"]);
    expect(result.schema).toEqual({ name: "VoxWardModerationBatchV1", version: 1 });
  });

  it("rejects a batch that is missing an item and names the missing id", async () => {
    expect(errorsOf(await validateModerationBatch({ items: [allowedItem] }, input, options))).toEqual([
      { code: "ITEM_RESULT_MISSING", path: "/items", itemId: "b-2" },
    ]);
  });

  it("rejects a repeated id at its second occurrence", async () => {
    const output = { items: [allowedItem, { ...blockedItem, itemId: "b-1" }] };
    expect(errorsOf(await validateModerationBatch(output, input, options))).toEqual([
      { code: "ITEM_ID_DUPLICATE", path: "/items/1/itemId", itemId: "b-1" },
      { code: "ITEM_RESULT_MISSING", path: "/items", itemId: "b-2" },
    ]);
  });

  it("rejects an id the batch never issued, and does not echo it", async () => {
    const result = await validateModerationBatch(
      { items: [allowedItem, { ...blockedItem, itemId: "zz-unknown-id" }] },
      input,
      options,
    );
    expect(errorsOf(result)).toEqual([
      { code: "ITEM_ID_UNKNOWN", path: "/items/1/itemId" },
      { code: "ITEM_RESULT_MISSING", path: "/items", itemId: "b-2" },
    ]);
    expect(JSON.stringify(result)).not.toContain("zz-unknown-id");
  });

  it("rejects a batch above the configured limit and an empty batch", async () => {
    expect(errorsOf(await validateModerationBatch(validOutput, input, { maxItems: 1 }))).toEqual([
      { code: "BATCH_TOO_LARGE", path: "/items" },
    ]);
    expect(errorsOf(await validateModerationBatch(validOutput, { items: [] }, options))).toEqual([
      { code: "BATCH_EMPTY", path: "/items" },
    ]);
  });

  it("rejects a repeated id in the request, because the server built the request", async () => {
    const duplicated: AiBatchInput = {
      items: [
        { itemId: "b-1", text: "first" },
        { itemId: "b-1", text: "second" },
      ],
    };
    expect(errorsOf(await validateModerationBatch(validOutput, duplicated, options))).toEqual([
      { code: "INPUT_ITEM_ID_DUPLICATE", path: "/items/1/itemId", itemId: "b-1" },
    ]);
  });
});

describe("spans in Unicode code points", () => {
  it("accepts a span that ends at the last code point", async () => {
    const output = { items: [allowedItem, { ...blockedItem, matchedSpan: { start: 0, end: 3 } }] };
    expect((await validateModerationBatch(output, input, options)).ok).toBe(true);
  });

  it("accepts a span on the final character", async () => {
    const output = { items: [allowedItem, { ...blockedItem, matchedSpan: { start: 2, end: 3 } }] };
    expect((await validateModerationBatch(output, input, options)).ok).toBe(true);
  });

  it("rejects a span past the last code point, though it fits the 5 UTF-16 units", async () => {
    const output = { items: [allowedItem, { ...blockedItem, matchedSpan: { start: 0, end: 4 } }] };
    expect(errorsOf(await validateModerationBatch(output, input, options))).toEqual([
      { code: "SPAN_OUT_OF_RANGE", path: "/items/1/matchedSpan", itemId: "b-2" },
    ]);
  });
});

describe("structure and classification", () => {
  it("rejects a schema violation and locates it by item id", async () => {
    const output = { items: [{ ...allowedItem, score: 9 }, blockedItem] };
    expect(errorsOf(await validateModerationBatch(output, input, options))).toEqual([
      { code: "FIELD_UNKNOWN", path: "/items/0", itemId: "b-1" },
    ]);
  });

  it("rejects a classification that disagrees with its reason", async () => {
    const output = { items: [{ ...allowedItem, reasonCodes: ["SPAM"] }, blockedItem] };
    expect(errorsOf(await validateModerationBatch(output, input, options))).toEqual([
      { code: "RULE_CONFLICT", path: "/items/0/reasonCodes", itemId: "b-1" },
    ]);
  });

  it("fails the whole batch when one item is bad, and returns no items", async () => {
    const result = await validateModerationBatch({ items: [{ ...allowedItem, score: 9 }, blockedItem] }, input, options);
    expect(result.ok).toBe(false);
    expect("items" in result).toBe(false);
  });
});

describe("generated text in SC batches", () => {
  const sc1 = {
    itemId: "b-1",
    verdict: "ALLOW_MEANINGFUL",
    reasonCodes: ["NONE"],
    translatedText: "Hello there",
    slangNote: "greeting",
    replyCue: "say hi back",
  };
  const sc2 = {
    itemId: "b-2",
    verdict: "BLOCK",
    reasonCodes: ["HARASSMENT"],
    matchedSpan: { start: 0, end: 2 },
    translatedText: "",
    slangNote: "",
    replyCue: "",
  };
  const checked = { maxItems: 10, generatedText: ruleEngineTextChecker(EXPLICIT_RULES) };

  it("accepts SC output whose generated text the rule engine passes", async () => {
    expect(await validateScBatch({ items: [sc1, sc2] }, input, checked)).toMatchObject({
      ok: true,
      rejectedGeneratedText: [],
    });
  });

  it("keeps the batch ok when a translation is flagged, and names only that item and field (Q23)", async () => {
    const result = await validateScBatch({ items: [{ ...sc1, translatedText: "a badword here" }, sc2] }, input, checked);
    expect(result).toMatchObject({
      ok: true,
      rejectedGeneratedText: [{ itemId: "b-1", field: "translatedText" }],
    });
    // The items still carry the generated text, so the caller must withhold the flagged item's cue. The rejection record
    // itself never carries the text.
    if (!result.ok) return;
    expect(JSON.stringify(result.rejectedGeneratedText)).not.toContain("badword");
  });

  it("names a flagged thank-you reading the same way when it is present", async () => {
    const result = await validateScBatch({ items: [{ ...sc1, thankYouReading: "a badword" }, sc2] }, input, checked);
    expect(result).toMatchObject({ ok: true, rejectedGeneratedText: [{ itemId: "b-1", field: "thankYouReading" }] });
  });

  it("does not check a BLOCK item's generated text, so a flagged translation on it changes nothing (Q23)", async () => {
    const result = await validateScBatch({ items: [sc1, { ...sc2, translatedText: "a badword here" }] }, input, checked);
    expect(result).toMatchObject({ ok: true, rejectedGeneratedText: [] });
  });

  it("still fails the whole batch for a structural error, even when another translation is flagged", async () => {
    const result = await validateScBatch(
      { items: [{ ...sc1, translatedText: "a badword here", score: 9 }, sc2] },
      input,
      checked,
    );
    expect(errorsOf(result)).toEqual([{ code: "FIELD_UNKNOWN", path: "/items/0", itemId: "b-1" }]);
  });

  it("fails closed when the rule engine has no rule set", async () => {
    const result = await validateScBatch(
      { items: [sc1, sc2] },
      input,
      { maxItems: 10, generatedText: ruleEngineTextChecker(undefined) },
    );
    expect(errorsOf(result)).toEqual([
      { code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/translatedText", itemId: "b-1" },
      { code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/slangNote", itemId: "b-1" },
      { code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/replyCue", itemId: "b-1" },
    ]);
  });

  it("fails closed when no checker is bound", async () => {
    const firstOnly: AiBatchInput = { items: [{ itemId: "b-1", text: "hello" }] };
    expect(errorsOf(await validateScBatch({ items: [sc1] }, firstOnly, { maxItems: 10 }))).toEqual([
      { code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/translatedText", itemId: "b-1" },
      { code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/slangNote", itemId: "b-1" },
      { code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/replyCue", itemId: "b-1" },
    ]);
  });

  it("treats text above the rule engine's input limit as unverified", async () => {
    // 260 code points pass the schema bound of 300, but 520 UTF-16 units exceed the engine's 500-unit body limit.
    const long = { ...sc1, translatedText: "😀".repeat(260) };
    expect(errorsOf(await validateScBatch({ items: [long, sc2] }, input, checked))).toEqual([
      { code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/translatedText", itemId: "b-1" },
    ]);
  });
});

describe("review batches", () => {
  it("does not run the generated text check on candidate terms", async () => {
    const output = {
      items: [
        { itemId: "b-1", verdict: "BLOCK", reasonCodes: ["HATE"], candidateTerms: [{ term: "badword", note: "seen once" }] },
        { itemId: "b-2", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], candidateTerms: [] },
      ],
    };
    const alwaysRejects = { check: async () => "REJECTED" as const };
    expect((await validateReviewBatch(output, input, { maxItems: 10, generatedText: alwaysRejects })).ok).toBe(true);
  });
});

describe("bounded output and error list (Q24)", () => {
  it("rejects an answer with more items than the batch sent, before any item is checked", async () => {
    const extra = { itemId: "b-3", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] };
    const result = await validateModerationBatch({ items: [allowedItem, blockedItem, extra] }, input, options);
    expect(errorsOf(result)).toEqual([{ code: "OUTPUT_TOO_MANY_ITEMS", path: "/items" }]);
  });

  it("accepts an item id of 64 code points and rejects an empty one or one of 65", async () => {
    // Each emoji is one code point but two UTF-16 units, so the limit is checked in code points.
    const atLimit = "😀".repeat(64);
    const overLimit = "😀".repeat(65);
    const atLimitInput: AiBatchInput = { items: [{ itemId: atLimit, text: "hello" }] };
    const atLimitOutput = { items: [{ itemId: atLimit, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] }] };
    expect((await validateModerationBatch(atLimitOutput, atLimitInput, options)).ok).toBe(true);

    const overInput: AiBatchInput = { items: [{ itemId: overLimit, text: "hello" }] };
    expect(errorsOf(await validateModerationBatch(atLimitOutput, overInput, options))).toEqual([
      { code: "INPUT_ITEM_ID_LENGTH_INVALID", path: "/items/0/itemId" },
    ]);

    const emptyInput: AiBatchInput = { items: [{ itemId: "", text: "hello" }] };
    expect(errorsOf(await validateModerationBatch(atLimitOutput, emptyInput, options))).toEqual([
      { code: "INPUT_ITEM_ID_LENGTH_INVALID", path: "/items/0/itemId" },
    ]);
  });

  it("caps the error list at 50 entries and ends it with a truncation marker", async () => {
    const big: AiBatchInput = {
      items: Array.from({ length: 60 }, (_, index) => ({ itemId: `n-${index}`, text: "hello" })),
    };
    const output = {
      items: big.items.map((item) => ({ itemId: item.itemId, verdict: "NOPE", reasonCodes: ["NONE"] })),
    };
    const errors = errorsOf(await validateModerationBatch(output, big, { maxItems: 100 }));
    expect(errors).toHaveLength(50);
    expect(errors[0]).toEqual({ code: "ENUM_INVALID", path: "/items/0/verdict", itemId: "n-0" });
    expect(errors[49]).toEqual({ code: "ERRORS_TRUNCATED", path: "/" });
  });

  it("leaves a short error list unmarked", async () => {
    const errors = errorsOf(await validateModerationBatch({ items: [allowedItem] }, input, options));
    expect(errors.some((error) => error.code === "ERRORS_TRUNCATED")).toBe(false);
  });
});
