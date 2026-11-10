import type { ChannelEvent } from "../events/channel-event.js";
import type { TaskRef, TaskStatus } from "../tasks/task-ref.js";
import type { VersionedModule } from "./module-contract.js";

/** Queue, deadlines, resources and task execution. Never rewrites a business verdict. */
export interface TaskCoordinator extends VersionedModule<"TaskCoordinator"> {
  enqueue(event: ChannelEvent, deadlineAt: string): Promise<TaskRef>;
  statusOf(taskId: string): Promise<TaskStatus>;
}
