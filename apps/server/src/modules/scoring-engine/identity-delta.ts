import type { IdentityKind } from "@voxward/contracts";

/**
 * Identity base-score difference for a transition from one identity to another (proposal §5.2).
 * A downgrade or an expiry gives a negative difference. The difference changes only the identity base score,
 * so a re-identification never overwrites the behavior history.
 */
export function identityBaseDelta(
  previous: IdentityKind,
  next: IdentityKind,
  baseScores: Readonly<Record<IdentityKind, number>>,
): number {
  return baseScores[next] - baseScores[previous];
}
