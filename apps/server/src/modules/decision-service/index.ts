import { CONTRACT_VERSION, type DecisionService } from "@voxward/contracts";
import { commitDecision, type DecisionDeps } from "./service.js";

export type { DecisionDeps } from "./service.js";
export { conflictOutcome, mayDecide } from "./concurrency.js";

/**
 * Creates the decision module. Without dependencies the module is not wired, and every entry point rejects with the
 * placeholder message the registry has always reported.
 */
export function createDecisionService(deps?: DecisionDeps): DecisionService {
  if (deps === undefined) return unwiredDecisionService();
  return {
    moduleName: "DecisionService",
    contractVersion: CONTRACT_VERSION,
    commit: async (taskId, verdict, origin) => commitDecision(deps, taskId, verdict, origin),
  };
}

function unwiredDecisionService(): DecisionService {
  return {
    moduleName: "DecisionService",
    contractVersion: CONTRACT_VERSION,
    commit: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: DecisionService.commit")),
  };
}
