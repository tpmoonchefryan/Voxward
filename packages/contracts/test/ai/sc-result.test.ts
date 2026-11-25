import { describe, expect, it } from "vitest";
import { SC_BATCH_SCHEMA, SC_ITEM_FIELDS, type SchemaIssue, validateScBatchResult } from "../../src/index.js";

const scItem = {
  itemId: "sc-1",
  verdict: "ALLOW_MEANINGFUL",
  reasonCodes: ["NONE"],
  translatedText: "Hello, thanks for watching.",
  slangNote: "no slang",
  replyCue: "thank the viewer by name",
};

function scIssuesOf(value: unknown): SchemaIssue[] {
  const result = validateScBatchResult(value);
  if (result.ok) throw new Error("expected the value to be rejected");
  return [...result.issues];
}

describe("SC extension schema", () => {
  it("accepts SC items with and without the optional thank-you reading", () => {
    const withReading = { ...scItem, itemId: "sc-2", thankYouReading: "thank-you reading" };
    const result = validateScBatchResult({ items: [scItem, withReading] });
    expect(result).toEqual({
      ok: true,
      schema: { name: "VoxWardScBatchV1", version: 1 },
      value: { items: [scItem, withReading] },
    });
    expect(SC_BATCH_SCHEMA).toEqual({ name: "VoxWardScBatchV1", version: 1 });
  });

  it("requires the translation, the cheat-sheet text and the reply cue", () => {
    const { translatedText: _omitted, ...withoutTranslation } = scItem;
    expect(scIssuesOf({ items: [withoutTranslation] })).toEqual([
      { code: "REQUIRED_MISSING", path: "/items/0/translatedText" },
    ]);
  });

  it("limits each generated text in code points", () => {
    expect(scIssuesOf({ items: [{ ...scItem, translatedText: "a".repeat(301) }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/translatedText" },
    ]);
    expect(scIssuesOf({ items: [{ ...scItem, slangNote: "a".repeat(301) }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/slangNote" },
    ]);
    expect(scIssuesOf({ items: [{ ...scItem, replyCue: "a".repeat(121) }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/replyCue" },
    ]);
    expect(scIssuesOf({ items: [{ ...scItem, thankYouReading: "a".repeat(61) }] })).toEqual([
      { code: "LENGTH_INVALID", path: "/items/0/thankYouReading" },
    ]);
  });

  it("rejects a thank-you reading that is not a string, and extra fields such as a score", () => {
    expect(scIssuesOf({ items: [{ ...scItem, thankYouReading: 3 }] })).toEqual([
      { code: "NOT_STRING", path: "/items/0/thankYouReading" },
    ]);
    expect(scIssuesOf({ items: [{ ...scItem, score: 10 }] })).toEqual([{ code: "FIELD_UNKNOWN", path: "/items/0" }]);
  });

  it("keeps the moderation classification rule for SC items", () => {
    expect(scIssuesOf({ items: [{ ...scItem, verdict: "BLOCK" }] })).toEqual([
      { code: "RULE_CONFLICT", path: "/items/0/reasonCodes" },
    ]);
  });

  it("declares the generated text fields and no score or tool instruction field", () => {
    expect(SC_ITEM_FIELDS).toEqual([
      "itemId",
      "verdict",
      "reasonCodes",
      "matchedSpan",
      "translatedText",
      "slangNote",
      "replyCue",
      "thankYouReading",
      "sourceLanguage",
      "translations",
    ]);
  });

  it("canonicalizes language tags and rejects duplicate targets after canonicalization", () => {
    const { translatedText, slangNote, replyCue, ...base } = scItem;
    const translation = { targetLanguage: "fr-ca", translatedText, slangNote, replyCue };
    const item = { ...base, sourceLanguage: "EN", translations: [translation] };
    expect(validateScBatchResult({ items: [item] })).toMatchObject({
      ok: true,
      value: { items: [{ sourceLanguage: "en", translations: [{ targetLanguage: "fr-CA" }] }] },
    });
    expect(scIssuesOf({ items: [{ ...item, translations: [translation, { ...translation, targetLanguage: "fr-CA" }] }] }))
      .toContainEqual({ code: "DUPLICATE_VALUE", path: "/items/0/translations/1/targetLanguage" });
  });
});
