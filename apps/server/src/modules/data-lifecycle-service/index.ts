import { CONTRACT_VERSION, type DataLifecycleService } from "@voxward/contracts";

/** Placeholder entry for data lifecycle. Every call fails until the lifecycle story lands. */
export function createDataLifecycleService(): DataLifecycleService {
  return {
    moduleName: "DataLifecycleService",
    contractVersion: CONTRACT_VERSION,
    requestDeletion: () =>
      Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: DataLifecycleService.requestDeletion")),
  };
}
