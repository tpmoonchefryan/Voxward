/**
 * Batch vocabulary for the AI business contracts. The model receives one temporary `itemId` per item and the message
 * text, and nothing that identifies a viewer or an internal event. The server keeps the mapping back to internal
 * references.
 */

/** Upper bound on an item id, counted in Unicode code points. */
export const AI_ITEM_ID_MAX_LENGTH = 64;

/** One item as sent to the model. `itemId` is unique within its batch. */
export interface AiBatchItemInput {
  readonly itemId: string;
  readonly text: string;
}

/** One request batch. The adapter that builds it assigns the item ids. */
export interface AiBatchInput {
  readonly items: readonly AiBatchItemInput[];
}

/** Multilingual SC request extension carrying target language tags without changing base `AiBatchInput`. */
export interface ScMultilingualBatchItemInput extends AiBatchItemInput {
  readonly language?: string;
}

export interface ScMultilingualBatchInput extends AiBatchInput {
  readonly items: readonly ScMultilingualBatchItemInput[];
  readonly targetLanguages?: readonly string[];
}

/** Server-side record that ties a batch item id to its internal correlation id. Never sent to a model. */
export interface AiItemIdMapping {
  readonly itemId: string;
  readonly correlationId: string;
}

/** The same mapping, keyed by item id for lookup. */
export type AiItemIdMap = ReadonlyMap<string, string>;
