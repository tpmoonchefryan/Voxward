import { INTERNAL_CLASSIFICATIONS, type InternalClassification } from "../decisions/verdict.js";
import { AI_ITEM_ID_MAX_LENGTH } from "./batch.js";
import {
  type AiSchemaRef,
  checkKnownKeys,
  childPath,
  readArray,
  readEnum,
  readInteger,
  readItemsEnvelope,
  readObject,
  readString,
  type SchemaIssue,
  type SchemaResult,
} from "./validation.js";

/** Versioned schema of the real-time moderation batch result (proposal section 8.2). */
export const MODERATION_BATCH_SCHEMA: AiSchemaRef = { name: "VoxWardModerationBatchV1", version: 1 };

export const MODERATION_REASON_CODES = [
  "NONE",
  "NOISE",
  "HARASSMENT",
  "HATE",
  "SEXUAL",
  "VIOLENCE",
  "SCAM",
  "SPAM",
  "PHONETIC_EVASION",
  "OTHER_POLICY",
] as const;
export type ModerationReasonCode = (typeof MODERATION_REASON_CODES)[number];

/** Reasons that can justify a BLOCK. `NONE` and `NOISE` cannot. */
export const POLICY_REASON_CODES: readonly ModerationReasonCode[] = [
  "HARASSMENT",
  "HATE",
  "SEXUAL",
  "VIOLENCE",
  "SCAM",
  "SPAM",
  "PHONETIC_EVASION",
  "OTHER_POLICY",
];

/** The fields every AI item carries. Extension schemas add their own. */
export const MODERATION_ITEM_FIELDS = ["itemId", "verdict", "reasonCodes", "matchedSpan"] as const;

/** A matched region of the input, in Unicode code points. `end` is exclusive. */
export interface MatchedSpan {
  readonly start: number;
  readonly end: number;
}

export interface ModerationItemResult {
  readonly itemId: string;
  readonly verdict: InternalClassification;
  readonly reasonCodes: readonly ModerationReasonCode[];
  readonly matchedSpan?: MatchedSpan;
}

export interface ModerationBatchResult {
  readonly items: readonly ModerationItemResult[];
}

/** Reads the fields every AI item carries. Extension schemas check their unknown keys and then call this. */
export function readModerationItemBase(
  record: Readonly<Record<string, unknown>>,
  path: string,
  issues: SchemaIssue[],
): ModerationItemResult | undefined {
  const itemId = readString(record, "itemId", path, { min: 1, max: AI_ITEM_ID_MAX_LENGTH }, issues);
  const verdict = readEnum(record, "verdict", path, INTERNAL_CLASSIFICATIONS, issues);
  const reasonCodes = readReasonCodes(record, path, issues);
  const spanPresent = record.matchedSpan !== undefined;
  const matchedSpan = spanPresent
    ? readMatchedSpan(record.matchedSpan, childPath(path, "matchedSpan"), issues)
    : undefined;
  if (verdict !== undefined && reasonCodes !== undefined) {
    if (!isConsistent(verdict, reasonCodes)) {
      issues.push({ code: "RULE_CONFLICT", path: childPath(path, "reasonCodes") });
    }
  }
  if (itemId === undefined || verdict === undefined || reasonCodes === undefined) return undefined;
  if (spanPresent && matchedSpan === undefined) return undefined;
  return matchedSpan === undefined ? { itemId, verdict, reasonCodes } : { itemId, verdict, reasonCodes, matchedSpan };
}

function readReasonCodes(
  record: Readonly<Record<string, unknown>>,
  path: string,
  issues: SchemaIssue[],
): readonly ModerationReasonCode[] | undefined {
  const at = childPath(path, "reasonCodes");
  const entries = readArray(record, "reasonCodes", path, { min: 1, max: MODERATION_REASON_CODES.length }, issues);
  if (entries === undefined) return undefined;

  const codes: ModerationReasonCode[] = [];
  for (const entry of entries) {
    const code = MODERATION_REASON_CODES.find((candidate) => candidate === entry);
    if (code === undefined) {
      issues.push({ code: "ENUM_INVALID", path: at });
      return undefined;
    }
    codes.push(code);
  }
  if (new Set(codes).size !== codes.length) {
    issues.push({ code: "DUPLICATE_VALUE", path: at });
    return undefined;
  }
  return codes;
}

/**
 * The classification and its reasons must agree. `ALLOW_MEANINGFUL` carries only `NONE`, `ALLOW_NOISE` only `NOISE`,
 * and `BLOCK` needs at least one policy reason and no `NONE` or `NOISE`. This matrix is this package's own choice.
 */
function isConsistent(verdict: InternalClassification, codes: readonly ModerationReasonCode[]): boolean {
  switch (verdict) {
    case "ALLOW_MEANINGFUL":
      return codes.length === 1 && codes[0] === "NONE";
    case "ALLOW_NOISE":
      return codes.length === 1 && codes[0] === "NOISE";
    case "BLOCK":
      return (
        codes.some((code) => POLICY_REASON_CODES.includes(code)) &&
        !codes.includes("NONE") &&
        !codes.includes("NOISE")
      );
  }
}

function readMatchedSpan(value: unknown, path: string, issues: SchemaIssue[]): MatchedSpan | undefined {
  const record = readObject(value, path, issues);
  if (record === undefined) return undefined;
  checkKnownKeys(record, ["start", "end"], path, issues);
  const start = readInteger(record, "start", path, { min: 0, max: Number.MAX_SAFE_INTEGER }, issues);
  const end = readInteger(record, "end", path, { min: 1, max: Number.MAX_SAFE_INTEGER }, issues);
  if (start === undefined || end === undefined) return undefined;
  if (start >= end) {
    issues.push({ code: "RANGE_INVALID", path });
    return undefined;
  }
  return { start, end };
}

/** Validates a real-time moderation batch result. The typed value is returned only when every rule holds. */
export function validateModerationBatchResult(value: unknown): SchemaResult<ModerationBatchResult> {
  return readItemsEnvelope(value, MODERATION_BATCH_SCHEMA, (record, path, issues) => {
    checkKnownKeys(record, MODERATION_ITEM_FIELDS, path, issues);
    return readModerationItemBase(record, path, issues);
  });
}
