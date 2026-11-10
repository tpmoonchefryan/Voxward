import type { InternalClassification } from "../decisions/verdict.js";
import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export interface InferenceCapabilities extends Versioned {
  readonly providerName: string;
  readonly supportsCancel: boolean;
}

/** Only the necessary text and a temporary correlation id cross this boundary. */
export interface InferenceRequest extends Versioned {
  readonly correlationId: string;
  readonly text: string;
}

export interface InferenceResult extends Versioned {
  readonly correlationId: string;
  readonly classification: InternalClassification;
}

/**
 * Input/output adaptation, capability declaration, cancellation and session cleanup.
 * Holds no platform credentials and no business database handle.
 */
export interface InferenceProvider extends VersionedModule<"InferenceProvider"> {
  describe(): InferenceCapabilities;
  infer(request: InferenceRequest): Promise<InferenceResult>;
  cancel(correlationId: string): Promise<void>;
  releaseSession(correlationId: string): Promise<void>;
}
