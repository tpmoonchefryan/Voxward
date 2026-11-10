export interface ScoreBounds {
  readonly minScore: number;
  readonly maxScore: number;
}

export interface ClampedChange {
  readonly nextScore: number;
  /** The change that really takes effect: nextScore − currentScore. The clamped-off part is not included. */
  readonly actualDelta: number;
}

/**
 * Proposal §5.1: nextScore = clamp(currentScore + requestedDelta, min, max), actualDelta = nextScore − currentScore.
 * The bounds are applied to the running score, so a change past a limit affects only the part that fits.
 */
export function applyClampedDelta(currentScore: number, requestedDelta: number, bounds: ScoreBounds): ClampedChange {
  const target = currentScore + requestedDelta;
  const nextScore = Math.min(Math.max(target, bounds.minScore), bounds.maxScore);
  return { nextScore, actualDelta: nextScore - currentScore };
}
