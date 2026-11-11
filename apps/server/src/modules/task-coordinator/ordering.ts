import type { TaskStatus } from "@voxward/contracts";

/** The fields the ordering gate reads from one task. */
export interface OrderedTask {
  readonly taskId: string;
  readonly channelId: string;
  readonly platformOrder: number;
  readonly status: TaskStatus;
  readonly deadlineMs: number;
}

export type OrderGate =
  | { readonly kind: "clear" }
  | { readonly kind: "wait"; readonly waitingOn: string }
  | { readonly kind: "advanced"; readonly unfinished: string };

/** An earlier task still blocks later commits only while it is queued or running. */
function blocks(task: OrderedTask): boolean {
  return task.status === "QUEUED" || task.status === "RUNNING";
}

/**
 * Gate for committing `task` within its channel. Earlier tasks of the same channel are awaited only until their own
 * deadlines. Past that point the commit proceeds, and the unfinished predecessor is reported so it can be recorded.
 * Tasks in other channels never wait on each other.
 */
export function orderGate(task: OrderedTask, channelTasks: readonly OrderedTask[], nowMs: number): OrderGate {
  const predecessors = channelTasks
    .filter((other) => other.channelId === task.channelId && other.platformOrder < task.platformOrder && blocks(other))
    .sort((a, b) => a.platformOrder - b.platformOrder);

  const open = predecessors.filter((other) => nowMs < other.deadlineMs);
  const waitingOn = open[0];
  if (waitingOn !== undefined) return { kind: "wait", waitingOn: waitingOn.taskId };

  const unfinished = predecessors[0];
  if (unfinished !== undefined) return { kind: "advanced", unfinished: unfinished.taskId };
  return { kind: "clear" };
}
