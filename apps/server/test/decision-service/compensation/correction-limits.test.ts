import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  countWhere,
  decisionService,
  moderator,
  openDecisionDatabase,
  scoreOf,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../fixtures.js";

// Q49 (N4): a correction keeps the ledger's amount. When a later entry of the same subject reached a score limit, the
// correction is marked for a manual check and the result says so (proposal 7.1).
describe("a correction is marked when a later entry reached a score limit (Q49)", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("decision-correction-limits-");
    seedChannel(db.database, "channel-a");
    for (const index of [1, 2, 3, 4, 5]) {
      seedOpenTask(db.database, {
        channelId: "channel-a",
        subjectKey: "viewer-1",
        subjectId: "subject-1",
        eventId: `event-${index}`,
        platformMessageRef: `msg-${index}`,
        taskId: `task-${index}`,
      });
    }
  });

  afterEach(() => db.close());

  it("a correction with no later entry at a limit is not marked", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    await service.commit("task-2", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });

    const outcome = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    expect(outcome).toMatchObject({ status: "overturned", compensation: "applied", compensationDelta: 3, needsManualAdjustment: false });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-3);
  });

  it("a later entry clamped at the floor marks the correction, which keeps the ledger amount", async () => {
    // Five BLOCKs of -3 with a floor of -10: the fourth is clamped to -1. Correcting the first gives +3, so the score is -7.
    // A replay of the ledger without the first entry ends at -10.
    const service = decisionService(db.database);
    for (let index = 1; index <= 5; index += 1) {
      await service.commit(`task-${index}`, createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    }
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-10);

    const outcome = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    expect(outcome).toMatchObject({ status: "overturned", compensation: "applied", compensationDelta: 3, needsManualAdjustment: true });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-7);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM change_logs WHERE change_kind = 'SCORE_CHANGED' AND summary = '纠分需人工调整：其后有条目触及上下限'")).toBe(1);
  });

  it("a later entry clamped in the ledger marks the correction even with no no-effect result after it", async () => {
    // Four BLOCKs: the fourth is clamped to -1 in the ledger and no later entry produces a no-effect result.
    // Only the ledger check can see it.
    const service = decisionService(db.database);
    for (let index = 1; index <= 4; index += 1) {
      await service.commit(`task-${index}`, createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    }

    const outcome = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    expect(outcome).toMatchObject({ status: "overturned", compensation: "applied", compensationDelta: 3, needsManualAdjustment: true });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_outcomes WHERE reason_code = 'CLAMPED'")).toBe(0);
  });

  it("a later entry that changed nothing because the floor was already reached also marks the correction", async () => {
    // The fifth BLOCK finds the score at the floor, so it is recorded as a no-effect result with no ledger row. Correcting
    // the fourth entry (-1) gives +1. A replay would let the fifth BLOCK take -1 from the floor.
    const service = decisionService(db.database);
    for (let index = 1; index <= 5; index += 1) {
      await service.commit(`task-${index}`, createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    }

    const outcome = await service.overturn({ eventId: "event-4", operationId: "op-4", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    expect(outcome).toMatchObject({ status: "overturned", compensation: "applied", compensationDelta: 1, needsManualAdjustment: true });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-9);
  });
});
