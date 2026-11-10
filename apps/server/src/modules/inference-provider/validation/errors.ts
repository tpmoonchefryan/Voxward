import type { SchemaIssueCode } from "@voxward/contracts";

/** Failures only the server can see: input shape, batch membership, span bounds and the generated text check. */
export const SERVER_ISSUE_CODES = [
  "BATCH_EMPTY",
  "BATCH_TOO_LARGE",
  "INPUT_ITEM_ID_DUPLICATE",
  "INPUT_ITEM_ID_LENGTH_INVALID",
  "OUTPUT_TOO_MANY_ITEMS",
  "ITEM_ID_UNKNOWN",
  "ITEM_ID_DUPLICATE",
  "ITEM_RESULT_MISSING",
  "SPAN_OUT_OF_RANGE",
  "GENERATED_TEXT_REJECTED",
  "GENERATED_TEXT_UNVERIFIED",
  "ERRORS_TRUNCATED",
] as const;

export type BatchErrorCode = SchemaIssueCode | (typeof SERVER_ISSUE_CODES)[number];

/**
 * Most errors one batch reports, the truncation marker included. When a batch has more, the list is cut and its last
 * entry is `ERRORS_TRUNCATED` (Q24).
 */
export const MAX_REPORTED_BATCH_ERRORS = 50;

/**
 * One located failure. `path` is a JSON Pointer into the model output, or `/items` for a missing item. Errors about the
 * request itself point into the batch input. `itemId` appears only when it is an id the server issued. No error carries
 * text from the model, so a failure can be logged without persisting output.
 */
export interface BatchValidationError {
  readonly code: BatchErrorCode;
  readonly path: string;
  readonly itemId?: string;
}
