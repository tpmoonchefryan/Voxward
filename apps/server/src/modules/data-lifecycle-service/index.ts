import { CONTRACT_VERSION, type DataLifecycleService } from "@voxward/contracts";

/**
 * Placeholder for the DataLifecycleService contract. `requestDeletion` stays a placeholder until STORY-019. The data
 * panel reaches this module through `createDataRoutes` instead.
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
export { createDataRoutes, type DataRoutes } from "./routes.js";
export { DATA_HANDLE_CAPABILITY, type DataActor, type DataDeps, type RouteResponse } from "./types.js";
