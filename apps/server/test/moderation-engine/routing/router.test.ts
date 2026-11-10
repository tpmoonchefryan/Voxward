import { CONTRACT_VERSION, type ChannelEvent, type Verdict } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  createInMemoryExceptionQueue,
  createModerationChecker,
  createReviewRouter,
  exceptionKeyOf,
  ProcessingTransitionError,
  type RoutingFacts,
  toStoredTaskStatus,
} from "../../../src/modules/moderation-engine/index.js";
import type { RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";
import { createScoringEngine } from "../../../src/modules/scoring-engine/index.js";
import { FakeLedger } from "../../scoring-engine/fake-ledger.js";

const CHANNEL = "channel-1";
const SENDER = "viewer-1";

/** Synthetic rules only. A BLOCK group, a heavy deduction and a light deduction. */
const RULES: RuleSetInput = {
  version: "v1",
  groups: [
    { id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "exact-badword", kind: "exact", text: "badword" }] },
    { id: "heavy", action: { kind: "DEDUCT", deduction: 9 }, rules: [{ id: "heavy-spam", kind: "normalized", text: "spamword" }] },
    { id: "light", action: { kind: "DEDUCT", deduction: 2 }, rules: [{ id: "light-spam", kind: "normalized", text: "minorword" }] },
  ],
};

/** Violation penalty 5 and no reward cooldown, so the expected deltas are easy to read. */
const SCORING = { enabled: true, minScore: -50, maxScore: 50, complianceReward: 1, violationPenalty: 5, rewardCooldownMs: 0 };

const PLAIN: RoutingFacts = { exceptionMarked: false, paidText: false, whitelisted: false, score: null };

let counter = 0;

function eventWith(body: string, senderRef: string = SENDER): ChannelEvent {
  counter += 1;
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: CHANNEL,
    platformMessageId: `message-${counter}`,
    platformOrder: counter,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: `correlation-${counter}`,
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef },
  };
}

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("expected a value");
  return value;
}

function harness(fastPassThreshold: number | null = null) {
  const ledger = new FakeLedger();
  const exceptionQueue = createInMemoryExceptionQueue();
  const checker = createModerationChecker({
    ruleSet: RULES,
    nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") },
    now: () => 0,
  });
  const router = createReviewRouter({
    checker,
    scoring: createScoringEngine({ ledger, config: SCORING }),
    exceptionQueue,
    options: { fastPassThreshold },
  });
  return { ledger, exceptionQueue, router };
}

function penaltyCodes(verdict: Verdict | null): Array<{ code: string; points: number }> {
  return [...must(verdict).penaltyHits].sort((a, b) => a.code.localeCompare(b.code));
}

describe("basic-check decisions on the realtime path", () => {
  it("applies a BLOCK with the largest deduction among the hits, and the largest is what the ledger records", async () => {
    const { ledger, router } = harness();
    const outcome = await router.route(eventWith("spamword minorword badword"), PLAIN);
    expect(outcome).toMatchObject({ state: "DONE", source: "BASE_RULE", downstream: "BLOCK", settlement: "NONE" });
    expect(penaltyCodes(outcome.verdict)).toEqual([
      { code: "heavy", points: 9 },
      { code: "light", points: 2 },
    ]);
    expect(outcome.scoring).toEqual({ status: "APPLIED", delta: -9 });
    expect(ledger.stateOf(CHANNEL, SENDER)?.currentScore).toBe(-9);
  });

  it("keeps a deduction through the review, so a model BLOCK applies that deduction", async () => {
    const { ledger, router } = harness();
    const event = eventWith("spamword hello");
    const queued = await router.route(event, PLAIN);
    expect(queued).toMatchObject({
      state: "QUEUED",
      downstream: null,
      scoring: { status: "NOT_CALLED", reason: "NO_VERDICT" },
      ruleVersion: "v1",
    });
    expect(must(queued.review).penaltyHits).toEqual([{ code: "heavy", points: 9 }]);

    const running = await router.transition(event, must(queued.review), "START");
    const done = await router.complete(event, must(running.review), { source: "MODEL", classification: "BLOCK" });
    expect(done).toMatchObject({ state: "DONE", source: "MODEL", downstream: "BLOCK", scoring: { status: "APPLIED", delta: -9 } });
    expect(ledger.stateOf(CHANNEL, SENDER)?.currentScore).toBe(-9);
  });

  it("keeps the basic check's review reasons for audit", async () => {
    const { router } = harness();
    const outcome = await router.route(eventWith("x".repeat(600)), PLAIN);
    expect(outcome).toMatchObject({ state: "QUEUED", downstream: null });
    expect(outcome.reasons).toEqual(["INPUT_TOO_LONG"]);
    expect(outcome.plan).toMatchObject({ kind: "REVIEW", reason: "BASE_REVIEW" });
  });

  it("awards the reward for a model ALLOW_MEANINGFUL, and leaves the score alone for ALLOW_NOISE", async () => {
    const { ledger, router } = harness();
    const first = eventWith("hello there");
    const queuedFirst = await router.route(first, PLAIN);
    const runningFirst = await router.transition(first, must(queuedFirst.review), "START");
    const rewarded = await router.complete(first, must(runningFirst.review), {
      source: "MODEL",
      classification: "ALLOW_MEANINGFUL",
    });
    expect(rewarded).toMatchObject({ downstream: "ALLOW", scoring: { status: "APPLIED", delta: 1 } });

    const second = eventWith("nice stream");
    const queuedSecond = await router.route(second, PLAIN);
    const runningSecond = await router.transition(second, must(queuedSecond.review), "START");
    const noise = await router.complete(second, must(runningSecond.review), { source: "MODEL", classification: "ALLOW_NOISE" });
    expect(noise.scoring).toEqual({ status: "APPLIED", delta: 0 });
    expect(ledger.stateOf(CHANNEL, SENDER)?.currentScore).toBe(1);
  });
});

describe("fast lanes", () => {
  it("fast-passes a message at the score threshold with the unsettled marker, and never scores it", async () => {
    const { ledger, router } = harness(5);
    const outcome = await router.route(eventWith("hello there"), { ...PLAIN, score: 5 });
    expect(outcome).toMatchObject({
      state: "DONE",
      source: "FAST_PASS",
      settlement: "UNSETTLED_FAST_PASS",
      downstream: "ALLOW",
      scoring: { status: "NOT_CALLED", reason: "FAST_PASS" },
    });
    expect(outcome.verdict?.classification).toBe("ALLOW_NOISE");
    expect(ledger.calls).toBe(0);

    const below = await router.route(eventWith("hello there"), { ...PLAIN, score: 4 });
    expect(below).toMatchObject({ state: "QUEUED", downstream: null });
  });

  it("allows deterministic noise without a score effect", async () => {
    const { ledger, router } = harness();
    const outcome = await router.route(eventWith("www 😂😂"), PLAIN);
    expect(outcome).toMatchObject({
      state: "DONE",
      source: "FAST_PASS",
      settlement: "NONE",
      downstream: "ALLOW",
      scoring: { status: "NOT_CALLED", reason: "FAST_PASS" },
    });
    expect(outcome.plan).toMatchObject({ reason: "NOISE" });
    expect(ledger.calls).toBe(0);
  });

  it("allows a whitelisted message without marking it as a checked meaningful one", async () => {
    const { ledger, router } = harness(5);
    const outcome = await router.route(eventWith("hello there"), { ...PLAIN, whitelisted: true, score: 50 });
    expect(outcome).toMatchObject({ source: "FAST_PASS", settlement: "NONE", downstream: "ALLOW" });
    expect(outcome.plan).toMatchObject({ reason: "WHITELIST" });
    expect(ledger.calls).toBe(0);
  });

  it("sends paid text to safety review even when whitelisted and above the fast-pass score", async () => {
    const { ledger, router } = harness(5);
    const outcome = await router.route(eventWith("thanks for the stream"), {
      ...PLAIN,
      paidText: true,
      whitelisted: true,
      score: 50,
    });
    expect(outcome).toMatchObject({ state: "QUEUED", downstream: null });
    expect(must(outcome.review).taskKind).toBe("PAID_TEXT_REVIEW");
    expect(ledger.calls).toBe(0);
  });
});

describe("exception subjects", () => {
  it("registers the message before the basic check, reviews it, and settles the entry with the model verdict", async () => {
    const { ledger, exceptionQueue, router } = harness(5);
    ledger.markException(CHANNEL, SENDER, true);
    const event = eventWith("www");
    const queued = await router.route(event, { ...PLAIN, exceptionMarked: true, whitelisted: true, score: 50 });
    expect(queued.plan).toMatchObject({ kind: "REVIEW", reason: "EXCEPTION" });
    expect(exceptionQueue.openEntries().map((entry) => entry.correlationId)).toEqual([event.correlationId]);

    const running = await router.transition(event, must(queued.review), "START");
    const done = await router.complete(event, must(running.review), { source: "MODEL", classification: "ALLOW_MEANINGFUL" });
    expect(done.scoring).toEqual({ status: "REFUSED", reason: "EXCEPTION_ACTIVE" });
    expect(ledger.entries).toHaveLength(0);
    expect(exceptionQueue.openEntries()).toEqual([]);
    expect(exceptionQueue.entry(exceptionKeyOf(event))?.resolution).toBe("MODEL");
  });

  it("closes an exception message at once when the basic check blocks it, with no score change", async () => {
    const { ledger, exceptionQueue, router } = harness();
    ledger.markException(CHANNEL, SENDER, true);
    const event = eventWith("badword");
    const outcome = await router.route(event, { ...PLAIN, exceptionMarked: true });
    expect(outcome).toMatchObject({
      state: "DONE",
      source: "BASE_RULE",
      downstream: "BLOCK",
      scoring: { status: "REFUSED", reason: "EXCEPTION_ACTIVE" },
    });
    expect(exceptionQueue.openEntries()).toEqual([]);
    expect(exceptionQueue.entry(exceptionKeyOf(event))?.resolution).toBe("BASE_BLOCK");
  });

  it("settles a discarded exception item as DISCARDED", async () => {
    const { exceptionQueue, router } = harness();
    const event = eventWith("hello there");
    const queued = await router.route(event, { ...PLAIN, exceptionMarked: true });
    const discarded = await router.transition(event, must(queued.review), "DISCARD");
    expect(discarded).toMatchObject({ state: "DISCARDED", review: null, downstream: null });
    expect(exceptionQueue.openEntries()).toEqual([]);
    expect(exceptionQueue.entry(exceptionKeyOf(event))?.resolution).toBe("DISCARDED");
  });
});

describe("system failure and human takeover", () => {
  it("keeps a system failure open, with no verdict, no downstream output and no score change", async () => {
    const { ledger, router } = harness();
    const event = eventWith("hello there");
    const queued = await router.route(event, PLAIN);
    const running = await router.transition(event, must(queued.review), "START");
    const failed = await router.transition(event, must(running.review), "SYSTEM_FAILURE");
    expect(failed).toMatchObject({ state: "SYSTEM_FAILED", verdict: null, downstream: null, scoring: { status: "NOT_CALLED" } });
    expect(toStoredTaskStatus(failed.state)).toBe("PENDING_REVIEW");
    expect(ledger.calls).toBe(0);
  });

  it("lets a failed item be retried, escalated, taken over by a person, and decided by that person", async () => {
    const { ledger, router } = harness();
    const event = eventWith("hello there");
    const queued = await router.route(event, PLAIN);
    const started = await router.transition(event, must(queued.review), "START");
    const failed = await router.transition(event, must(started.review), "SYSTEM_FAILURE");
    const retried = await router.transition(event, must(failed.review), "RETRY");
    expect(retried.state).toBe("QUEUED");
    const restarted = await router.transition(event, must(retried.review), "START");
    const failedAgain = await router.transition(event, must(restarted.review), "SYSTEM_FAILURE");
    const escalated = await router.transition(event, must(failedAgain.review), "ESCALATE");
    expect(escalated.state).toBe("PENDING_REVIEW");
    const takenOver = await router.transition(event, must(escalated.review), "TAKE_OVER");
    expect(takenOver.state).toBe("MANUAL_TAKEOVER");

    const decided = await router.complete(event, must(takenOver.review), { source: "MANUAL", classification: "BLOCK" });
    expect(decided).toMatchObject({ state: "DONE", source: "MANUAL", downstream: "BLOCK", scoring: { status: "APPLIED", delta: -5 } });
    expect(ledger.stateOf(CHANNEL, SENDER)?.currentScore).toBe(-5);
  });

  it("refuses a final decision that the item's state does not allow, and changes nothing", async () => {
    const { ledger, router } = harness();
    const event = eventWith("hello there");
    const queued = await router.route(event, PLAIN);
    await expect(
      router.complete(event, must(queued.review), { source: "MODEL", classification: "ALLOW_NOISE" }),
    ).rejects.toThrow(ProcessingTransitionError);
    expect(ledger.calls).toBe(0);
  });
});

describe("scoring errors", () => {
  it("does not swallow a scoring failure that is not a refusal", async () => {
    const checker = createModerationChecker({
      ruleSet: RULES,
      nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") },
      now: () => 0,
    });
    const router = createReviewRouter({
      checker,
      scoring: { applyVerdict: () => Promise.reject(new Error("ledger unavailable")) },
      exceptionQueue: createInMemoryExceptionQueue(),
      options: { fastPassThreshold: null },
    });
    await expect(router.route(eventWith("badword"), PLAIN)).rejects.toThrow("ledger unavailable");
  });
});
