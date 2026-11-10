import { CONTRACT_VERSION, type OutputAdapter } from "@voxward/contracts";

/** Placeholder entry for output delivery. S001 binds the synthetic adapter instead. */
export function createOutputAdapter(): OutputAdapter {
  return {
    moduleName: "OutputAdapter",
    contractVersion: CONTRACT_VERSION,
    deliver: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: OutputAdapter.deliver")),
  };
}
