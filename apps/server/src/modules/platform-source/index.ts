import { CONTRACT_VERSION, type PlatformSource } from "@voxward/contracts";

/** Placeholder entry for platform intake. S001 binds the synthetic adapter instead. */
export function createPlatformSource(): PlatformSource {
  return {
    moduleName: "PlatformSource",
    contractVersion: CONTRACT_VERSION,
    fetchAfter: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: PlatformSource.fetchAfter")),
  };
}
