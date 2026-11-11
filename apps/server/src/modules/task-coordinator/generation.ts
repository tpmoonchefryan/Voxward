/**
 * Why a result can no longer be written. The fact store checks them in this order inside the commit transaction
 * (proposal section 7.2).
 */
export const STALE_REASONS = ["DATA_DELETED", "GENERATION_CHANGED", "VERSION_SUPERSEDED", "ALREADY_SETTLED"] as const;
export type StaleReason = (typeof STALE_REASONS)[number];

/** The facts a task is bound to at enqueue time. The commit transaction compares them with the stored state. */
export interface ExpectedFacts {
  readonly taskId: string;
  readonly eventVersion: number;
  readonly processingGeneration: number;
}

export type CommitOutcome =
  | { readonly status: "committed" }
  | { readonly status: "stale"; readonly reason: StaleReason };

/** Copies only the expectation out of a task record, so no other field reaches the fact store. */
export function expectedFactsOf(task: ExpectedFacts): ExpectedFacts {
  return { taskId: task.taskId, eventVersion: task.eventVersion, processingGeneration: task.processingGeneration };
}
