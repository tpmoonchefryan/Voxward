import type { InternalClassification } from "../decisions/verdict.js";
import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export interface InferenceCapabilities extends Versioned {
  readonly providerName: string;
  readonly supportsCancel: boolean;
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

export interface InferenceResultItem {
  readonly correlationId: string;
  readonly classification: InternalClassification;
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
