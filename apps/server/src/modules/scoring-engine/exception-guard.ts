import type { ScoreDecision, ScoreSubjectState } from "@voxward/contracts";

/**
 * Scoring-exception guard (proposal §11.4). Every scoring entry runs its decision through this wrapper, so a subject
 * on the exception list is refused before any rule is evaluated. No entry point can score the subject by skipping
 * the check, because the check is applied to the decision rather than to each caller.
 */
export function withExceptionGuard(
  decide: (state: ScoreSubjectState) => ScoreDecision,
): (state: ScoreSubjectState) => ScoreDecision {
  return (state) => (state.exceptionActive ? { kind: "refused", reason: "EXCEPTION_ACTIVE" } : decide(state));
}
