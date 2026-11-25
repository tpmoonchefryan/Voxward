import {
  MODERATION_ITEM_FIELDS,
  type ModerationItemResult,
  readModerationItemBase,
} from "./moderation-result.js";
import { canonicalLanguageTag } from "./sc-languages.js";
import {
  type AiSchemaRef,
  checkKnownKeys,
  childPath,
  readArray,
  readItemsEnvelope,
  readObject,
  readString,
  type SchemaIssue,
  type SchemaResult,
} from "./validation.js";

/** Versioned review extension: the moderation fields plus the candidate terms found in the batch (section 8.3). */
export const REVIEW_BATCH_SCHEMA: AiSchemaRef = { name: "VoxWardReviewBatchV1", version: 1 };

/** Bounds in Unicode code points and counts. The proposal names no numbers, so these are this package's own choice. */
export const REVIEW_CANDIDATE_TERMS_MAX_COUNT = 5;
export const CANDIDATE_TERM_MAX_LENGTH = 64;
export const CANDIDATE_NOTE_MAX_LENGTH = 200;

export const REVIEW_ITEM_FIELDS = [...MODERATION_ITEM_FIELDS, "candidateTerms"] as const;
const CANDIDATE_TERM_FIELDS = ["term", "note", "language"] as const;

/** A word or phrase proposed for the rule set. It waits for a person to confirm it. */
export interface CandidateTerm {
  readonly term: string;
  readonly note?: string;
  readonly language?: string;
}

export interface ReviewItemResult extends ModerationItemResult {
  readonly candidateTerms: readonly CandidateTerm[];
}

export interface ReviewBatchResult {
  readonly items: readonly ReviewItemResult[];
}

function readCandidateTerm(value: unknown, path: string, issues: SchemaIssue[]): CandidateTerm | undefined {
  const record = readObject(value, path, issues);
  if (record === undefined) return undefined;
  checkKnownKeys(record, CANDIDATE_TERM_FIELDS, path, issues);
  const term = readString(record, "term", path, { min: 1, max: CANDIDATE_TERM_MAX_LENGTH }, issues);
  const notePresent = record.note !== undefined;
  const note = notePresent
    ? readString(record, "note", path, { min: 0, max: CANDIDATE_NOTE_MAX_LENGTH }, issues)
    : undefined;
  if (term === undefined || (notePresent && note === undefined)) return undefined;
  const language = canonicalLanguageTag(record.language);
  if (record.language !== undefined && (language === null || language === "auto")) {
    issues.push({ code: "ENUM_INVALID", path: childPath(path, "language") });
    return undefined;
  }
  return { term, ...(note === undefined ? {} : { note }), ...(language === null ? {} : { language }) };
}

function isCandidateTerm(term: CandidateTerm | undefined): term is CandidateTerm {
  return term !== undefined;
}

export function validateReviewBatchResult(value: unknown): SchemaResult<ReviewBatchResult> {
  return readItemsEnvelope(value, REVIEW_BATCH_SCHEMA, (record, path, issues): ReviewItemResult | undefined => {
    checkKnownKeys(record, REVIEW_ITEM_FIELDS, path, issues);
    const base = readModerationItemBase(record, path, issues);
    const entries = readArray(
      record,
      "candidateTerms",
      path,
      { min: 0, max: REVIEW_CANDIDATE_TERMS_MAX_COUNT },
      issues,
    );
    if (base === undefined || entries === undefined) return undefined;
    const termsPath = childPath(path, "candidateTerms");
    const parsed = entries.map((entry, index) => readCandidateTerm(entry, childPath(termsPath, index), issues));
    const candidateTerms = parsed.filter(isCandidateTerm);
    if (candidateTerms.length !== parsed.length) return undefined;
    return { ...base, candidateTerms };
  });
}
