import { createScoringEngine } from "../../../src/modules/scoring-engine/index.js";
import type { ScoringPort } from "../../../src/modules/moderation-engine/review/ports.js";
import { eventOf, keyOfEvent, START } from "../../task-coordinator/helpers.js";
import { FakeLedger } from "../../scoring-engine/fake-ledger.js";
import { describe, expect, it } from "vitest";
import { messageOf, MemoryReviewStore, reviewHarness } from "./fixtures.js";

const CHANNEL = { channelId: "ch-1", streamEnded: false } as const;
const EXPIRED_EVIDENCE = "2026-11-11T05:00:00.000Z";

const allow = (itemId: string) => ({ itemId, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], candidateTerms: [] });
const block = (itemId: string) => ({ itemId, verdict: "BLOCK", reasonCodes: ["HARASSMENT"], candidateTerms: [] });

describe("review cycle", () => {
  it("enqueues open messages in the BACKGROUND lane and marks expired ones without a score", async () => {
    const { h, store, ledger, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1", { order: 1 }) });
    store.seed({ eventId: "e-m2", event: messageOf("m2", { order: 2 }), evidenceExpiresAt: EXPIRED_EVIDENCE });
    store.seed({ eventId: "e-m3", event: messageOf("m3", { order: 3 }), state: "SETTLED" });

    const cycle = await runner.runCycle(CHANNEL);

    expect(cycle).toMatchObject({ trigger: "PERIOD", enqueued: 1, expired: 1 });
    expect(store.stateOf("e-m2")).toBe("UNSETTLED_EXPIRED");
    const batch = await h.coordinator.takeBatch();
    expect(batch?.lane).toBe("BACKGROUND");
    expect(batch?.tasks.map((task) => task.correlationId)).toEqual(["corr-ch-1-m1"]);
    expect(ledger.calls).toBe(0);
  });

  it("starts no cycle while nothing is waiting", async () => {
    const { runner } = reviewHarness();
    expect(await runner.runCycle(CHANNEL)).toEqual({ trigger: null, enqueued: 0, expired: 0, skipped: [] });
  });

  it("enqueues at most the per-cycle limit, and the rest in the next cycle", async () => {
    const { h, store, runner } = reviewHarness({ policy: { periodMs: 1000, countThreshold: 50, maxPerCycle: 1 } });
    store.seed({ eventId: "e-m1", event: messageOf("m1", { order: 1 }) });
    store.seed({ eventId: "e-m2", event: messageOf("m2", { order: 2 }) });

    expect((await runner.runCycle(CHANNEL)).enqueued).toBe(1);
    expect((await runner.runBatch())?.items[0]).toMatchObject({ status: "SETTLED", eventId: "e-m1" });
    h.clock.advance(1000);
    expect((await runner.runCycle(CHANNEL)).enqueued).toBe(1);
    expect((await runner.runBatch())?.items[0]).toMatchObject({ status: "SETTLED", eventId: "e-m2" });
  });
});

describe("settlement", () => {
  it("settles a meaningful message once and scores it once", async () => {
    const { store, ledger, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);

    const outcome = await runner.runBatch();

    expect(outcome?.items).toEqual([
      expect.objectContaining({ status: "SETTLED", eventId: "e-m1", classification: "ALLOW_MEANINGFUL", scoring: "APPLIED" }),
    ]);
    expect(store.stateOf("e-m1")).toBe("SETTLED");
    expect(ledger.calls).toBe(1);
    const scoreBefore = ledger.stateOf("ch-1", "viewer-1")?.currentScore;
    expect(await runner.resumePendingScoring()).toBe(0);
    expect(ledger.stateOf("ch-1", "viewer-1")?.currentScore).toBe(scoreBefore);
  });

  it("writes a review record and a human queue entry for a BLOCK, and nothing for an allow (Q27)", async () => {
    const { store, reviewQueue, model, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1", { order: 1 }) });
    store.seed({ eventId: "e-m2", event: messageOf("m2", { order: 2, senderRef: "viewer-2" }) });
    model.respondWith((input) => ({ items: input.items.map((item, index) => (index === 0 ? block(item.itemId) : allow(item.itemId))) }));
    await runner.runCycle(CHANNEL);

    const outcome = await runner.runBatch();

    expect(outcome?.items.map((item) => item.status)).toEqual(["SETTLED", "SETTLED"]);
    expect(reviewQueue.records).toHaveLength(1);
    expect(reviewQueue.records[0]).toMatchObject({
      eventId: "e-m1",
      channelId: "ch-1",
      correlationId: "corr-ch-1-m1",
      classification: "BLOCK",
      source: "REVIEW_SETTLEMENT",
      humanState: "OPEN",
    });
    expect(JSON.stringify(reviewQueue.records[0])).not.toContain("synthetic text");
  });

  it("does not settle or score a message that a person decided first", async () => {
    const { store, ledger, candidates, model, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    model.respondWith((input) => ({
      items: input.items.map((item) => ({ ...allow(item.itemId), candidateTerms: [{ term: "candidate-x" }] })),
    }));
    await runner.runCycle(CHANNEL);
    store.decideManually("e-m1");

    const outcome = await runner.runBatch();

    expect(outcome?.items[0]).toMatchObject({ status: "NOT_ELIGIBLE", reason: "MANUALLY_DECIDED" });
    expect(store.stateOf("e-m1")).toBe("UNSETTLED_FAST_PASS");
    expect(ledger.calls).toBe(0);
    expect(candidates.proposals).toEqual([]);
  });

  it("does not settle a message whose deletion started during the review", async () => {
    const { store, ledger, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);
    store.markDeletionInProgress("e-m1");

    expect((await runner.runBatch())?.items[0]).toMatchObject({ status: "NOT_ELIGIBLE", reason: "DELETION_IN_PROGRESS" });
    expect(store.stateOf("e-m1")).toBe("UNSETTLED_FAST_PASS");
    expect(ledger.calls).toBe(0);
  });

  it("discards a result when the coordinator sees deleted data, and writes nothing", async () => {
    const { h, store, ledger, runner } = reviewHarness();
    const event = messageOf("m1");
    store.seed({ eventId: "e-m1", event });
    await runner.runCycle(CHANNEL);
    h.facts.deleteData(keyOfEvent(event));

    expect((await runner.runBatch())?.items[0]).toMatchObject({ status: "DISCARDED", reason: "DATA_DELETED" });
    expect(store.writes).toHaveLength(0);
    expect(ledger.calls).toBe(0);
  });

  it("does not settle a result that arrives after the review deadline, and marks the message expired later", async () => {
    const { h, store, ledger, runner } = reviewHarness({ policy: { periodMs: 1000, countThreshold: 50, maxPerCycle: 50 } });
    store.seed({ eventId: "e-m1", event: messageOf("m1"), settlementDeadlineAt: h.clock.at(1000) });
    await runner.runCycle(CHANNEL);
    h.clock.advance(5000);

    expect(await runner.runBatch()).toBeNull();
    expect(await runner.runCycle(CHANNEL)).toMatchObject({ trigger: "PERIOD", enqueued: 0, expired: 1 });
    expect(store.stateOf("e-m1")).toBe("UNSETTLED_EXPIRED");
    expect(ledger.calls).toBe(0);
  });

  it("sends a model outage to the human queue and settles nothing", async () => {
    const { h, store, ledger, model, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);
    model.failNextCall();

    const outcome = await runner.runBatch();

    expect(outcome?.items[0]).toMatchObject({ status: "FAILED", errorCode: "MODEL_CALL_FAILED" });
    const taskId = outcome?.items[0]?.taskId ?? "";
    expect(await h.coordinator.statusOf(taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(taskId)).toBe("MODEL_CALL_FAILED");
    expect(store.stateOf("e-m1")).toBe("UNSETTLED_FAST_PASS");
    expect(ledger.calls).toBe(0);
  });

  it("sends output that does not validate to the human queue and settles nothing", async () => {
    const { store, ledger, model, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);
    model.respondWith(() => ({ items: "not-a-list" }));

    expect((await runner.runBatch())?.items[0]).toMatchObject({ status: "FAILED", errorCode: "AI_OUTPUT_INVALID" });
    expect(store.stateOf("e-m1")).toBe("UNSETTLED_FAST_PASS");
    expect(ledger.calls).toBe(0);
  });

  it("sends the model an author alias and the text, never the sender reference", async () => {
    const { store, model, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1", { senderRef: "viewer-secret-7" }) });
    await runner.runCycle(CHANNEL);

    await runner.runBatch();

    const [item] = model.inputs[0]?.items ?? [];
    expect(item?.text).toMatch(/^\[a-nonce-1-1\] synthetic text$/u);
    expect(JSON.stringify(model.inputs)).not.toContain("viewer-secret-7");
  });

  it("records candidate terms only for a committed settlement", async () => {
    const { store, candidates, model, runner } = reviewHarness();
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    model.respondWith((input) => ({
      items: input.items.map((item) => ({ ...allow(item.itemId), candidateTerms: [{ term: "phrase-x", note: "seen once" }] })),
    }));
    await runner.runCycle(CHANNEL);

    await runner.runBatch();

    expect(candidates.proposals).toEqual([
      { channelId: "ch-1", term: "phrase-x", note: "seen once", language: "und", sourceCorrelationId: "corr-ch-1-m1", sourceTaskId: expect.any(String) },
    ]);
  });

  it("includes the language hint and carries the candidate's own canonical tag", async () => {
    const { store, candidates, model, runner } = reviewHarness();
    store.seed({ eventId: "e-lang", event: { ...messageOf("lang"), body: "ありがとう", language: "ja" } });
    model.respondWith((input) => ({
      items: input.items.map((item) => ({ ...allow(item.itemId), candidateTerms: [{ term: "ça", language: "FR-ca" }] })),
    }));
    await runner.runCycle(CHANNEL);
    await runner.runBatch();
    expect(model.inputs[0]?.items[0]).toMatchObject({ language: "ja" });
    expect(candidates.proposals[0]?.language).toBe("fr-CA");
  });
});

describe("scoring after settlement", () => {
  it("keeps a failed score pending, and a resume applies it exactly once", async () => {
    const ledger = new FakeLedger();
    const real = createScoringEngine({ ledger, clock: () => new Date(START) });
    let failures = 1;
    const flaky: ScoringPort = {
      applyVerdict: async (event, verdict) => {
        if (failures > 0) {
          failures -= 1;
          throw new Error("synthetic ledger outage");
        }
        return real.applyVerdict(event, verdict);
      },
    };
    const { store, runner } = reviewHarness({ scoring: flaky, ledger });
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);

    expect((await runner.runBatch())?.items[0]).toMatchObject({ status: "SETTLED", scoring: "PENDING" });
    expect(store.stateOf("e-m1")).toBe("SETTLED");
    expect(ledger.calls).toBe(0);

    expect(await runner.resumePendingScoring()).toBe(1);
    expect(store.scoringOf("e-m1")).toBe("APPLIED");
    expect(ledger.calls).toBe(1);
    const scoreAfterOne = ledger.stateOf("ch-1", "viewer-1")?.currentScore;
    expect(await runner.resumePendingScoring()).toBe(0);
    expect(ledger.stateOf("ch-1", "viewer-1")?.currentScore).toBe(scoreAfterOne);
  });

  it("does not score a pending message whose data was deleted in the meantime", async () => {
    const ledger = new FakeLedger();
    const flaky: ScoringPort = {
      applyVerdict: async () => {
        throw new Error("synthetic ledger outage");
      },
    };
    const { store, runner } = reviewHarness({ scoring: flaky, ledger });
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);
    await runner.runBatch();
    store.markDeletionInProgress("e-m1");

    expect(await runner.resumePendingScoring()).toBe(0);
    expect(store.scoringOf("e-m1")).toBe("NOT_REQUIRED");
    expect(ledger.calls).toBe(0);
  });

  it("records a refusal for an exception subject and writes no score", async () => {
    const ledger = new FakeLedger();
    ledger.markException("ch-1", "viewer-1", true);
    const { store, runner } = reviewHarness({ ledger });
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);

    expect((await runner.runBatch())?.items[0]).toMatchObject({ status: "SETTLED", scoring: "REFUSED" });
    expect(store.scoringOf("e-m1")).toBe("REFUSED");
    expect(ledger.entries).toHaveLength(0);
  });
});

describe("two writers of one message", () => {
  it("settles and scores the message once when two review tasks reach the same message", async () => {
    const store = new MemoryReviewStore();
    const ledger = new FakeLedger();
    const first = reviewHarness({ store, ledger });
    const second = reviewHarness({ store, ledger });
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await first.runner.runCycle(CHANNEL);
    await second.runner.runCycle(CHANNEL);

    const a = await first.runner.runBatch();
    const b = await second.runner.runBatch();

    expect(a?.items[0]).toMatchObject({ status: "SETTLED", scoring: "APPLIED" });
    expect(b?.items[0]).toMatchObject({ status: "NOT_ELIGIBLE", reason: "NOT_UNSETTLED" });
    expect(store.writes).toHaveLength(1);
    expect(ledger.calls).toBe(1);
  });

  it("keeps a later cycle from re-enqueuing a message already settled", async () => {
    const { h, store, runner } = reviewHarness({ policy: { periodMs: 1000, countThreshold: 50, maxPerCycle: 50 } });
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);
    await runner.runBatch();
    h.clock.advance(1000);

    expect(await runner.runCycle(CHANNEL)).toMatchObject({ trigger: null, enqueued: 0 });
  });
});

describe("lanes shared with the coordinator (VW-R-006)", () => {
  it("takes nothing while a realtime task is ready, then only its own tasks once the realtime path has taken it", async () => {
    const { h, store, runner } = reviewHarness();
    const realtime = await h.coordinator.enqueueInLane("REALTIME", eventOf({ platformMessageId: "rt-1", platformOrder: 9 }), h.clock.at(60_000));
    store.seed({ eventId: "e-m1", event: messageOf("m1") });
    await runner.runCycle(CHANNEL);

    expect(await runner.runBatch()).toBeNull();
    expect(await h.coordinator.statusOf(realtime.taskId)).toBe("QUEUED");
    expect(store.stateOf("e-m1")).toBe("UNSETTLED_FAST_PASS");

    expect((await h.coordinator.takeBatch({ lanes: ["PAID", "REALTIME"] }))?.lane).toBe("REALTIME");
    const outcome = await runner.runBatch();

    expect(outcome?.items).toEqual([expect.objectContaining({ status: "SETTLED", eventId: "e-m1" })]);
    expect(await h.coordinator.statusOf(realtime.taskId)).toBe("RUNNING");
    expect(await h.coordinator.reasonOf(realtime.taskId)).toBeNull();
  });
});
