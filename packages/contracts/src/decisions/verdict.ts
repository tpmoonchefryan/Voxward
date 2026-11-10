import { CONTRACT_VERSION, type Versioned } from "../version.js";

/** The only verdicts a downstream consumer receives. */
export const DOWNSTREAM_VERDICTS = ["ALLOW", "BLOCK"] as const;
export type DownstreamVerdict = (typeof DOWNSTREAM_VERDICTS)[number];

/** Internal classification. It never leaves VoxWard; only its mapped verdict does. */
export const INTERNAL_CLASSIFICATIONS = ["ALLOW_MEANINGFUL", "ALLOW_NOISE", "BLOCK"] as const;
export type InternalClassification = (typeof INTERNAL_CLASSIFICATIONS)[number];

/**
 * A deduction that a matched rule group would apply to the message. `points` is the size of the deduction, not a
 * signed delta. A BLOCK verdict takes the largest applicable deduction once; the scoring module does the selection.
 */
export interface PenaltyHit {
  readonly code: string;
  readonly points: number;
}

export interface Verdict extends Versioned {
  readonly classification: InternalClassification;
  readonly downstream: DownstreamVerdict;
  /** Deductions of the rule groups that hit the message. Empty when no rule group deducts. */
  readonly penaltyHits: readonly PenaltyHit[];
}

/** Maps each internal classification to a downstream verdict. */
export function toDownstreamVerdict(classification: InternalClassification): DownstreamVerdict {
  switch (classification) {
    case "ALLOW_MEANINGFUL":
    case "ALLOW_NOISE":
      return "ALLOW";
    case "BLOCK":
      return "BLOCK";
  }
}

export function createVerdict(
  classification: InternalClassification,
  penaltyHits: readonly PenaltyHit[] = [],
): Verdict {
  return {
    contractVersion: CONTRACT_VERSION,
    classification,
    downstream: toDownstreamVerdict(classification),
    penaltyHits: [...penaltyHits],
  };
}
