import { CONTRACT_VERSION, type InferenceProvider } from "@voxward/contracts";

export * from "./validation/batch-contract.js";
export * from "./validation/errors.js";
export * from "./validation/output-text-check.js";
export * from "./validation/unicode-span.js";
export * from "./model-settings/settings.js";
export * from "./model-settings/capability-check.js";
export * from "./model-settings/routes.js";
export * from "./sc-translation/cue-sheet.js";
export * from "./sc-translation/pipeline.js";

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
