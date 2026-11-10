import type { Versioned } from "../version.js";

export const TASK_STATUSES = ["QUEUED", "RUNNING", "PENDING_REVIEW", "DONE", "DISCARDED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** A task bound to one event version and one processing generation. */
export interface TaskRef extends Versioned {
  readonly taskId: string;
  readonly eventVersion: number;
  readonly processingGeneration: number;
  readonly deadlineAt: string;
}
