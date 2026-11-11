import { describe, expect, it } from "vitest";
import { batchMembershipErrorOf } from "../../../src/modules/moderation-engine/review/membership.js";
import { type ModelAnswer, messageOf, reviewHarness } from "./fixtures.js";

const CHANNEL = { channelId: "ch-1", streamEnded: false } as const;

const allow = (itemId: string) => ({ itemId, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], candidateTerms: [] });
const block = (itemId: string) => ({ itemId, verdict: "BLOCK", reasonCodes: ["HARASSMENT"], candidateTerms: [] });

type Fixture = ReturnType<typeof reviewHarness>;

/** Two messages in one batch. Batch ids follow the queue order: e-m1 is `i0`, e-m2 is `i1`. */
async function twoMessages(answer: ModelAnswer): Promise<Fixture> {
  const f = reviewHarness();
  f.store.seed({ eventId: "e-m1", event: messageOf("m1", { order: 1 }) });
  f.store.seed({ eventId: "e-m2", event: messageOf("m2", { order: 2, senderRef: "viewer-2" }) });
  f.model.respondWith(answer);
  await f.runner.runCycle(CHANNEL);
  return f;
}

/** The whole batch fails with `errorCode`: nothing is settled, scored, recorded for a person or proposed (VW-R-008). */
async function expectWholeBatchHeld(f: Fixture, errorCode: string): Promise<void> {
  const outcome = await f.runner.runBatch();
  expect(outcome?.items).toEqual([
    expect.objectContaining({ status: "FAILED", errorCode }),
    expect.objectContaining({ status: "FAILED", errorCode }),
  ]);
  expect(f.store.stateOf("e-m1")).toBe("UNSETTLED_FAST_PASS");
  expect(f.store.stateOf("e-m2")).toBe("UNSETTLED_FAST_PASS");
  expect(f.store.writes).toHaveLength(0);
  expect(f.ledger.calls).toBe(0);
  expect(f.reviewQueue.records).toHaveLength(0);
  expect(f.candidates.proposals).toHaveLength(0);
  for (const item of outcome?.items ?? []) {
    expect(await f.h.coordinator.statusOf(item.taskId)).toBe("PENDING_REVIEW");
  }
}

describe("batch-level contract of a review answer (VW-R-008)", () => {
  it("fails the whole batch on a duplicate item id, even when the first answer is a BLOCK", async () => {
    const f = await twoMessages(() => ({ items: [block("i0"), { ...allow("i0"), candidateTerms: [{ term: "phrase-x" }] }] }));

    await expectWholeBatchHeld(f, "AI_OUTPUT_INVALID");
  });

  it("fails the whole batch when an item is missing", async () => {
    const f = await twoMessages(() => ({ items: [block("i0")] }));

    await expectWholeBatchHeld(f, "AI_OUTPUT_INCOMPLETE");
  });

  it("fails the whole batch on an item id outside the batch", async () => {
    const f = await twoMessages(() => ({ items: [allow("i0"), block("i99")] }));

    await expectWholeBatchHeld(f, "AI_OUTPUT_INVALID");
  });
});

describe("batchMembershipErrorOf", () => {
  const batch = ["i0", "i1"];

  it("accepts an answer that names each item once, in any order", () => {
    expect(batchMembershipErrorOf(["i1", "i0"], batch)).toBeNull();
  });

  it("reports a duplicate, an id outside the batch, and an empty answer as incomplete or invalid", () => {
    expect(batchMembershipErrorOf(["i0", "i0"], batch)).toBe("AI_OUTPUT_INVALID");
    expect(batchMembershipErrorOf(["i0", "i99"], batch)).toBe("AI_OUTPUT_INVALID");
    expect(batchMembershipErrorOf(["i0"], batch)).toBe("AI_OUTPUT_INCOMPLETE");
    expect(batchMembershipErrorOf([], batch)).toBe("AI_OUTPUT_INCOMPLETE");
  });
});
