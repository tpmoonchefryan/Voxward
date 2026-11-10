import {
  MODERATION_ITEM_FIELDS,
  type ModerationItemResult,
  readModerationItemBase,
} from "./moderation-result.js";
import { checkKnownKeys, type AiSchemaRef, readItemsEnvelope, readString, type SchemaResult } from "./validation.js";

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
