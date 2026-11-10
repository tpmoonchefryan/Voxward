import { CONTRACT_VERSION, type Versioned } from "../version.js";

/** The only verdicts a downstream consumer receives. */
export const DOWNSTREAM_VERDICTS = ["ALLOW", "BLOCK"] as const;
export type DownstreamVerdict = (typeof DOWNSTREAM_VERDICTS)[number];

/** Internal classification. It never leaves VoxWard; only its mapped verdict does. */
export const INTERNAL_CLASSIFICATIONS = ["ALLOW_MEANINGFUL", "ALLOW_NOISE", "BLOCK"] as const;
export type InternalClassification = (typeof INTERNAL_CLASSIFICATIONS)[number];

export interface Verdict extends Versioned {
  readonly classification: InternalClassification;
  readonly downstream: DownstreamVerdict;
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

export function createVerdict(classification: InternalClassification): Verdict {
  return {
    contractVersion: CONTRACT_VERSION,
    classification,
    downstream: toDownstreamVerdict(classification),
  };
}
