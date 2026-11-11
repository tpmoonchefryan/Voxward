import {
  type AiBatchInput,
  type InferenceCapabilities,
  type InferenceProvider,
  type InferenceRequest,
  type InternalClassification,
  type MatchedSpan,
  type ModerationReasonCode,
  type ScItemResult,
} from "@voxward/contracts";
import { checkSelection } from "../model-settings/capability-check.js";
import type { ModelSelection, SettingsIssue } from "../model-settings/settings.js";
import { validateScBatch } from "../validation/batch-contract.js";
import type { GeneratedTextChecker } from "../validation/output-text-check.js";
import { buildCueSheetItem, type CueSheetItem, isShowableAddressText, type SafeAddress } from "./cue-sheet.js";

/**
 * The SC model call used when translation is on. It returns the raw business output, which the pipeline validates. The
 * Kiro CLI adapter returns classification fields only, so the production binding waits for an adapter extension
 * (STORY-010 G6).
 */
export interface ScModelPort {
  infer(input: AiBatchInput, call: { readonly batchId: string; readonly selection: ModelSelection }): Promise<unknown>;
}

export interface ScPipelineDeps {
  /** The adapter's current capability report (its describe()). The SC selection is checked against it before a run. */
  readonly capabilities: () => InferenceCapabilities;
  /** Safety review used when translation is off. In production, the S008 adapter. */
  readonly safety: InferenceProvider;
  /** The SC run used when translation is on. */
  readonly scModel: ScModelPort;
  /** Rule engine port for generated text. Without it every generated text is unverified, and the batch fails. */
  readonly generatedText?: GeneratedTextChecker;
  /** Local address flow, keyed by correlation id. It sends nothing to a model. */
  readonly addressFor: (correlationId: string) => Promise<SafeAddress>;
  /** Source of temporary item ids. Every item of every batch gets a new one. */
  readonly newItemId: () => string;
  /** Largest batch the deployment accepts. */
  readonly maxItems: number;
}

/** One run's choices: the translation switch, and the SC model selection (null when none was chosen). */
export interface ScRunChoices {
  readonly translationEnabled: boolean;
  readonly selection: ModelSelection | null;
}

/** Why an item has no cue sheet entry. A withheld entry carries no text. */
export type CueWithheldReason =
  | "TRANSLATION_OFF"
  | "VERDICT_BLOCK"
  | "GENERATED_TEXT_REJECTED"
  | "NO_TRANSLATION"
  | "ADDRESS_UNAVAILABLE";

/** One item of a run, in request order. `cue` is set when the item may be shown, and `withheld` says why it is not. */
export interface ScItemOutcome {
  readonly correlationId: string;
  readonly classification: InternalClassification;
  readonly reasonCodes: readonly ModerationReasonCode[];
  readonly matchedSpan?: MatchedSpan;
  readonly cue: CueSheetItem | null;
  readonly withheld: CueWithheldReason | null;
}

/**
 * A refused run carries codes and locations only, never text. A batch rejected by validation goes to controlled
 * failure handling, and no item of it produces a cue.
 */
export type ScRunOutcome =
  | { readonly ok: true; readonly batchId: string; readonly items: readonly ScItemOutcome[] }
  | {
      readonly ok: false;
      readonly batchId: string;
      readonly reason: "SELECTION_REFUSED";
      readonly issues: readonly SettingsIssue[];
    }
  | {
      readonly ok: false;
      readonly batchId: string;
      readonly reason: "BATCH_REJECTED";
      readonly errorCodes: readonly string[];
    };

/**
 * Runs one SC batch.
 * - Translation off: only the safety review runs, through the safety port. No translation field is requested, and no
 *   item gets a cue sheet entry (proposal line 37: turning translation off does not stop the safety review).
 * - Translation on: the SC model returns the classification and the translations. The output is validated as a
 *   whole, then each item is judged for its own cue.
 * A run needs an SC selection that the current report supports. Without one, nothing is sent to any model.
 */
export async function runScBatch(
  request: InferenceRequest,
  choices: ScRunChoices,
  deps: ScPipelineDeps,
): Promise<ScRunOutcome> {
  // Refused before any model is called, as the adapter refuses the same requests before it starts a process.
  const requestErrors = requestErrorsOf(request, deps.maxItems);
  if (requestErrors.length > 0) {
    return { ok: false, batchId: request.batchId, reason: "BATCH_REJECTED", errorCodes: requestErrors };
  }
  const selection = choices.selection;
  if (selection === null) {
    return refused(request.batchId, [{ code: "SELECTION_NOT_CONFIGURED", path: "/scTranslation" }]);
  }
  const issues = checkSelection(selection, "/scTranslation", deps.capabilities());
  if (issues.length > 0) return refused(request.batchId, issues);

  if (!choices.translationEnabled) return safetyOnly(request, deps);
  return translate(request, selection, deps);
}

/** Request shape problems: an empty or oversized batch, or a repeated correlation id. Each is a code, never text. */
function requestErrorsOf(request: InferenceRequest, maxItems: number): string[] {
  if (request.items.length === 0) return ["BATCH_EMPTY"];
  if (request.items.length > maxItems) return ["BATCH_TOO_LARGE"];
  const correlationIds = new Set(request.items.map((item) => item.correlationId));
  return correlationIds.size === request.items.length ? [] : ["REQUEST_INVALID"];
}

function refused(batchId: string, issues: readonly SettingsIssue[]): ScRunOutcome {
  return { ok: false, batchId, reason: "SELECTION_REFUSED", issues };
}

async function safetyOnly(request: InferenceRequest, deps: ScPipelineDeps): Promise<ScRunOutcome> {
  const result = await deps.safety.infer(request);
  const items = result.items.map(
    (item): ScItemOutcome => ({
      correlationId: item.correlationId,
      classification: item.classification,
      reasonCodes: item.reasonCodes,
      ...(item.matchedSpan === undefined ? {} : { matchedSpan: item.matchedSpan }),
      cue: null,
      withheld: item.classification === "BLOCK" ? "VERDICT_BLOCK" : "TRANSLATION_OFF",
    }),
  );
  return { ok: true, batchId: request.batchId, items };
}

async function translate(
  request: InferenceRequest,
  selection: ModelSelection,
  deps: ScPipelineDeps,
): Promise<ScRunOutcome> {
  // The model sees only a temporary item id and the message text. The mapping back to the viewer stays here.
  const sentByCorrelation = new Map<string, { readonly itemId: string; readonly text: string }>();
  const modelInput: AiBatchInput = {
    items: request.items.map((item) => {
      const sent = { itemId: deps.newItemId(), text: item.text };
      sentByCorrelation.set(item.correlationId, sent);
      return sent;
    }),
  };
  if (new Set(modelInput.items.map((item) => item.itemId)).size !== modelInput.items.length) {
    return { ok: false, batchId: request.batchId, reason: "BATCH_REJECTED", errorCodes: ["INPUT_ITEM_ID_DUPLICATE"] };
  }

  const raw = await deps.scModel.infer(modelInput, { batchId: request.batchId, selection });
  const validation = await validateScBatch(raw, modelInput, {
    maxItems: deps.maxItems,
    generatedText: deps.generatedText,
  });
  if (!validation.ok) {
    const errorCodes = validation.errors.map((error) => error.code);
    return { ok: false, batchId: request.batchId, reason: "BATCH_REJECTED", errorCodes };
  }

  const rejected = new Set(validation.rejectedGeneratedText.map((entry) => entry.itemId));
  const validatedByItemId = new Map(validation.items.map((item) => [item.itemId, item] as const));
  const items: ScItemOutcome[] = [];
  for (const item of request.items) {
    const sent = sentByCorrelation.get(item.correlationId);
    const validated = sent === undefined ? undefined : validatedByItemId.get(sent.itemId);
    // The validator accepts only the ids of this batch and requires every one of them, so a miss is a broken invariant.
    if (sent === undefined || validated === undefined) throw new Error("SC_ITEM_UNMAPPED");
    items.push(await outcomeOf(item.correlationId, item.text, validated, rejected.has(sent.itemId), deps));
  }
  return { ok: true, batchId: request.batchId, items };
}

async function outcomeOf(
  correlationId: string,
  original: string,
  item: ScItemResult,
  generatedTextRejected: boolean,
  deps: ScPipelineDeps,
): Promise<ScItemOutcome> {
  const base = {
    correlationId,
    classification: item.verdict,
    reasonCodes: item.reasonCodes,
    ...(item.matchedSpan === undefined ? {} : { matchedSpan: item.matchedSpan }),
  };
  const reason = withholdReasonOf(item, generatedTextRejected);
  if (reason !== null) return { ...base, cue: null, withheld: reason };

  const address = await deps.addressFor(correlationId);
  if (!isShowableAddressText(address.display)) return { ...base, cue: null, withheld: "ADDRESS_UNAVAILABLE" };
  // An unreliable reading is left out, and the cue is still shown. The proposal calls for an empty reading or a manual
  // confirmation in that case (proposal line 190).
  const reading = address.reading !== null && isShowableAddressText(address.reading) ? address.reading : null;
  const cue = buildCueSheetItem(correlationId, original, item, { display: address.display, reading });
  return { ...base, cue, withheld: null };
}

/** The first reason an item may not show a cue. Null means it may. */
function withholdReasonOf(item: ScItemResult, generatedTextRejected: boolean): CueWithheldReason | null {
  if (item.verdict === "BLOCK") return "VERDICT_BLOCK";
  if (generatedTextRejected) return "GENERATED_TEXT_REJECTED";
  if (item.translatedText === "") return "NO_TRANSLATION";
  return null;
}
