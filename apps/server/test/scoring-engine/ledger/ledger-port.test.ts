import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import { createScoringEngine, ScoringRefusedError } from "../../../src/modules/scoring-engine/index.js";
import { countRows, migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";
import { makeEvent, seededRandom } from "../synthetic.js";
import { ENABLED, ledgerRows, scoreOf, seedChannels, seedException, T0 } from "./helpers.js";

describe("scoring ledger port on SQLite", () => {
  let directory = "";
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("scoring-ledger-");
    database = migratedDatabase(directory);
    seedChannels(database, ["channel-a", "channel-b"]);
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  function scoring() {
    return createScoringEngine({ ledger: createScoringLedgerPort(database), config: ENABLED, clock: () => new Date(T0) });
  }

  it("keeps the ledger equal to the stored score after a mixed run of verdicts", async () => {
    const engine = scoring();
    const random = seededRandom(42);
    const classes = ["ALLOW_MEANINGFUL", "ALLOW_NOISE", "BLOCK"] as const;
    let clock = Date.parse(T0);
    for (let step = 0; step < 80; step += 1) {
      clock += 60_000;
      const classification = classes[Math.floor(random() * classes.length)] ?? "ALLOW_NOISE";
      await engine.applyVerdict(
        makeEvent({ senderRef: "viewer-1", messageId: `m-${step}`, receivedAt: new Date(clock).toISOString() }),
        createVerdict(classification),
      );
    }

    const score = scoreOf(database, "channel-a", "viewer-1");
    const rows = ledgerRows(database, "channel-a", "viewer-1");
    expect(score).toBeDefined();
    expect(rows.reduce((sum, row) => sum + row.actual_delta, 0)).toBe(score?.current);
    expect(score?.current).toBe((score?.identity ?? 0) + (score?.behavior ?? 0));
    expect(score?.version).toBe(rows.length);
    expect(rows.every((row) => row.actual_delta !== 0)).toBe(true);
  });

  it("writes only the part of each change that fits, and nothing once a limit is reached", async () => {
    const engine = scoring();
    const steps = [
      { message: "s1", classification: "ALLOW_MEANINGFUL" },
      { message: "s2", classification: "ALLOW_MEANINGFUL" },
      { message: "s3", classification: "ALLOW_MEANINGFUL" },
      { message: "s4", classification: "ALLOW_MEANINGFUL" },
      { message: "s5", classification: "ALLOW_MEANINGFUL" },
      { message: "s6", classification: "ALLOW_MEANINGFUL" },
      { message: "s7", classification: "BLOCK" },
      { message: "s8", classification: "ALLOW_MEANINGFUL" },
      { message: "s9", classification: "ALLOW_MEANINGFUL" },
    ] as const;
    for (const step of steps) {
      await engine.applyVerdict(makeEvent({ senderRef: "viewer-2", messageId: step.message }), createVerdict(step.classification));
    }

    const rows = ledgerRows(database, "channel-a", "viewer-2");
    // Max 10. Five rewards of 2 reach 10. The sixth reward changes nothing. Penalty 3 gives 7, then 9, then 10 (partial).
    expect(rows.map((row) => row.actual_delta)).toEqual([2, 2, 2, 2, 2, -3, 2, 1]);
    expect(scoreOf(database, "channel-a", "viewer-2")?.current).toBe(10);
  });

  it("applies a repeated event once: one ledger row, one score change, and the same delta on every reply", async () => {
    const engine = scoring();
    const event = makeEvent({ senderRef: "viewer-3", messageId: "dup-1" });

    const first = await engine.applyVerdict(event, createVerdict("ALLOW_MEANINGFUL"));
    const second = await engine.applyVerdict(event, createVerdict("ALLOW_MEANINGFUL"));
    const third = await engine.applyVerdict(event, createVerdict("BLOCK"));

    expect(second).toEqual(first);
    expect(third.delta).toBe(first.delta);
    expect(ledgerRows(database, "channel-a", "viewer-3")).toHaveLength(1);
    expect(scoreOf(database, "channel-a", "viewer-3")?.current).toBe(2);
  });

  it("records no ledger row for noise, while the subject row is still created", async () => {
    const engine = scoring();

    const change = await engine.applyVerdict(makeEvent({ senderRef: "viewer-4" }), createVerdict("ALLOW_NOISE"));

    expect(change.delta).toBe(0);
    expect(ledgerRows(database, "channel-a", "viewer-4")).toHaveLength(0);
    expect(scoreOf(database, "channel-a", "viewer-4")?.current).toBe(0);
  });

  it("refuses a subject on the exception list on the realtime path, and writes nothing", async () => {
    seedException(database, "channel-a", "viewer-x");
    const engine = scoring();

    await expect(
      engine.applyVerdict(makeEvent({ senderRef: "viewer-x", messageId: "x-1" }), createVerdict("ALLOW_MEANINGFUL")),
    ).rejects.toBeInstanceOf(ScoringRefusedError);
    await expect(
      engine.applyVerdict(makeEvent({ senderRef: "viewer-x", messageId: "x-2" }), createVerdict("BLOCK")),
    ).rejects.toBeInstanceOf(ScoringRefusedError);

    expect(ledgerRows(database, "channel-a", "viewer-x")).toHaveLength(0);
    expect(scoreOf(database, "channel-a", "viewer-x")?.current).toBe(0);
  });

  it("keeps an exception in one channel from stopping scoring of the same account in another", async () => {
    seedException(database, "channel-a", "viewer-y");
    const engine = scoring();

    const change = await engine.applyVerdict(
      makeEvent({ channelId: "channel-b", senderRef: "viewer-y", messageId: "y-1" }),
      createVerdict("ALLOW_MEANINGFUL"),
    );

    expect(change.delta).toBe(2);
    expect(scoreOf(database, "channel-b", "viewer-y")?.current).toBe(2);
    expect(scoreOf(database, "channel-a", "viewer-y")?.current).toBe(0);
  });

  it("scores the same account in two channels into two separate ledgers", async () => {
    const engine = scoring();

    await engine.applyVerdict(makeEvent({ channelId: "channel-a", senderRef: "shared", messageId: "a-1" }), createVerdict("BLOCK"));
    await engine.applyVerdict(
      makeEvent({ channelId: "channel-b", senderRef: "shared", messageId: "b-1" }),
      createVerdict("ALLOW_MEANINGFUL"),
    );

    expect(ledgerRows(database, "channel-a", "shared").map((row) => row.actual_delta)).toEqual([-3]);
    expect(ledgerRows(database, "channel-b", "shared").map((row) => row.actual_delta)).toEqual([2]);
  });

  it("stores the reward time of an effective reward and leaves it alone for a penalty", async () => {
    const engine = scoring();
    await engine.applyVerdict(
      makeEvent({ senderRef: "viewer-5", messageId: "r-1", receivedAt: "2026-11-10T10:05:00.000Z" }),
      createVerdict("ALLOW_MEANINGFUL"),
    );
    await engine.applyVerdict(
      makeEvent({ senderRef: "viewer-5", messageId: "p-1", receivedAt: "2026-11-10T10:06:00.000Z" }),
      createVerdict("BLOCK"),
    );

    expect(scoreOf(database, "channel-a", "viewer-5")?.lastRewardAt).toBe("2026-11-10T10:05:00.000Z");
  });

  it("rolls back a transaction whose decision throws, so no subject row is left behind", () => {
    const port = createScoringLedgerPort(database);
    const before = countRows(database, "subjects");

    expect(() =>
      port.commitScoreDecision({
        subject: { channelId: "channel-a", subjectKey: "ghost" },
        idempotencyKey: "ghost-1",
        committedAt: T0,
        decide: () => {
          throw new Error("decision failed");
        },
      }),
    ).toThrow("decision failed");

    expect(countRows(database, "subjects")).toBe(before);
    expect(countRows(database, "score_ledger")).toBe(0);
  });
});
