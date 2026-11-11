import { createVerdict, type ChannelEvent } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import { createScoringEngine } from "../../../src/modules/scoring-engine/index.js";
import { countWhere, openDecisionDatabase, type OpenDatabase } from "../../decision-service/fixtures.js";
import { ENABLED, identityRows, ledgerRows, scoreOf, seedChannels, seedException, T0 } from "./helpers.js";

const MINUTE = 60_000;

function event(messageId: string, receivedAt: string, channelId = "channel-a"): ChannelEvent {
  return {
    contractVersion: "1",
    platform: "youtube",
    channelId,
    platformMessageId: messageId,
    platformOrder: 1,
    receivedAt,
    correlationId: `corr-${messageId}`,
    body: "",
    sender: { contractVersion: "1", senderRef: "viewer-1" },
  };
}

function engineWith(db: OpenDatabase["database"], overrides: Partial<typeof ENABLED> = {}) {
  return createScoringEngine({
    ledger: createScoringLedgerPort(db),
    config: { ...ENABLED, ...overrides },
    clock: () => new Date(T0),
  });
}

describe("scoring port records requests that changed no score (Q19①)", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("scoring-outcomes-");
    seedChannels(db.database, ["channel-a"]);
  });

  afterEach(() => db.close());

  it("a no-effect verdict leaves a record, so a later retry of the same event cannot score it", async () => {
    const engine = engineWith(db.database);

    const first = await engine.applyVerdict(event("m1", T0), createVerdict("ALLOW_NOISE"));
    const retry = await engine.applyVerdict(event("m1", T0), createVerdict("ALLOW_MEANINGFUL"));

    expect(first.delta).toBe(0);
    expect(retry.delta).toBe(0);
    expect(ledgerRows(db.database, "channel-a", "viewer-1")).toEqual([]);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_outcomes WHERE idempotency_key = 'event:channel-a:m1' AND reason_code = 'NOISE'")).toBe(1);
  });

  it("an event that was in cooldown is not scored when the cooldown later ends", async () => {
    const engine = engineWith(db.database, { rewardCooldownMs: MINUTE });

    await engine.applyVerdict(event("m1", T0), createVerdict("ALLOW_MEANINGFUL"));
    const cooled = await engine.applyVerdict(event("m2", new Date(Date.parse(T0) + 10_000).toISOString()), createVerdict("ALLOW_MEANINGFUL"));
    const later = await engine.applyVerdict(event("m2", new Date(Date.parse(T0) + 2 * MINUTE).toISOString()), createVerdict("ALLOW_MEANINGFUL"));

    expect(cooled.delta).toBe(0);
    expect(later.delta).toBe(0);
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toEqual(expect.objectContaining({ current: 2 }));
    expect(ledgerRows(db.database, "channel-a", "viewer-1")).toHaveLength(1);
  });
});

describe("scoring port refuses an excepted subject (Q21)", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("scoring-exception-");
    seedChannels(db.database, ["channel-a"]);
    seedException(db.database, "channel-a", "viewer-1");
  });

  afterEach(() => db.close());

  it("the port itself writes nothing for an excepted subject, even when the caller skips the module guard", () => {
    const result = createScoringLedgerPort(db.database).commitScoreDecision({
      subject: { channelId: "channel-a", subjectKey: "viewer-1" },
      idempotencyKey: "manual:bypass",
      committedAt: T0,
      decide: () => ({
        kind: "write",
        write: {
          reasonCode: "MANUAL_CORRECTION",
          requestedDelta: 3,
          actualDelta: 3,
          nextIdentityBaseScore: 0,
          nextBehaviorAdjustTotal: 3,
          nextCurrentScore: 3,
          lastRewardAt: null,
          ruleVersion: null,
          verdictRef: null,
          correlationId: null,
        },
      }),
    });

    expect(result).toMatchObject({ status: "refused", reason: "EXCEPTION_ACTIVE" });
    expect(ledgerRows(db.database, "channel-a", "viewer-1")).toEqual([]);
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toEqual(expect.objectContaining({ current: 0 }));
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_outcomes WHERE outcome = 'REFUSED'")).toBe(1);
  });
});

describe("manual corrections and identity events are keyed by channel and subject (Q19②)", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("scoring-keys-");
    seedChannels(db.database, ["channel-a", "channel-b"]);
  });

  afterEach(() => db.close());

  it("the same operation identifier applies once per channel, not once in the whole database", async () => {
    const engine = engineWith(db.database);
    const correction = (channelId: string) => ({ channelId, subjectKey: "viewer-1", operationId: "op-1", delta: 3, operatorRef: "mod-1" });

    const a = await engine.applyManualCorrection(correction("channel-a"));
    const b = await engine.applyManualCorrection(correction("channel-b"));
    const again = await engine.applyManualCorrection(correction("channel-a"));

    expect(a.delta).toBe(3);
    expect(b.delta).toBe(3);
    expect(again.delta).toBe(3);
    expect(ledgerRows(db.database, "channel-a", "viewer-1")).toHaveLength(1);
    expect(ledgerRows(db.database, "channel-b", "viewer-1")).toHaveLength(1);
  });

  it("the same platform reference in two channels is two identity changes", async () => {
    const engine = engineWith(db.database);
    const transition = (channelId: string) => ({
      channelId,
      subjectKey: "viewer-1",
      sourceEventRef: "evt-9",
      effectiveFrom: T0,
      nextKind: "PAID_MEMBER" as const,
    });

    await engine.applyIdentityTransition(transition("channel-a"));
    await engine.applyIdentityTransition(transition("channel-b"));
    await engine.applyIdentityTransition(transition("channel-a"));

    expect(identityRows(db.database).map((row) => row.sourceEventRef).sort()).toEqual([
      "identity:channel-a:viewer-1:evt-9",
      "identity:channel-b:viewer-1:evt-9",
    ]);
  });
});
