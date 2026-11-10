import { CONTRACT_VERSION, type ModerationEngine } from "@voxward/contracts";

/** Placeholder entry for moderation. Every call fails until the moderation story lands. */
export function createModerationEngine(): ModerationEngine {
  return {
    moduleName: "ModerationEngine",
    contractVersion: CONTRACT_VERSION,
    moderate: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: ModerationEngine.moderate")),
  };
}
