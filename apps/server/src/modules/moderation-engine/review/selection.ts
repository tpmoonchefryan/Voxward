import type { ReviewCandidate } from "./ports.js";
import { ReviewConfigError } from "./triggers.js";

/**
 * Why a message may not be settled now. The same check runs when a cycle selects a message and when a result is
 * about to be committed, so a message that changed in between is not settled.
 */
export const INELIGIBLE_REASONS = [
  "DELETION_IN_PROGRESS",
  "NOT_UNSETTLED",
  "EXCEPTION",
  "MANUALLY_DECIDED",
  "EXPIRED",
] as const;
export type IneligibleReason = (typeof INELIGIBLE_REASONS)[number];

/** Null when the message may be settled. `EXPIRED` means the evidence or the review deadline has passed. */
export function eligibilityOf(candidate: ReviewCandidate, nowIso: string): IneligibleReason | null {
  if (candidate.deletionInProgress) return "DELETION_IN_PROGRESS";
  if (candidate.settlementState !== "UNSETTLED_FAST_PASS") return "NOT_UNSETTLED";
  if (candidate.exceptionMarked) return "EXCEPTION";
  if (candidate.manuallyDecided) return "MANUALLY_DECIDED";
  const now = Date.parse(nowIso);
  const evidenceGone = Date.parse(candidate.evidenceExpiresAt) <= now;
  const reviewDeadlinePassed =
    candidate.settlementDeadlineAt !== null && Date.parse(candidate.settlementDeadlineAt) <= now;
  return evidenceGone || reviewDeadlinePassed ? "EXPIRED" : null;
}

export interface SelectionSkip {
  readonly eventId: string;
  readonly reason: IneligibleReason | "DUPLICATE";
}

export interface Selection {
  /** Messages this cycle enqueues, in platform order, at most `limit`. */
  readonly selected: readonly ReviewCandidate[];
  /** Messages whose evidence or deadline passed. The caller marks them UNSETTLED_EXPIRED without a score. */
  readonly expired: readonly ReviewCandidate[];
  /** Messages excluded for another reason. Eligible messages beyond `limit` are in neither list. */
  readonly skipped: readonly SelectionSkip[];
}

/**
 * Chooses the messages for one cycle. Expired messages are all reported, because marking them does not depend on the
 * cycle limit. Duplicate entries for one event count once.
 */
export function selectForReview(candidates: readonly ReviewCandidate[], nowIso: string, limit: number): Selection {
  if (!Number.isInteger(limit) || limit < 1) throw new ReviewConfigError("maxPerCycle");
  const seen = new Set<string>();
  const selected: ReviewCandidate[] = [];
  const expired: ReviewCandidate[] = [];
  const skipped: SelectionSkip[] = [];

  for (const candidate of [...candidates].sort(byPlatformOrder)) {
    if (seen.has(candidate.eventId)) {
      skipped.push({ eventId: candidate.eventId, reason: "DUPLICATE" });
      continue;
    }
    seen.add(candidate.eventId);

    const reason = eligibilityOf(candidate, nowIso);
    if (reason === "EXPIRED") {
      expired.push(candidate);
    } else if (reason !== null) {
      skipped.push({ eventId: candidate.eventId, reason });
    } else if (selected.length < limit) {
      selected.push(candidate);
    }
  }
  return { selected, expired, skipped };
}

function byPlatformOrder(a: ReviewCandidate, b: ReviewCandidate): number {
  const byOrder = a.event.platformOrder - b.event.platformOrder;
  if (byOrder !== 0) return byOrder;
  return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
}
