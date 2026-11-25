import { canonicalizeContentLanguage, SC_MAX_TARGET_LANGUAGES } from "./languages.js";
import {
  MODERATION_ITEM_FIELDS,
  type ModerationItemResult,
  readModerationItemBase,
} from "./moderation-result.js";
import {
  checkKnownKeys,
  childPath,
  type AiSchemaRef,
  readArray,
  readItemsEnvelope,
  readObject,
  readString,
  type SchemaIssue,
  type SchemaResult,
} from "./validation.js";

/** Versioned SC extension: the moderation fields plus refined translation and the cheat-sheet text (section 8.3). */
export const SC_BATCH_SCHEMA: AiSchemaRef = { name: "VoxWardScBatchV1", version: 1 };

/** Length limits in Unicode code points. The proposal names no numbers, so these are this package's own choice. */
export const SC_TRANSLATED_TEXT_MAX_LENGTH = 300;
export const SC_SLANG_NOTE_MAX_LENGTH = 300;
export const SC_REPLY_CUE_MAX_LENGTH = 120;
export const SC_THANK_YOU_READING_MAX_LENGTH = 60;

export const SC_ITEM_FIELDS = [
  ...MODERATION_ITEM_FIELDS,
  "translatedText",
  "slangNote",
  "replyCue",
  "thankYouReading",
] as const;

export interface ScItemResult extends ModerationItemResult {
  readonly translatedText: string;
  readonly slangNote: string;
  readonly replyCue: string;
  /** Optional reading of the thank-you phrase. */
  readonly thankYouReading?: string;
}

export interface ScBatchResult {
  readonly items: readonly ScItemResult[];
}

export function validateScBatchResult(value: unknown): SchemaResult<ScBatchResult> {
  return readItemsEnvelope(value, SC_BATCH_SCHEMA, (record, path, issues): ScItemResult | undefined => {
    checkKnownKeys(record, SC_ITEM_FIELDS, path, issues);
    const base = readModerationItemBase(record, path, issues);
    const translatedText = readString(
      record,
      "translatedText",
      path,
      { min: 0, max: SC_TRANSLATED_TEXT_MAX_LENGTH },
      issues,
    );
    const slangNote = readString(record, "slangNote", path, { min: 0, max: SC_SLANG_NOTE_MAX_LENGTH }, issues);
    const replyCue = readString(record, "replyCue", path, { min: 0, max: SC_REPLY_CUE_MAX_LENGTH }, issues);
    const thankYouPresent = record.thankYouReading !== undefined;
    const thankYouReading = thankYouPresent
      ? readString(record, "thankYouReading", path, { min: 0, max: SC_THANK_YOU_READING_MAX_LENGTH }, issues)
      : undefined;
    if (base === undefined || translatedText === undefined || slangNote === undefined || replyCue === undefined) {
      return undefined;
    }
    if (thankYouPresent && thankYouReading === undefined) return undefined;
    const item: ScItemResult = { ...base, translatedText, slangNote, replyCue };
    return thankYouReading === undefined ? item : { ...item, thankYouReading };
  });
}

/** Versioned multilingual SC extension: per-target-language translations & source language (PR C). */
export const SC_MULTILINGUAL_BATCH_SCHEMA: AiSchemaRef = { name: "VoxWardScBatchV2", version: 2 };

export const SC_MULTILINGUAL_ITEM_FIELDS = [
  ...MODERATION_ITEM_FIELDS,
  "sourceLanguage",
  "translations",
] as const;

const SC_TRANSLATION_ENTRY_FIELDS = [
  "language",
  "translatedText",
  "slangNote",
  "replyCue",
  "thankYouReading",
] as const;

export interface ScTranslationEntry {
  readonly language: string;
  readonly translatedText: string;
  readonly slangNote: string;
  readonly replyCue: string;
  readonly thankYouReading?: string;
}

export interface ScMultilingualItemResult extends ModerationItemResult {
  readonly sourceLanguage: string;
  readonly translations: readonly ScTranslationEntry[];
}

export interface ScMultilingualBatchResult {
  readonly items: readonly ScMultilingualItemResult[];
}

function readTranslationEntry(
  value: unknown,
  path: string,
  issues: SchemaIssue[],
): ScTranslationEntry | undefined {
  const record = readObject(value, path, issues);
  if (record === undefined) return undefined;
  checkKnownKeys(record, SC_TRANSLATION_ENTRY_FIELDS, path, issues);
  const rawLang = readString(record, "language", path, { min: 1, max: 35 }, issues);
  const language = rawLang === undefined ? undefined : canonicalizeContentLanguage(rawLang) ?? undefined;
  if (rawLang !== undefined && language === undefined) {
    issues.push({ code: "ENUM_INVALID", path: childPath(path, "language") });
  }
  const translatedText = readString(
    record,
    "translatedText",
    path,
    { min: 0, max: SC_TRANSLATED_TEXT_MAX_LENGTH },
    issues,
  );
  const slangNote = readString(record, "slangNote", path, { min: 0, max: SC_SLANG_NOTE_MAX_LENGTH }, issues);
  const replyCue = readString(record, "replyCue", path, { min: 0, max: SC_REPLY_CUE_MAX_LENGTH }, issues);
  const thankYouPresent = record.thankYouReading !== undefined;
  const thankYouReading = thankYouPresent
    ? readString(record, "thankYouReading", path, { min: 0, max: SC_THANK_YOU_READING_MAX_LENGTH }, issues)
    : undefined;
  if (language === undefined || translatedText === undefined || slangNote === undefined || replyCue === undefined) {
    return undefined;
  }
  if (thankYouPresent && thankYouReading === undefined) return undefined;
  return {
    language,
    translatedText,
    slangNote,
    replyCue,
    ...(thankYouReading === undefined ? {} : { thankYouReading }),
  };
}

export function validateScMultilingualBatchResult(value: unknown): SchemaResult<ScMultilingualBatchResult> {
  return readItemsEnvelope(
    value,
    SC_MULTILINGUAL_BATCH_SCHEMA,
    (record, path, issues): ScMultilingualItemResult | undefined => {
      checkKnownKeys(record, SC_MULTILINGUAL_ITEM_FIELDS, path, issues);
      const base = readModerationItemBase(record, path, issues);
      const rawSourceLang = readString(record, "sourceLanguage", path, { min: 1, max: 35 }, issues);
      const sourceLanguage =
        rawSourceLang === undefined ? undefined : canonicalizeContentLanguage(rawSourceLang) ?? undefined;
      if (rawSourceLang !== undefined && sourceLanguage === undefined) {
        issues.push({ code: "ENUM_INVALID", path: childPath(path, "sourceLanguage") });
      }
      const entries = readArray(
        record,
        "translations",
        path,
        { min: 0, max: SC_MAX_TARGET_LANGUAGES },
        issues,
      );
      if (base === undefined || sourceLanguage === undefined || entries === undefined) return undefined;
      const translationsPath = childPath(path, "translations");
      const translations: ScTranslationEntry[] = [];
      const seenLanguages = new Set<string>();
      for (const [idx, entry] of entries.entries()) {
        const entryPath = childPath(translationsPath, idx);
        const parsed = readTranslationEntry(entry, entryPath, issues);
        if (parsed === undefined) continue;
        if (seenLanguages.has(parsed.language)) {
          issues.push({ code: "DUPLICATE_VALUE", path: childPath(entryPath, "language") });
          continue;
        }
        seenLanguages.add(parsed.language);
        translations.push(parsed);
      }
      if (issues.length > 0) return undefined;
      return { ...base, sourceLanguage, translations };
    },
  );
}
