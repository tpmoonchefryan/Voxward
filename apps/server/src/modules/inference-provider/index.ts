import { CONTRACT_VERSION, type InferenceProvider } from "@voxward/contracts";

/** Placeholder entry for inference. Declares no capabilities and fails every call. */
export function createInferenceProvider(): InferenceProvider {
  return {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,
    describe: () => ({ contractVersion: CONTRACT_VERSION, providerName: "not-bound", supportsCancel: false }),
    infer: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: InferenceProvider.infer")),
    cancel: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: InferenceProvider.cancel")),
    releaseSession: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: InferenceProvider.releaseSession")),
  };
}
