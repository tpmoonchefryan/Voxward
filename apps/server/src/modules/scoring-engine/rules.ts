import type { InternalClassification } from "@voxward/contracts";
import type { ScoringConfig } from "./config.js";

/** One applicable penalty rule. `points` is the size of the deduction, not a signed delta. */
export interface PenaltyHit {
  readonly code: string;
  readonly points: number;
}

/** The code of the single penalty rule that a BLOCK verdict triggers today. */
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

export function ruleForClassification(classification: InternalClassification, config: ScoringConfig): RuleAction {
  switch (classification) {
    case "ALLOW_MEANINGFUL":
      return { kind: "reward", requested: config.complianceReward };
    case "BLOCK": {
      const points = selectPenalty([{ code: VERDICT_BLOCK_RULE, points: config.violationPenalty }]);
      return { kind: "penalty", requested: -points };
    }
    case "ALLOW_NOISE":
      return { kind: "none" };
  }
}
