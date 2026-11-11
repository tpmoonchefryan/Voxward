/** Limits that decide when a micro-batch is taken. */
export interface BatchLimits {
  readonly maxItems: number;
  readonly maxBytes: number;
  readonly maxWaitMs: number;
  readonly deadlineMarginMs: number;
}

/** One eligible task, oldest first. `bytes` is the UTF-8 size of its text. */
export interface BatchCandidate {
  readonly bytes: number;
  readonly enqueuedMs: number;
  readonly deadlineMs: number;
}

export type FlushReason = "FULL" | "BYTES" | "WAIT" | "DEADLINE";

export type BatchDecision =
  | { readonly kind: "flush"; readonly count: number; readonly reason: FlushReason }
  | { readonly kind: "hold" };

/**
 * Decides whether the oldest candidates form a batch now. A batch is taken when it is full by count, full by bytes,
 * when its oldest item has waited too long, or when its earliest deadline is near. Otherwise it waits for more items.
 * The coordinator refuses any single item larger than `maxBytes` at enqueue, so the head of the queue always fits.
 */
export function decideBatch(candidates: readonly BatchCandidate[], limits: BatchLimits, nowMs: number): BatchDecision {
  const first = candidates[0];
  if (first === undefined) return { kind: "hold" };

  let count = 0;
  let bytes = 0;
  let byteFull = false;
  for (const candidate of candidates) {
    if (count === limits.maxItems) break;
    if (bytes + candidate.bytes > limits.maxBytes) {
      byteFull = true;
      break;
    }
    count += 1;
    bytes += candidate.bytes;
  }
  if (count === 0) return { kind: "hold" };
  if (count === limits.maxItems) return { kind: "flush", count, reason: "FULL" };
  if (byteFull) return { kind: "flush", count, reason: "BYTES" };
  if (nowMs - first.enqueuedMs >= limits.maxWaitMs) return { kind: "flush", count, reason: "WAIT" };

  const earliestDeadline = Math.min(...candidates.slice(0, count).map((candidate) => candidate.deadlineMs));
  if (nowMs + limits.deadlineMarginMs >= earliestDeadline) return { kind: "flush", count, reason: "DEADLINE" };
  return { kind: "hold" };
}
