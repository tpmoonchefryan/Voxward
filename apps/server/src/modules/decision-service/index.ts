import { CONTRACT_VERSION, type DecisionService } from "@voxward/contracts";

/** Placeholder entry for decisions. Every call fails until the decision story lands. */
export function createDecisionService(): DecisionService {
  return {
    moduleName: "DecisionService",
    contractVersion: CONTRACT_VERSION,
    commit: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: DecisionService.commit")),
  };
}
