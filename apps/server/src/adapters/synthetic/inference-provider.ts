import { CONTRACT_VERSION, type InferenceProvider, type InferenceResultItem } from "@voxward/contracts";

/**
 * Returns one fixed legal classification for every item. Holds no state, so cancel and release are no-ops. No model reads
 * the item ids, so each one is only a stable position in the batch.
 */
export function createSyntheticInferenceProvider(): InferenceProvider {
  return {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,
    describe: () => ({
      contractVersion: CONTRACT_VERSION,
      providerName: "synthetic",
      supportsCancel: true,
      models: [{ modelId: "synthetic-demo", reasoningLevels: [] }],
    }),
    async infer(request) {
      return {
        contractVersion: CONTRACT_VERSION,
        batchId: request.batchId,
        items: request.items.map((item, index): InferenceResultItem => ({
          correlationId: item.correlationId,
          itemId: `synthetic-item-${index + 1}`,
          classification: "ALLOW_MEANINGFUL",
          reasonCodes: ["NONE"],
        })),
      };
    },
    async cancel(): Promise<void> {},
    async releaseSession(): Promise<void> {},
  };
}
