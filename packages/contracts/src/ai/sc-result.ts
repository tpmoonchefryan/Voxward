import {
  MODERATION_ITEM_FIELDS,
  type ModerationItemResult,
  readModerationItemBase,
} from "./moderation-result.js";
import { canonicalLanguageTag, SC_MAX_TARGET_LANGUAGES } from "./sc-languages.js";
import {
  checkKnownKeys,
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
  "sourceLanguage",
  "translations",
] as const;

export interface ScTranslationText {
  readonly translatedText: string;
  readonly slangNote: string;
  readonly replyCue: string;
  /** Optional reading of the thank-you phrase. */
  readonly thankYouReading?: string;
}

export interface LocalizedScTranslation extends ScTranslationText {
  readonly targetLanguage: string;
}

export interface ScItemResult extends ModerationItemResult, ScTranslationText {
  readonly sourceLanguage?: string;
  readonly translations?: readonly LocalizedScTranslation[];
}

export interface ScBatchResult {
  readonly items: readonly ScItemResult[];
}

export function validateScBatchResult(value: unknown): SchemaResult<ScBatchResult> {
  return readItemsEnvelope(value, SC_BATCH_SCHEMA, (record, path, issues): ScItemResult | undefined => {
    checkKnownKeys(record, SC_ITEM_FIELDS, path, issues);
    const base = readModerationItemBase(record, path, issues);
    if (record.translations !== undefined) {
      if (TEXT_FIELDS.some((key) => key in record)) issues.push({ code: "RULE_CONFLICT", path });
      const sourceLanguage = readLanguage(record.sourceLanguage, `${path}/sourceLanguage`, issues, true);
      const values = readArray(record, "translations", path, { min: 0, max: SC_MAX_TARGET_LANGUAGES }, issues);
      const translations: LocalizedScTranslation[] = [];
      for (const [index, value] of (values ?? []).entries()) {
        const entryPath = `${path}/translations/${index}`;
        const entry = readObject(value, entryPath, issues);
        if (entry === undefined) continue;
        checkKnownKeys(entry, ["targetLanguage", ...TEXT_FIELDS], entryPath, issues);
        const targetLanguage = readLanguage(entry.targetLanguage, `${entryPath}/targetLanguage`, issues, false);
        const text = readTranslationText(entry, entryPath, issues);
        if (targetLanguage === undefined || text === undefined) continue;
        if (translations.some((translation) => translation.targetLanguage === targetLanguage)) {
          issues.push({ code: "DUPLICATE_VALUE", path: `${entryPath}/targetLanguage` });
          continue;
        }
        translations.push({ targetLanguage, ...text });
      }
      if (base === undefined || sourceLanguage === undefined || values === undefined) return undefined;
      if (base.verdict === "BLOCK" && values.length > 0) issues.push({ code: "RULE_CONFLICT", path: `${path}/translations` });
      const primary = translations[0];
      const text: ScTranslationText = primary === undefined ? { translatedText: "", slangNote: "", replyCue: "" } : {
        translatedText: primary.translatedText,
        slangNote: primary.slangNote,
        replyCue: primary.replyCue,
        ...(primary.thankYouReading === undefined ? {} : { thankYouReading: primary.thankYouReading }),
      };
      return { ...base, ...text, sourceLanguage, translations };
    }
    if (record.sourceLanguage !== undefined) issues.push({ code: "RULE_CONFLICT", path: `${path}/sourceLanguage` });
    const text = readTranslationText(record, path, issues);
    return base === undefined || text === undefined ? undefined : { ...base, ...text };
  });
}

const TEXT_FIELDS = ["translatedText", "slangNote", "replyCue", "thankYouReading"] as const;

function readTranslationText(record: Readonly<Record<string, unknown>>, path: string, issues: SchemaIssue[]): ScTranslationText | undefined {
  const translatedText = readString(record, "translatedText", path, { min: 0, max: SC_TRANSLATED_TEXT_MAX_LENGTH }, issues);
  const slangNote = readString(record, "slangNote", path, { min: 0, max: SC_SLANG_NOTE_MAX_LENGTH }, issues);
  const replyCue = readString(record, "replyCue", path, { min: 0, max: SC_REPLY_CUE_MAX_LENGTH }, issues);
  const thankYouReading = record.thankYouReading === undefined
    ? undefined
    : readString(record, "thankYouReading", path, { min: 0, max: SC_THANK_YOU_READING_MAX_LENGTH }, issues);
  if (translatedText === undefined || slangNote === undefined || replyCue === undefined) return undefined;
  return { translatedText, slangNote, replyCue, ...(thankYouReading === undefined ? {} : { thankYouReading }) };
}

function readLanguage(value: unknown, path: string, issues: SchemaIssue[], allowUndetermined: boolean): string | undefined {
  const tag = canonicalLanguageTag(value);
  if (tag === null || tag === "auto" || (!allowUndetermined && tag === "und")) {
    issues.push({ code: "ENUM_INVALID", path });
    return undefined;
  }
  return tag;
}
