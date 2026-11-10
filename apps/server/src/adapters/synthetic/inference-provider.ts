import { CONTRACT_VERSION, type InferenceProvider, type InferenceResult } from "@voxward/contracts";

/** Returns one fixed legal classification. Holds no state, so cancel and release are no-ops. */
export function createSyntheticInferenceProvider(): InferenceProvider {
  return {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,
    describe: () => ({
      contractVersion: CONTRACT_VERSION,
      providerName: "synthetic",
      supportsCancel: true,
    }),
    async infer(request): Promise<InferenceResult> {
      return {
        contractVersion: CONTRACT_VERSION,
        correlationId: request.correlationId,
        classification: "ALLOW_MEANINGFUL",
      };
    },
    async cancel(): Promise<void> {},
    async releaseSession(): Promise<void> {},
  };
}
