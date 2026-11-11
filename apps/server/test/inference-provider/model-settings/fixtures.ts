import { CONTRACT_VERSION, type InferenceCapabilities } from "@voxward/contracts";

/**
 * Synthetic capability reports for the model settings tests. The model ids and levels are made up; no vendor model is
 * named. The report is the only source of choices, as in the adapter's real `describe()`.
 */
export const REPORT_WITH_MODELS: InferenceCapabilities = {
  contractVersion: CONTRACT_VERSION,
  providerName: "synthetic-report",
  supportsCancel: true,
  models: [
    { modelId: "synthetic-model-a", reasoningLevels: ["low", "high"] },
    { modelId: "synthetic-model-b", reasoningLevels: [] },
  ],
};

/** A report from an adapter that offers no model choice at all. */
export const REPORT_WITHOUT_MODELS: InferenceCapabilities = {
  contractVersion: CONTRACT_VERSION,
  providerName: "synthetic-report",
  supportsCancel: true,
};

/** A report that dropped `synthetic-model-a`, as after an adapter change. */
export const REPORT_AFTER_CHANGE: InferenceCapabilities = {
  contractVersion: CONTRACT_VERSION,
  providerName: "synthetic-report",
  supportsCancel: true,
  models: [{ modelId: "synthetic-model-b", reasoningLevels: [] }],
};

/** A complete valid settings body. Every key is present, as the write route requires. */
export const VALID_BODY = {
  realtimeModeration: { modelId: "synthetic-model-a", reasoning: "low" },
  scTranslation: { modelId: "synthetic-model-b", reasoning: null },
  review: null,
  scTranslationEnabled: true,
};
