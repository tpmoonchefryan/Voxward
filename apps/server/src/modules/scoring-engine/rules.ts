import type { InternalClassification, PenaltyHit } from "@voxward/contracts";
import type { ScoringConfig } from "./config.js";

/** The code of the base penalty rule that every BLOCK verdict triggers. Its points are `violationPenalty`. */
export const VERDICT_BLOCK_RULE = "VERDICT_BLOCK";

/**
 * Largest applicable deduction. Overlapping rules do not add up, so one message with three hits loses only
 * the biggest of the three penalties. An empty list means no deduction.
 */
export function selectPenalty(hits: readonly PenaltyHit[]): number {
  let largest = 0;
  for (const hit of hits) {
    if (!Number.isSafeInteger(hit.points) || hit.points < 0) {
      throw new RangeError("penalty points must be a non-negative integer");
    }
    largest = Math.max(largest, hit.points);
  }
  return largest;
}

/** What the rule table says about one classification, before clamping and cooldown. */
export type RuleAction =
  | { readonly kind: "reward"; readonly requested: number }
  | { readonly kind: "penalty"; readonly requested: number }
  | { readonly kind: "none" };

/**
 * What the rule table says about one classification. A BLOCK applies the largest of its base penalty and the
 * deductions of the rule groups that hit the message (S006 Q22). Other classifications ignore the hits.
 */
export function ruleForClassification(
  classification: InternalClassification,
  config: ScoringConfig,
  penaltyHits: readonly PenaltyHit[],
): RuleAction {
  switch (classification) {
    case "ALLOW_MEANINGFUL":
      return { kind: "reward", requested: config.complianceReward };
    case "BLOCK": {
      const points = selectPenalty([{ code: VERDICT_BLOCK_RULE, points: config.violationPenalty }, ...penaltyHits]);
      return { kind: "penalty", requested: -points };
    }
    case "ALLOW_NOISE":
      return { kind: "none" };
  }
}
