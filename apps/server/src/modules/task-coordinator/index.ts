import { CONTRACT_VERSION } from "@voxward/contracts";
import { createCoordinator, type TaskCoordinatorOptions, type TaskCoordinatorService } from "./coordinator.js";

export {
  DEFAULT_COORDINATOR_LIMITS,
  TaskConfigError,
  TaskInputError,
  TaskNotFoundError,
  type BatchTask,
  type CommitResult,
  type ConcurrencySource,
  type CoordinatorLimitOverrides,
  type CoordinatorLimits,
  type EventKey,
  type FailureOutcome,
  type TaskBatch,
  type TaskCoordinatorOptions,
  type TaskCoordinatorService,
  type TaskFacts,
  type TaskFactsPort,
  type TaskResult,
  type TechnicalLogSink,
} from "./coordinator.js";
export { STALE_REASONS, type CommitOutcome, type ExpectedFacts, type StaleReason } from "./generation.js";
export { TASK_LANES, type TaskLane } from "./priority.js";

/**
 * Creates the task coordinator. Without options the module stays unwired, and every entry point rejects with the
 * placeholder message the registry has always reported.
 */
export function createTaskCoordinator(options?: TaskCoordinatorOptions): TaskCoordinatorService {
  if (options === undefined) return unwiredCoordinator();
  return createCoordinator(options);
}

function unwiredCoordinator(): TaskCoordinatorService {
  const notWired = (name: string) => () => Promise.reject(new Error(`MODULE_NOT_IMPLEMENTED: TaskCoordinator.${name}`));
  return {
    moduleName: "TaskCoordinator",
    contractVersion: CONTRACT_VERSION,
    enqueue: notWired("enqueue"),
    statusOf: notWired("statusOf"),
    enqueueInLane: notWired("enqueueInLane"),
    reasonOf: notWired("reasonOf"),
    takeBatch: notWired("takeBatch"),
    reportFailure: notWired("reportFailure"),
    commitResult: notWired("commitResult"),
    finishBatch: notWired("finishBatch"),
    cancelEvent: notWired("cancelEvent"),
    idleBatchIds: notWired("idleBatchIds"),
    sweep: notWired("sweep"),
  };
}
