import { CONTRACT_VERSION, type DataLifecycleService } from "@voxward/contracts";

/**
 * Placeholder for the DataLifecycleService contract. `requestDeletion` stays a placeholder: deletions start through
 * `startDeletionRequest` and the data panel's routes. The panel reaches this module through `createDataRoutes`.
 */
export function createDataLifecycleService(): DataLifecycleService {
  return {
    moduleName: "DataLifecycleService",
    contractVersion: CONTRACT_VERSION,
    requestDeletion: () =>
      Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: DataLifecycleService.requestDeletion")),
  };
}

export { buildControlledMaterial, type ControlledMaterial } from "./export-material.js";
export { startDeletionRequest } from "./delete-with-exception.js";
export { executeRequest } from "./cleanup-executor.js";
export { cleaningRank, deletionTargets, EVIDENCE_SURFACES, type CleanupTarget } from "./cleanup-targets.js";
export { preferenceMarkerOf, PREFERENCE_PURPOSE, type PreferenceMarker } from "./preference-marker.js";
export { resumeScoring } from "./resume-scoring.js";
export { createDataRoutes, type DataRoutes } from "./routes.js";
export {
  DATA_HANDLE_CAPABILITY,
  type DataActor,
  type DataDeps,
  type DeletedLogsEvent,
  type RouteResponse,
} from "./types.js";
