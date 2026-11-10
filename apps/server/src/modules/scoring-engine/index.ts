import { CONTRACT_VERSION, type ScoringEngine } from "@voxward/contracts";

/** Placeholder entry for scoring. Every call fails until the scoring story lands. */
export function createScoringEngine(): ScoringEngine {
  return {
    moduleName: "ScoringEngine",
    contractVersion: CONTRACT_VERSION,
    applyVerdict: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: ScoringEngine.applyVerdict")),
  };
}
