import { describe, expect, it } from "vitest";
import type { ReviewCandidate } from "../../../src/modules/moderation-engine/review/ports.js";
import { eligibilityOf, selectForReview } from "../../../src/modules/moderation-engine/review/selection.js";
import { messageOf } from "./fixtures.js";

const NOW = "2026-11-11T07:00:00.000Z";
const FUTURE = "2026-11-11T09:00:00.000Z";
const PAST = "2026-11-11T06:30:00.000Z";

function candidateOf(messageId: string, overrides: Partial<ReviewCandidate> & { readonly order?: number } = {}): ReviewCandidate {
  const { order = 1, ...fields } = overrides;
  return {
    eventId: `event-${messageId}`,
    event: messageOf(messageId, { order }),
    settlementState: "UNSETTLED_FAST_PASS",
    settlementDeadlineAt: FUTURE,
    evidenceExpiresAt: FUTURE,
    exceptionMarked: false,
    deletionInProgress: false,
    manuallyDecided: false,
    ...fields,
  };
}

describe("eligibility of a fast-pass message", () => {
  it("allows an open message whose evidence and deadline are still valid", () => {
    expect(eligibilityOf(candidateOf("m1"), NOW)).toBeNull();
  });

  it("reports each reason that keeps a message out of review, deletion first", () => {
    expect(eligibilityOf(candidateOf("m1", { deletionInProgress: true, manuallyDecided: true }), NOW)).toBe("DELETION_IN_PROGRESS");
    expect(eligibilityOf(candidateOf("m1", { settlementState: "SETTLED" }), NOW)).toBe("NOT_UNSETTLED");
    expect(eligibilityOf(candidateOf("m1", { exceptionMarked: true }), NOW)).toBe("EXCEPTION");
    expect(eligibilityOf(candidateOf("m1", { manuallyDecided: true }), NOW)).toBe("MANUALLY_DECIDED");
  });

  it("treats passed evidence or a passed review deadline as expired", () => {
    expect(eligibilityOf(candidateOf("m1", { evidenceExpiresAt: PAST }), NOW)).toBe("EXPIRED");
    expect(eligibilityOf(candidateOf("m1", { settlementDeadlineAt: PAST }), NOW)).toBe("EXPIRED");
    expect(eligibilityOf(candidateOf("m1", { settlementDeadlineAt: null }), NOW)).toBeNull();
  });
});

describe("selectForReview", () => {
  it("selects only open fast-pass messages, in platform order", () => {
    const selection = selectForReview(
      [candidateOf("m3", { order: 3 }), candidateOf("m1", { order: 1 }), candidateOf("m2", { order: 2 })],
      NOW,
      10,
    );
    expect(selection.selected.map((item) => item.event.platformMessageId)).toEqual(["m1", "m2", "m3"]);
    expect(selection.expired).toEqual([]);
    expect(selection.skipped).toEqual([]);
  });

  it("stops at the cycle limit and leaves the rest for a later cycle without skipping them", () => {
    const selection = selectForReview(
      [candidateOf("m1", { order: 1 }), candidateOf("m2", { order: 2 }), candidateOf("m3", { order: 3 })],
      NOW,
      2,
    );
    expect(selection.selected.map((item) => item.event.platformMessageId)).toEqual(["m1", "m2"]);
    expect(selection.skipped).toEqual([]);
  });

  it("skips settled, deleted, excepted and manually decided messages with a reason", () => {
    const selection = selectForReview(
      [
        candidateOf("settled", { settlementState: "SETTLED", order: 1 }),
        candidateOf("deleted", { deletionInProgress: true, order: 2 }),
        candidateOf("excepted", { exceptionMarked: true, order: 3 }),
        candidateOf("decided", { manuallyDecided: true, order: 4 }),
      ],
      NOW,
      10,
    );
    expect(selection.selected).toEqual([]);
    expect(selection.skipped).toEqual([
      { eventId: "event-settled", reason: "NOT_UNSETTLED" },
      { eventId: "event-deleted", reason: "DELETION_IN_PROGRESS" },
      { eventId: "event-excepted", reason: "EXCEPTION" },
      { eventId: "event-decided", reason: "MANUALLY_DECIDED" },
    ]);
  });

  it("reports every expired message, even past the limit, and never selects it", () => {
    const selection = selectForReview(
      [candidateOf("m1", { evidenceExpiresAt: PAST, order: 1 }), candidateOf("m2", { order: 2 }), candidateOf("m3", { settlementDeadlineAt: PAST, order: 3 })],
      NOW,
      1,
    );
    expect(selection.expired.map((item) => item.event.platformMessageId)).toEqual(["m1", "m3"]);
    expect(selection.selected.map((item) => item.event.platformMessageId)).toEqual(["m2"]);
  });

  it("counts a repeated event once", () => {
    const first = candidateOf("m1");
    const selection = selectForReview([first, { ...first }], NOW, 10);
    expect(selection.selected).toHaveLength(1);
    expect(selection.skipped).toEqual([{ eventId: "event-m1", reason: "DUPLICATE" }]);
  });

  it("rejects a limit below one", () => {
    expect(() => selectForReview([], NOW, 0)).toThrow("REVIEW_CONFIG_INVALID: maxPerCycle");
  });
});
