export interface ScoreBounds {
  readonly minScore: number;
  readonly maxScore: number;
}

export interface ClampedChange {
  readonly nextScore: number;
  /** The change that really takes effect: nextScore − currentScore. The clamped-off part is not included. */
  readonly actualDelta: number;
}

/** Keeps a value inside the score range. Used for the final score, which is the clamped sum of two parts. */
export function clampScore(value: number, bounds: ScoreBounds): number {
  return Math.min(Math.max(value, bounds.minScore), bounds.maxScore);
}

/**
 * Proposal §5.1: nextScore = clamp(currentScore + requestedDelta, min, max), actualDelta = nextScore − currentScore.
 * The bounds are applied to the running score, so a change past a limit affects only the part that fits.
 */
export function applyClampedDelta(currentScore: number, requestedDelta: number, bounds: ScoreBounds): ClampedChange {
  const nextScore = clampScore(currentScore + requestedDelta, bounds);
  return { nextScore, actualDelta: nextScore - currentScore };
}
