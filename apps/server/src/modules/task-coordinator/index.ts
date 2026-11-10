import { CONTRACT_VERSION, type TaskCoordinator } from "@voxward/contracts";

/** Placeholder entry for task coordination. Every call fails until the queue story lands. */
export function createTaskCoordinator(): TaskCoordinator {
  return {
    moduleName: "TaskCoordinator",
    contractVersion: CONTRACT_VERSION,
    enqueue: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: TaskCoordinator.enqueue")),
    statusOf: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: TaskCoordinator.statusOf")),
  };
}
