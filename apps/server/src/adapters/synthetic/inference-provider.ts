import { CONTRACT_VERSION, type InferenceProvider, type InferenceResultItem } from "@voxward/contracts";

/** Returns one fixed legal classification for every item. Holds no state, so cancel and release are no-ops. */
export function createSyntheticInferenceProvider(): InferenceProvider {
  return {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,
    describe: () => ({
      contractVersion: CONTRACT_VERSION,
      providerName: "synthetic",
      supportsCancel: true,
    }),
    async infer(request) {
      return {
        contractVersion: CONTRACT_VERSION,
        batchId: request.batchId,
        items: request.items.map((item): InferenceResultItem => ({
          correlationId: item.correlationId,
          classification: "ALLOW_MEANINGFUL",
        })),
      };
    },
    async cancel(): Promise<void> {},
    async releaseSession(): Promise<void> {},
  };
}
