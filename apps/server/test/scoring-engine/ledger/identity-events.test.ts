import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import {
  createScoringEngine,
  ScoringInputError,
  ScoringRefusedError,
  type IdentityTransition,
  type ManualCorrection,
  type ScoringConfigOverrides,
} from "../../../src/modules/scoring-engine/index.js";
import { createVerdict } from "@voxward/contracts";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";
import { makeEvent } from "../synthetic.js";
import { ENABLED, identityRows, ledgerRows, scoreOf, seedChannels, seedException, T0 } from "./helpers.js";

function upgrade(sourceEventRef: string, nextKind: IdentityTransition["nextKind"]): IdentityTransition {
  return { channelId: "channel-a", subjectKey: "viewer-1", sourceEventRef, effectiveFrom: T0, nextKind };
}

/** Puts the score at a known value through the manual-correction path, which moves the behavior total as well. */
function correction(operationId: string, delta: number): ManualCorrection {
  return { channelId: "channel-a", subjectKey: "viewer-1", operationId, operatorRef: "operator-1", delta };
}

describe("identity events on SQLite", () => {
  let directory = "";
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("scoring-identity-");
    database = migratedDatabase(directory);
    seedChannels(database, ["channel-a", "channel-b"]);
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  function scoring(config: ScoringConfigOverrides = ENABLED) {
    return createScoringEngine({ ledger: createScoringLedgerPort(database), config, clock: () => new Date(T0) });
  }

  it("adds the configured difference once, and a re-delivery of the same event adds nothing", async () => {
    const engine = scoring();

    const first = await engine.applyIdentityTransition(upgrade("evt-1", "PAID_MEMBER"));
    const again = await engine.applyIdentityTransition(upgrade("evt-1", "PAID_MEMBER"));

    expect(first.delta).toBe(10);
    expect(again).toEqual(first);
    expect(ledgerRows(database, "channel-a", "viewer-1").map((row) => [row.reason_code, row.actual_delta])).toEqual([
      ["IDENTITY_BASE_CHANGE", 10],
    ]);
    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: 10, identity: 10 });
    expect(identityRows(database)).toEqual([{ kind: "PAID_MEMBER", sourceEventRef: "identity:channel-a:viewer-1:evt-1", effectiveTo: null }]);
  });

  it("gives nothing when an existing member is identified again by a new event", async () => {
    const engine = scoring();
    await engine.applyIdentityTransition(upgrade("evt-1", "PAID_MEMBER"));

    const repeat = await engine.applyIdentityTransition(upgrade("evt-2", "PAID_MEMBER"));

    expect(repeat.delta).toBe(0);
    expect(ledgerRows(database, "channel-a", "viewer-1")).toHaveLength(1);
    expect(identityRows(database)).toHaveLength(1);
    expect(scoreOf(database, "channel-a", "viewer-1")?.current).toBe(10);
  });

  it("lowers the identity base on a downgrade and keeps the behavior history", async () => {
    const wide = { ...ENABLED, minScore: -100, maxScore: 100 };
    const engine = scoring(wide);
    await engine.applyVerdict(makeEvent({ senderRef: "viewer-1", messageId: "r-1" }), createVerdict("ALLOW_MEANINGFUL"));
    await engine.applyIdentityTransition(upgrade("evt-up", "PAID_MEMBER"));

    const down = await engine.applyIdentityTransition(upgrade("evt-down", "UNKNOWN"));

    expect(down.delta).toBe(-10);
    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: 2, behavior: 2, identity: 0 });
    expect(ledgerRows(database, "channel-a", "viewer-1").map((row) => row.actual_delta)).toEqual([2, 10, -10]);
    expect(identityRows(database).map((row) => [row.kind, row.effectiveTo])).toEqual([
      ["PAID_MEMBER", T0],
      ["UNKNOWN", null],
    ]);
  });

  it("records only the part of an identity change that fits within the limit", async () => {
    const config: ScoringConfigOverrides = {
      ...ENABLED,
      identityBaseScores: { ...ENABLED.identityBaseScores, MODERATOR: 30 },
    };
    const engine = scoring(config);

    const change = await engine.applyIdentityTransition(upgrade("evt-mod", "MODERATOR"));

    expect(change.delta).toBe(10);
    expect(ledgerRows(database, "channel-a", "viewer-1")).toMatchObject([
      { reason_code: "IDENTITY_BASE_CHANGE", requested_delta: 30, actual_delta: 10 },
    ]);
    // The base takes the whole requested difference. The score shows only the part that fits under the limit.
    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: 10, identity: 30 });
  });

  it("at the upper limit, an upgrade and its later expiry leave the score and the behavior history unchanged", async () => {
    const engine = scoring();
    await engine.applyManualCorrection(correction("op-cap", 10));
    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: 10, behavior: 10, identity: 0 });

    const upgrade_ = await engine.applyIdentityTransition(upgrade("evt-cap-up", "PAID_MEMBER"));
    expect(upgrade_.delta).toBe(0);
    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: 10, behavior: 10, identity: 10 });

    const expiry = await engine.applyIdentityTransition(upgrade("evt-cap-down", "UNKNOWN"));
    expect(expiry.delta).toBe(0);
    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: 10, behavior: 10, identity: 0 });
    expect(ledgerRows(database, "channel-a", "viewer-1")).toMatchObject([
      { reason_code: "MANUAL_CORRECTION", requested_delta: 10, actual_delta: 10 },
      { reason_code: "IDENTITY_BASE_CHANGE", requested_delta: 10, actual_delta: 0 },
      { reason_code: "IDENTITY_BASE_CHANGE", requested_delta: -10, actual_delta: 0 },
    ]);
  });

  it("at the lower limit, the same round trip is exact in the other direction", async () => {
    const engine = scoring();
    await engine.applyManualCorrection(correction("op-floor", -10));

    const upgrade_ = await engine.applyIdentityTransition(upgrade("evt-floor-up", "PAID_MEMBER"));
    expect(upgrade_.delta).toBe(10);
    const expiry = await engine.applyIdentityTransition(upgrade("evt-floor-down", "UNKNOWN"));
    expect(expiry.delta).toBe(-10);

    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: -10, behavior: -10, identity: 0 });
  });

  it("refuses an identity event for a subject on the exception list, and records no identity fact", async () => {
    seedException(database, "channel-a", "viewer-1");
    const engine = scoring();

    await expect(engine.applyIdentityTransition(upgrade("evt-x", "PAID_MEMBER"))).rejects.toBeInstanceOf(
      ScoringRefusedError,
    );

    expect(identityRows(database)).toHaveLength(0);
    expect(ledgerRows(database, "channel-a", "viewer-1")).toHaveLength(0);
  });

  it("records the identity fact but moves no score while scoring is switched off", async () => {
    const engine = scoring({ ...ENABLED, enabled: false });

    const change = await engine.applyIdentityTransition(upgrade("evt-off", "PAID_MEMBER"));

    expect(change.delta).toBe(0);
    expect(identityRows(database)).toEqual([{ kind: "PAID_MEMBER", sourceEventRef: "identity:channel-a:viewer-1:evt-off", effectiveTo: null }]);
    expect(ledgerRows(database, "channel-a", "viewer-1")).toHaveLength(0);
    expect(scoreOf(database, "channel-a", "viewer-1")?.current).toBe(0);
  });

  it("rejects an unknown identity kind or an unreadable time before storage is touched", async () => {
    const engine = scoring();

    await expect(
      engine.applyIdentityTransition({ ...upgrade("evt-bad", "PAID_MEMBER"), nextKind: "GHOST" as never }),
    ).rejects.toMatchObject({ reason: "nextKind" });
    await expect(
      engine.applyIdentityTransition({ ...upgrade("evt-bad-2", "PAID_MEMBER"), effectiveFrom: "not-a-time" }),
    ).rejects.toBeInstanceOf(ScoringInputError);

    expect(identityRows(database)).toHaveLength(0);
  });
});
