import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export interface DeletionRequest extends Versioned {
  readonly subjectRef: string;
  readonly requestedAt: string;
}

/**
 * Data requests, deletion, exceptions, retention periods and cleanup.
 * Cannot promise deletion of history that a provider controls.
 */
export interface DataLifecycleService extends VersionedModule<"DataLifecycleService"> {
  requestDeletion(request: DeletionRequest): Promise<void>;
}
