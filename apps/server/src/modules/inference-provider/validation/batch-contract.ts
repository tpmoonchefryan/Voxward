import {
  isPlainObject,
  MODERATION_BATCH_SCHEMA,
  type AiBatchInput,
  type AiSchemaRef,
  type ModerationItemResult,
  REVIEW_BATCH_SCHEMA,
  type ReviewItemResult,
  type SchemaIssue,
  type SchemaResult,
  SC_BATCH_SCHEMA,
  type ScItemResult,
  validateModerationBatchResult,
  validateReviewBatchResult,
  validateScBatchResult,
} from "@voxward/contracts";
import type { BatchValidationError } from "./errors.js";
import { checkGeneratedTextFields, type GeneratedTextChecker, type GeneratedTextField } from "./output-text-check.js";
import { isSpanWithinText } from "./unicode-span.js";

export interface AiBatchOptions {
  /** Largest batch this deployment accepts. The contract leaves the number to configuration, so the caller passes it. */
  readonly maxItems: number;
  /** Rule-engine port for generated text. Without it every generated text is unverified, so the batch fails. */
  readonly generatedText?: GeneratedTextChecker;
}

/** Either every item passed and the items are returned, or the whole batch fails with every located error. */
export type AiBatchValidation<Item> =
  | { readonly ok: true; readonly schema: AiSchemaRef; readonly items: readonly Item[] }
  | { readonly ok: false; readonly schema: AiSchemaRef; readonly errors: readonly BatchValidationError[] };

/** What differs between the batch kinds: the schema reader and the generated fields a viewer will see. */
interface BatchKind<Item extends ModerationItemResult> {
  readonly schema: AiSchemaRef;
  readonly read: (output: unknown) => SchemaResult<{ readonly items: readonly Item[] }>;
  readonly generatedFieldsOf: (item: Item) => readonly GeneratedTextField[];
}

const MODERATION_KIND: BatchKind<ModerationItemResult> = {
  schema: MODERATION_BATCH_SCHEMA,
  read: validateModerationBatchResult,
  generatedFieldsOf: () => [],
};

const SC_KIND: BatchKind<ScItemResult> = {
  schema: SC_BATCH_SCHEMA,
  read: validateScBatchResult,
  // Every generated text is checked whatever the verdict, because a translation or reply cue may still reach a viewer.
  generatedFieldsOf: (item) => [
    { name: "translatedText", text: item.translatedText },
    { name: "slangNote", text: item.slangNote },
    { name: "replyCue", text: item.replyCue },
    ...(item.thankYouReading === undefined ? [] : [{ name: "thankYouReading", text: item.thankYouReading }]),
  ],
};

const REVIEW_KIND: BatchKind<ReviewItemResult> = {
  schema: REVIEW_BATCH_SCHEMA,
  read: validateReviewBatchResult,
  // Candidate terms go to a person for confirmation and are not shown to viewers, so they are not checked here.
  generatedFieldsOf: () => [],
};

/** Validates a real-time moderation batch against the batch input. */
export async function validateModerationBatch(
  output: unknown,
  input: AiBatchInput,
  options: AiBatchOptions,
): Promise<AiBatchValidation<ModerationItemResult>> {
  return validateAiBatch(MODERATION_KIND, output, input, options);
}

/** Validates an SC batch: schema, batch membership, spans and every generated text. */
export async function validateScBatch(
  output: unknown,
  input: AiBatchInput,
  options: AiBatchOptions,
): Promise<AiBatchValidation<ScItemResult>> {
  return validateAiBatch(SC_KIND, output, input, options);
}

/** Validates a review batch. Its candidate terms are not generated text for viewers, so only structure and membership apply. */
export async function validateReviewBatch(
  output: unknown,
  input: AiBatchInput,
  options: AiBatchOptions,
): Promise<AiBatchValidation<ReviewItemResult>> {
  return validateAiBatch(REVIEW_KIND, output, input, options);
}

async function validateAiBatch<Item extends ModerationItemResult>(
  kind: BatchKind<Item>,
  output: unknown,
  input: AiBatchInput,
  options: AiBatchOptions,
): Promise<AiBatchValidation<Item>> {
  const inputErrors = checkInput(input, options.maxItems);
  if (inputErrors.length > 0) return rejected(kind.schema, inputErrors);

  const sources = new Map(input.items.map((item) => [item.itemId, item] as const));
  const read = kind.read(output);
  if (!read.ok) return rejected(kind.schema, read.issues.map((issue) => locate(issue, output, sources)));

  const errors: BatchValidationError[] = [];
  const seen = new Set<string>();
  for (const [index, item] of read.value.items.entries()) {
    const path = `/items/${index}`;
    const source = sources.get(item.itemId);
    if (source === undefined) {
      errors.push({ code: "ITEM_ID_UNKNOWN", path: `${path}/itemId` });
      continue;
    }
    if (seen.has(item.itemId)) {
      errors.push({ code: "ITEM_ID_DUPLICATE", path: `${path}/itemId`, itemId: item.itemId });
      continue;
    }
    seen.add(item.itemId);
    if (item.matchedSpan !== undefined && !isSpanWithinText(item.matchedSpan, source.text)) {
      errors.push({ code: "SPAN_OUT_OF_RANGE", path: `${path}/matchedSpan`, itemId: item.itemId });
    }
    const fields = kind.generatedFieldsOf(item);
    errors.push(...(await checkGeneratedTextFields(index, item.itemId, fields, options.generatedText)));
  }
  for (const source of input.items) {
    if (!seen.has(source.itemId)) {
      errors.push({ code: "ITEM_RESULT_MISSING", path: "/items", itemId: source.itemId });
    }
  }

  if (errors.length > 0) return rejected(kind.schema, errors);
  return { ok: true, schema: kind.schema, items: read.value.items };
}

function rejected<Item>(schema: AiSchemaRef, errors: readonly BatchValidationError[]): AiBatchValidation<Item> {
  return { ok: false, schema, errors };
}

/** Input errors point into the request. A batch needs at least one item, at most `maxItems`, and unique item ids. */
function checkInput(input: AiBatchInput, maxItems: number): BatchValidationError[] {
  if (input.items.length === 0) return [{ code: "BATCH_EMPTY", path: "/items" }];
  if (input.items.length > maxItems) return [{ code: "BATCH_TOO_LARGE", path: "/items" }];
  const seen = new Set<string>();
  const errors: BatchValidationError[] = [];
  input.items.forEach((item, index) => {
    if (seen.has(item.itemId)) {
      errors.push({ code: "INPUT_ITEM_ID_DUPLICATE", path: `/items/${index}/itemId`, itemId: item.itemId });
    }
    seen.add(item.itemId);
  });
  return errors;
}

const OUTPUT_ITEM_PATH = /^\/items\/(\d+)(?:\/|$)/u;

/** Attaches the item id to a schema issue only when the output names an id of this batch. Unknown ids are never echoed. */
function locate(
  issue: SchemaIssue,
  output: unknown,
  sources: ReadonlyMap<string, unknown>,
): BatchValidationError {
  const itemId = itemIdOf(output, issue.path, sources);
  return itemId === undefined
    ? { code: issue.code, path: issue.path }
    : { code: issue.code, path: issue.path, itemId };
}

function itemIdOf(output: unknown, path: string, sources: ReadonlyMap<string, unknown>): string | undefined {
  const index = OUTPUT_ITEM_PATH.exec(path)?.[1];
  if (index === undefined || !isPlainObject(output)) return undefined;
  const items: unknown = output.items;
  if (!Array.isArray(items)) return undefined;
  const entry: unknown = items[Number(index)];
  if (!isPlainObject(entry) || typeof entry.itemId !== "string") return undefined;
  return sources.has(entry.itemId) ? entry.itemId : undefined;
}
