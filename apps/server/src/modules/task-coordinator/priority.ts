/**
 * Queue lanes in dispatch order: paid review first, then real-time review, then background review. Background work
 * runs only in capacity the interactive lanes do not need (proposal section 6.2).
 */
export const TASK_LANES = ["PAID", "REALTIME", "BACKGROUND"] as const;
export type TaskLane = (typeof TASK_LANES)[number];

/** Slots kept free for interactive work while background batches run: a quarter of the limit, at least one (自定). */
export function interactiveReserve(limit: number): number {
  return Math.min(limit, Math.max(1, Math.ceil(limit / 4)));
}

/** Most background batches that may hold slots at once. Zero at the minimum concurrency pauses background work. */
export function backgroundCeiling(limit: number): number {
  return limit - interactiveReserve(limit);
}

/** Batches currently holding a concurrency slot. */
export interface SlotUsage {
  readonly total: number;
  readonly background: number;
}

/**
 * Whether a batch of `lane` may take a slot now. Interactive lanes may use every slot. Background stops at its ceiling,
 * so an interactive arrival always finds a free slot while background work runs.
 */
export function laneMayStart(lane: TaskLane, usage: SlotUsage, limit: number): boolean {
  if (usage.total >= limit) return false;
  if (lane !== "BACKGROUND") return true;
  return usage.background < backgroundCeiling(limit);
}
