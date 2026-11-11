/**
 * Triggers of a review cycle (proposal section 5.4): the end of a stream, a count of open messages, or a period. The
 * proposal names the three kinds but no numbers, so the defaults below are implementation choices (自定).
 */
export const REVIEW_TRIGGERS = ["STREAM_END", "COUNT", "PERIOD"] as const;
export type ReviewTrigger = (typeof REVIEW_TRIGGERS)[number];

export interface ReviewPolicy {
  /** Time between periodic cycles, in milliseconds. */
  readonly periodMs: number;
  /** Open messages at which a count cycle starts. */
  readonly countThreshold: number;
  /** Most messages one cycle enqueues. The rest wait for the next cycle. */
  readonly maxPerCycle: number;
}

export const DEFAULT_REVIEW_POLICY: ReviewPolicy = {
  periodMs: 10 * 60 * 1000,
  countThreshold: 50,
  maxPerCycle: 50,
};

/** A review setting is not a usable value. The message names the key only. */
export class ReviewConfigError extends Error {
  readonly code = "REVIEW_CONFIG_INVALID";

  constructor(readonly key: string) {
    super(`REVIEW_CONFIG_INVALID: ${key}`);
    this.name = "ReviewConfigError";
  }
}

export function resolveReviewPolicy(overrides: Partial<ReviewPolicy> = {}): ReviewPolicy {
  const policy: ReviewPolicy = { ...DEFAULT_REVIEW_POLICY, ...overrides };
  const checks: ReadonlyArray<readonly [keyof ReviewPolicy, number]> = [
    ["periodMs", policy.periodMs],
    ["countThreshold", policy.countThreshold],
    ["maxPerCycle", policy.maxPerCycle],
  ];
  for (const [key, value] of checks) {
    if (!Number.isInteger(value) || value < 1) throw new ReviewConfigError(key);
  }
  return policy;
}

export interface TriggerFacts {
  readonly nowMs: number;
  /** When the last cycle of this channel started, or null when none has run in this process. */
  readonly lastCycleMs: number | null;
  /** Messages still waiting for a review in this channel. */
  readonly openCount: number;
  readonly streamEnded: boolean;
}

/**
 * Returns the trigger that starts a cycle, or null. Nothing waiting means no cycle. Priority: the end of a stream,
 * then the count, then the period, so the most urgent reason is the one recorded.
 */
export function decideReviewTrigger(facts: TriggerFacts, policy: ReviewPolicy): ReviewTrigger | null {
  if (facts.openCount === 0) return null;
  if (facts.streamEnded) return "STREAM_END";
  if (facts.openCount >= policy.countThreshold) return "COUNT";
  if (facts.lastCycleMs === null || facts.nowMs - facts.lastCycleMs >= policy.periodMs) return "PERIOD";
  return null;
}
