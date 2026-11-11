import { CONTRACT_VERSION, type DecisionService } from "@voxward/contracts";
import { overturnEvent } from "./compensation.js";
import { resendDelivery } from "./resend.js";
import { commitDecision, type DecisionDeps } from "./service.js";

export { conflictOutcome, mayDecide } from "./concurrency.js";
export { overturnEvent } from "./compensation.js";
export { resendDelivery } from "./resend.js";
export {
  createListAdministration,
  LIST_CAPABILITY,
  mayEditLists,
  type ListAdministration,
  type ListEditOutcome,
  type SubjectListRequest,
  type TermEditOutcome,
  type TermRequest,
} from "./list-permissions.js";
export { DEFAULT_DECISION_LIMITS, type DecisionDeps, type DecisionLimits } from "./service.js";
export {
  deleteFromPlatform,
  PLATFORM_DELETE_MAX_ATTEMPTS,
  type LocalBlockOutcome,
  type PlatformDeleteDeps,
  type PlatformDeleteOutcome,
  type PlatformDeleteRequest,
} from "./platform-delete.js";

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
    overturn: async (request) => overturnEvent(deps, request),
    resend: async (request) => resendDelivery(deps, request),
  };
}

function unwiredDecisionService(): DecisionService {
  const notWired = (name: string) => () => Promise.reject(new Error(`MODULE_NOT_IMPLEMENTED: DecisionService.${name}`));
  return {
    moduleName: "DecisionService",
    contractVersion: CONTRACT_VERSION,
    commit: notWired("commit"),
    overturn: notWired("overturn"),
    resend: notWired("resend"),
  };
}
