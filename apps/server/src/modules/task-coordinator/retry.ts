/** Error codes that may be retried. Everything else goes straight to the human queue (自定). */
export const RETRYABLE_ERROR_CODES: ReadonlySet<string> = new Set(["RATE_LIMITED", "TRANSIENT_FAILURE"]);

export interface RetryPolicy {
  /** Dispatches allowed in total, the first one included. */
  readonly maxAttempts: number;
  readonly backoffBaseMs: number;
  readonly backoffCapMs: number;
}

/** Delay before the next attempt, once `attemptsDone` attempts have run. It doubles each time and stops at the cap. */
export function backoffMs(attemptsDone: number, policy: RetryPolicy): number {
  const exponent = Math.max(0, attemptsDone - 1);
  return Math.min(policy.backoffCapMs, policy.backoffBaseMs * 2 ** exponent);
}

export type RetryDecision =
  | { readonly kind: "retry"; readonly delayMs: number }
  | { readonly kind: "give_up"; readonly reason: "NOT_RETRYABLE" | "RETRY_EXHAUSTED" | "DEADLINE_EXCEEDED" };

export interface RetryInput {
  readonly attemptsDone: number;
  readonly errorCode: string;
  readonly nowMs: number;
  readonly deadlineMs: number;
  readonly policy: RetryPolicy;
}

/**
 * Retries only a retryable error, only while attempts remain, and only when the backoff still fits before the deadline.
 * A retry that would land after the deadline is not started.
 */
export function decideRetry(input: RetryInput): RetryDecision {
  if (!RETRYABLE_ERROR_CODES.has(input.errorCode)) return { kind: "give_up", reason: "NOT_RETRYABLE" };
  if (input.attemptsDone >= input.policy.maxAttempts) return { kind: "give_up", reason: "RETRY_EXHAUSTED" };
  const delayMs = backoffMs(input.attemptsDone, input.policy);
  if (input.nowMs + delayMs >= input.deadlineMs) return { kind: "give_up", reason: "DEADLINE_EXCEEDED" };
  return { kind: "retry", delayMs };
}
