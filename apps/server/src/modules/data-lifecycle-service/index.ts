import { CONTRACT_VERSION, type DataLifecycleService, type DeletionRequest } from "@voxward/contracts";

export interface DataLifecycleServiceOptions {
  readonly onRequestDeletion?: (request: DeletionRequest) => Promise<void>;
}

/**
 * DataLifecycleService contract entry point. Without options, `requestDeletion` stays unwired; when bound by the
 * composition root with a real handler, deletion requests execute against the server's data-request store.
 */
export function createDataLifecycleService(options?: DataLifecycleServiceOptions): DataLifecycleService {
  return {
    moduleName: "DataLifecycleService",
    contractVersion: CONTRACT_VERSION,
    requestDeletion: (request) =>
      options?.onRequestDeletion !== undefined
        ? options.onRequestDeletion(request)
        : Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: DataLifecycleService.requestDeletion")),
  };
}

export { buildControlledMaterial, type ControlledMaterial } from "./export-material.js";
export { startDeletionRequest } from "./delete-with-exception.js";
export { executeRequest } from "./cleanup-executor.js";
export { cleaningRank, deletionTargets, EVIDENCE_SURFACES, type CleanupTarget } from "./cleanup-targets.js";
export { preferenceMarkerOf, PREFERENCE_PURPOSE, type PreferenceMarker } from "./preference-marker.js";
export { replayTombstones, type ReplayDeps, type ReplayFailure, type ReplayReport } from "./restore-replay.js";
export { resumeScoring } from "./resume-scoring.js";
export { createDataRoutes, type DataRoutes } from "./routes.js";
export {
  DATA_HANDLE_CAPABILITY,
  type DataActor,
  type DataDeps,
  type DeletedLogsEvent,
  type RouteResponse,
  type TombstonePort,
  type TombstoneRecord,
} from "./types.js";
