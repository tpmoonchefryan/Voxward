import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import {
  createScoringEngine,
  ScoringInputError,
  ScoringRefusedError,
  type ManualCorrection,
} from "../../../src/modules/scoring-engine/index.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";
import { ENABLED, ledgerRows, scoreOf, seedChannels, seedException, T0 } from "./helpers.js";

function correction(operationId: string, delta: number): ManualCorrection {
  return { channelId: "channel-a", subjectKey: "viewer-1", operationId, delta, operatorRef: "operator-1" };
}

describe("manual compensation on SQLite", () => {
  let directory = "";
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("scoring-compensation-");
    database = migratedDatabase(directory);
    seedChannels(database, ["channel-a"]);
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  function scoring(config = ENABLED) {
    return createScoringEngine({ ledger: createScoringLedgerPort(database), config, clock: () => new Date(T0) });
  }

  it("records a correction as a behavior adjustment, and a repeated operation identifier applies once", async () => {
    const engine = scoring();

    const first = await engine.applyManualCorrection(correction("op-1", 3));
    const again = await engine.applyManualCorrection(correction("op-1", 3));

    expect(first.delta).toBe(3);
    expect(again).toEqual(first);
    expect(ledgerRows(database, "channel-a", "viewer-1")).toMatchObject([
      { reason_code: "MANUAL_CORRECTION", requested_delta: 3, actual_delta: 3, idempotency_key: "manual:channel-a:viewer-1:op-1" },
    ]);
    expect(scoreOf(database, "channel-a", "viewer-1")).toMatchObject({ current: 3, behavior: 3, identity: 0 });
  });

  it("records only the part of a correction that fits within the limit", async () => {
    const engine = scoring();

    const change = await engine.applyManualCorrection(correction("op-big", 20));

    expect(change.delta).toBe(10);
    expect(ledgerRows(database, "channel-a", "viewer-1")).toMatchObject([
      { requested_delta: 20, actual_delta: 10 },
    ]);
  });

  it("refuses a correction for a subject on the exception list, and writes nothing", async () => {
    seedException(database, "channel-a", "viewer-1");
    const engine = scoring();

    await expect(engine.applyManualCorrection(correction("op-x", 3))).rejects.toBeInstanceOf(ScoringRefusedError);

    expect(ledgerRows(database, "channel-a", "viewer-1")).toHaveLength(0);
  });

  it("changes nothing for a zero correction, or while scoring is switched off", async () => {
    const engine = scoring();
    expect((await engine.applyManualCorrection(correction("op-zero", 0))).delta).toBe(0);

    const off = scoring({ ...ENABLED, enabled: false });
    expect((await off.applyManualCorrection(correction("op-off", 4))).delta).toBe(0);

    expect(ledgerRows(database, "channel-a", "viewer-1")).toHaveLength(0);
  });

  it("requires an operator reference and an integer delta", async () => {
    const engine = scoring();

    await expect(
      engine.applyManualCorrection({ ...correction("op-no-operator", 1), operatorRef: " " }),
    ).rejects.toMatchObject({ reason: "operatorRef" });
    await expect(engine.applyManualCorrection(correction("op-fraction", 1.5))).rejects.toBeInstanceOf(
      ScoringInputError,
    );
    expect(ledgerRows(database, "channel-a", "viewer-1")).toHaveLength(0);
  });
});
