import type { MatchedSpan, ModerationReasonCode } from "../ai/moderation-result.js";
import type { InternalClassification } from "../decisions/verdict.js";
import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export interface InferenceCapabilities extends Versioned {
  readonly providerName: string;
  readonly supportsCancel: boolean;
  /**
   * Models the adapter reports it can run. Absent or empty means none is reported, so no model can be chosen for it.
   * The model settings module reads this list and never adds to it.
   */
  readonly models?: readonly InferenceModelCapability[];
}

/** One model an adapter reports. `reasoningLevels` lists the levels it accepts; empty means it takes no reasoning parameter. */
export interface InferenceModelCapability {
  readonly modelId: string;
  readonly reasoningLevels: readonly string[];
}

/**
 * One message of an inference batch. `correlationId` is the server's internal reference, used only to map the result
 * back. The adapter gives the model a temporary item id instead and never sends this field (proposal section 8.1).
 */
export interface InferenceRequestItem {
  readonly correlationId: string;
  readonly text: string;
}

/** One AI task. `batchId` names its one-time session, so cancellation and release address the whole batch. */
export interface InferenceRequest extends Versioned {
  readonly batchId: string;
  readonly items: readonly InferenceRequestItem[];
}

/**
 * One classification, with what the caller needs to keep the evidence for it: the temporary item id the model saw (so the
 * server can keep its item-id map), the reason codes, and the matched span when the validator found one. The span is in
 * Unicode code points, and it is absent when the item has none.
 */
export interface InferenceResultItem {
  readonly correlationId: string;
  readonly itemId: string;
  readonly classification: InternalClassification;
  readonly reasonCodes: readonly ModerationReasonCode[];
  readonly matchedSpan?: MatchedSpan;
}

/** One classification per request item, in request order. */
export interface InferenceResult extends Versioned {
  readonly batchId: string;
  readonly items: readonly InferenceResultItem[];
}

/**
 * Input/output adaptation, capability declaration, cancellation and session cleanup.
 * Holds no platform credentials and no business database handle.
 */
export interface InferenceProvider extends VersionedModule<"InferenceProvider"> {
  describe(): InferenceCapabilities;
  infer(request: InferenceRequest): Promise<InferenceResult>;
  cancel(batchId: string): Promise<void>;
  releaseSession(batchId: string): Promise<void>;
}
