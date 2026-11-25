import { createVerdict, messageLanguageOf, type InternalClassification, type ReviewItemResult, type Verdict } from "@voxward/contracts";
import type { CandidateProposal, ReviewRecord } from "./ports.js";

/**
 * The verdict a settled review item carries. The review result has no rule deductions, so a BLOCK takes the base
 * penalty only. The scoring engine applies the same mapping and the same clamping as the realtime path.
 */
export function verdictOf(classification: InternalClassification): Verdict {
  return createVerdict(classification, []);
}

/**
 * The scoring engine refuses a subject on the exception list with code SCORING_REFUSED. The module cannot import that
 * class, so it reads the code, as the realtime router does.
 */
export function isScoringRefusal(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, reason } = error as { code?: unknown; reason?: unknown };
  return code === "SCORING_REFUSED" && reason === "EXCEPTION_ACTIVE";
}

/** The review-list record of a BLOCK settlement (Q27). It names the event and the correlation id, never the text. */
export function reviewRecordOf(input: {
  readonly id: string;
  readonly channelId: string;
  readonly eventId: string;
  readonly correlationId: string;
  readonly createdAt: string;
}): ReviewRecord {
  return {
    id: input.id,
    channelId: input.channelId,
    eventId: input.eventId,
    correlationId: input.correlationId,
    classification: "BLOCK",
    source: "REVIEW_SETTLEMENT",
    createdAt: input.createdAt,
    humanState: "OPEN",
  };
}

/** Candidate terms of one settled item. Each one only becomes a proposal; nothing is published here. */
export function proposalsOf(
  item: ReviewItemResult,
  input: { readonly channelId: string; readonly correlationId: string; readonly taskId: string },
): CandidateProposal[] {
  return item.candidateTerms.map((candidate) => ({
    channelId: input.channelId,
    term: candidate.term,
    note: candidate.note ?? null,
    language: messageLanguageOf(candidate.term, candidate.language),
    sourceCorrelationId: input.correlationId,
    sourceTaskId: input.taskId,
  }));
}
