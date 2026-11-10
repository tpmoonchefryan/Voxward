import { createVerdict, type Verdict } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  createScoringEngine,
  ScoringConfigError,
  ScoringInputError,
} from "../../../src/modules/scoring-engine/index.js";
import { FakeLedger } from "../fake-ledger.js";
import { makeEvent } from "../synthetic.js";

const ENABLED = {
  enabled: true,
  minScore: -10,
  maxScore: 10,
  complianceReward: 2,
  violationPenalty: 3,
  rewardCooldownMs: 0,
};

describe("createScoringEngine.applyVerdict", () => {
  it("returns the applied change, keyed by the event", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger, config: ENABLED });

    const change = await engine.applyVerdict(makeEvent({ messageId: "msg-1" }), createVerdict("ALLOW_MEANINGFUL"));

    expect(change).toMatchObject({
      contractVersion: "1",
      delta: 2,
      idempotencyKey: "event:channel-a:msg-1",
    });
    expect(change.subjectRef).not.toBe("");
    expect(ledger.entries).toHaveLength(1);
  });

  it("changes the score once when the same event is delivered again, and returns the same delta", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger, config: ENABLED });
    const event = makeEvent({ messageId: "msg-dup" });

    const first = await engine.applyVerdict(event, createVerdict("ALLOW_MEANINGFUL"));
    const second = await engine.applyVerdict(event, createVerdict("ALLOW_MEANINGFUL"));

    expect(second).toEqual(first);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.stateOf("channel-a", "sender-1")?.currentScore).toBe(2);
  });

  it("scores the same account in two channels as two independent subjects", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger, config: ENABLED });

    const inA = await engine.applyVerdict(
      makeEvent({ channelId: "channel-a", messageId: "a-1", senderRef: "shared" }),
      createVerdict("BLOCK"),
    );
    const inB = await engine.applyVerdict(
      makeEvent({ channelId: "channel-b", messageId: "b-1", senderRef: "shared" }),
      createVerdict("ALLOW_MEANINGFUL"),
    );

    expect(inA.subjectRef).not.toBe(inB.subjectRef);
    expect(ledger.stateOf("channel-a", "shared")?.currentScore).toBe(-3);
    expect(ledger.stateOf("channel-b", "shared")?.currentScore).toBe(2);
  });

  it("returns zero for noise and writes nothing", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger, config: ENABLED });

    const change = await engine.applyVerdict(makeEvent(), createVerdict("ALLOW_NOISE"));

    expect(change.delta).toBe(0);
    expect(ledger.entries).toHaveLength(0);
  });

  it("rejects an unknown classification before any storage call, so a failed model output scores nothing", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger, config: ENABLED });
    const broken = { contractVersion: "1", classification: "TIMEOUT", downstream: "ALLOW" } as unknown as Verdict;

    await expect(engine.applyVerdict(makeEvent(), broken)).rejects.toThrow(ScoringInputError);
    expect(ledger.calls).toBe(0);
  });

  it("rejects a downstream value that does not match its classification", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger, config: ENABLED });
    const mismatched = { contractVersion: "1", classification: "BLOCK", downstream: "ALLOW" } as unknown as Verdict;

    await expect(engine.applyVerdict(makeEvent(), mismatched)).rejects.toMatchObject({ reason: "downstream" });
    expect(ledger.calls).toBe(0);
  });

  it("rejects an event whose receive time cannot be read", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger, config: ENABLED });

    await expect(
      engine.applyVerdict(makeEvent({ receivedAt: "not-a-time" }), createVerdict("BLOCK")),
    ).rejects.toMatchObject({ reason: "receivedAt" });
    expect(ledger.calls).toBe(0);
  });

  it("changes nothing unless the configuration switches scoring on", async () => {
    const ledger = new FakeLedger();
    const engine = createScoringEngine({ ledger });

    const change = await engine.applyVerdict(makeEvent(), createVerdict("ALLOW_MEANINGFUL"));

    expect(change.delta).toBe(0);
    expect(ledger.entries).toHaveLength(0);
  });

  it("fails at creation when the configuration is invalid", () => {
    expect(() => createScoringEngine({ ledger: new FakeLedger(), config: { minScore: 5 } })).toThrow(ScoringConfigError);
  });

  it("stays on the placeholder message when no ledger is bound", async () => {
    const engine = createScoringEngine();
    await expect(engine.applyVerdict(makeEvent(), createVerdict("BLOCK"))).rejects.toThrow(
      "MODULE_NOT_IMPLEMENTED: ScoringEngine.applyVerdict",
    );
  });
});
