/** Epoch milliseconds of a deadline text, or null when the text is not a timestamp. */
export function parseDeadline(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * A task is expired from the instant its deadline is reached. Expiry never restores a result: an expired task can only
 * move to a human queue or be discarded (proposal section 6.2).
 */
export function isExpired(deadlineMs: number, nowMs: number): boolean {
  return nowMs >= deadlineMs;
}
