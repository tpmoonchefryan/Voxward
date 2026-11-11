import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SubjectStore } from "../../../src/db/repository.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { createDecisionService } from "../../../src/modules/decision-service/index.js";
import {
  countWhere,
  CHANGE_EXPIRES_AT,
  dataAdmin,
  decisionDeps,
  decisionService,
  moderator,
  openDecisionDatabase,
  scoreOf,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../fixtures.js";

// VW-SUB027-AC001: 无旧结果重建或机械加回配置分；补发必须明确且受有效期限制；名单/词条操作按权限拒绝。
describe("review corrects the score from the ledger (VW-SUB027-AC001)", () => {
  let db: OpenDatabase;

  function seedEvent(index: number): void {
    seedOpenTask(db.database, {
      channelId: "channel-a",
      subjectKey: "viewer-1",
      subjectId: "subject-1",
      eventId: `event-${index}`,
      platformMessageRef: `msg-${index}`,
      taskId: `task-${index}`,
    });
  }

  beforeEach(() => {
    db = openDecisionDatabase("decision-overturn-");
    seedChannel(db.database, "channel-a");
    seedEvent(1);
  });

  afterEach(() => db.close());

  it("a misjudged block is overturned, and the score returns by the ledger's actual change", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-3);

    const outcome = await service.overturn({
      eventId: "event-1",
      operationId: "op-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      actor: moderator("mod-1"),
    });

    expect(outcome).toMatchObject({
      status: "overturned",
      seq: 2,
      downstream: "ALLOW",
      compensation: "applied",
      compensationDelta: 3,
      intent: null,
    });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts WHERE is_current = 1")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_ledger WHERE idempotency_key = 'compensation:channel-a:msg-1' AND reason_code = 'MANUAL_CORRECTION' AND actual_delta = 3")).toBe(1);
  });

  it("the Change Log names the outcome of each step and carries no score", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    const rows = db.database.sqlite.prepare("SELECT change_kind, summary FROM change_logs ORDER BY rowid").all() as {
      change_kind: string;
      summary: string;
    }[];

    expect(rows).toEqual([
      { change_kind: "MANUAL_VERDICT", summary: "人工裁决：拦截" },
      { change_kind: "MANUAL_VERDICT", summary: "复核改判：拦截 → 放行" },
      { change_kind: "SCORE_CHANGED", summary: "纠正计分（依据账本记录）" },
    ]);
    for (const row of rows) expect(row.summary).not.toMatch(/\d/);
  });

  it("the correction follows the part of the original change that the clamp let through, not the configured penalty", async () => {
    for (const index of [2, 3, 4]) seedEvent(index);
    const service = decisionService(db.database);
    // Blocks of -3 bring the score to -9 after three events. The fourth reaches the lower limit -10, so it moves the score by -1.
    for (const index of [1, 2, 3, 4]) {
      await service.commit(`task-${index}`, createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    }
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-10);

    const outcome = await service.overturn({
      eventId: "event-4",
      operationId: "op-clamp",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      actor: moderator("mod-1"),
    });

    expect(outcome).toMatchObject({ status: "overturned", compensation: "applied", compensationDelta: 1 });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-9);
  });

  it("an event is corrected once: a second review changes the verdict but not the score again", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    const second = await service.overturn({ eventId: "event-1", operationId: "op-2", verdict: createVerdict("BLOCK"), actor: moderator("mod-2") });

    expect(second).toMatchObject({ status: "overturned", seq: 3, compensation: "duplicate", compensationDelta: 0 });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_ledger WHERE idempotency_key LIKE 'compensation:%'")).toBe(1);
  });

  it("a repeated operation identifier is a duplicate and writes nothing new", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    const first = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    const again = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    expect(first.status).toBe("overturned");
    expect(again).toEqual({ status: "duplicate", seq: 2, verdictId: "overturn:channel-a:op-1" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(2);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(2);
  });

  it("a review after a deletion crossing is refused, and nothing is written", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    runShortTransaction(db.database, (tx) => SubjectStore.bumpGeneration(tx, "subject-1"));

    const outcome = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") });

    expect(outcome).toMatchObject({ status: "conflict", reason: "STALE_GENERATION", current: { seq: 1, downstream: "BLOCK" } });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(1);
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-3);
  });

  it("a review that keeps the same classification, or finds no verdict, is refused", async () => {
    const service = decisionService(db.database);
    expect(await service.overturn({ eventId: "event-1", operationId: "op-0", verdict: createVerdict("BLOCK"), actor: moderator("mod-1") })).toEqual({
      status: "conflict",
      reason: "NO_CURRENT_VERDICT",
      current: null,
    });

    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    const same = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("BLOCK"), actor: moderator("mod-1") });

    expect(same).toMatchObject({ status: "conflict", reason: "SAME_VERDICT", current: { seq: 1 } });
  });

  it("a review that names an older verdict is refused by the store, which keeps the newer decision", async () => {
    const deps = decisionDeps(db.database);
    await createDecisionService(deps).commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });

    const stale = deps.store.commitOverturn({
      eventId: "event-1",
      operationId: "op-stale",
      expectedVerdictId: "verdict-that-was-replaced",
      expectedGeneration: 0,
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      actorRef: "mod-2",
      decidedAt: "2026-11-10T10:00:20.000Z",
      validUntil: CHANGE_EXPIRES_AT,
      deliverable: true,
    });

    expect(stale).toMatchObject({ status: "conflict", reason: "CHANGED_BY_OTHER", current: { seq: 1 } });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(1);
  });

  it("a verdict that changed no score leaves nothing to correct, so the review moves only the verdict", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("ALLOW_NOISE"), { kind: "HUMAN", actor: moderator("mod-1") });

    const outcome = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("BLOCK"), actor: moderator("mod-1") });

    expect(outcome).toMatchObject({ status: "overturned", compensation: "no_effect", compensationDelta: 0 });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM change_logs WHERE change_kind = 'SCORE_CHANGED'")).toBe(0);
  });

  it("a release made by review produces no deliverable intent, so nothing is sent without the resend action", async () => {
    await decisionService(db.database).commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });

    const late = await decisionService(db.database, { now: "2026-11-10T12:00:00.000Z" }).overturn({
      eventId: "event-1",
      operationId: "op-late",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      actor: moderator("mod-1"),
    });

    expect(late).toMatchObject({ status: "overturned", downstream: "ALLOW", intent: null });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries WHERE status = 'PENDING' AND valid_until > '2026-11-10T12:00:00.000Z'")).toBe(0);
    // The new verdict keeps a delivery row that is already expired, so an explicit resend can name it.
    expect(db.database.sqlite.prepare("SELECT status, valid_until FROM deliveries WHERE id = 'overturn-delivery:channel-a:op-late'").get()).toEqual({
      status: "EXPIRED",
      valid_until: "2026-11-10T12:00:00.000Z",
    });
  });

  it("a released message is resent inside the resend window", async () => {
    await decisionService(db.database).commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    const review = await decisionService(db.database, { now: "2026-11-10T10:00:20.000Z" }).overturn({
      eventId: "event-1",
      operationId: "op-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      actor: moderator("mod-1"),
    });
    expect(review).toMatchObject({ status: "overturned", intent: null });

    const inside = await decisionService(db.database, { now: "2026-11-10T10:03:00.000Z" }).resend({
      deliveryId: "overturn-delivery:channel-a:op-1",
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(inside).toMatchObject({ status: "resent", intent: { verdict: "ALLOW", validUntil: "2026-11-10T10:04:00.000Z" } });
  });

  it("a release reviewed two hours after the message arrived cannot be resent: the time limit refuses it", async () => {
    await decisionService(db.database).commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
    await decisionService(db.database, { now: "2026-11-10T12:00:00.000Z" }).overturn({
      eventId: "event-1",
      operationId: "op-late",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      actor: moderator("mod-1"),
    });

    const outcome = await decisionService(db.database, { now: "2026-11-10T12:00:30.000Z" }).resend({
      deliveryId: "overturn-delivery:channel-a:op-late",
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(outcome).toEqual({ status: "refused", reason: "WINDOW_CLOSED" });
  });

  it("a review that makes a block keeps the block delivery, so the output can take the old content off", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("ALLOW_MEANINGFUL"), { kind: "HUMAN", actor: moderator("mod-1") });

    const outcome = await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("BLOCK"), actor: moderator("mod-1") });

    expect(outcome).toMatchObject({ status: "overturned", downstream: "BLOCK", intent: { verdict: "BLOCK", validUntil: "2026-11-10T10:05:10.000Z" } });
    expect(db.database.sqlite.prepare("SELECT status FROM deliveries WHERE id = 'overturn-delivery:channel-a:op-1'").get()).toEqual({ status: "PENDING" });
  });

  it("a data admin is denied, and an unknown event is a conflict", async () => {
    const service = decisionService(db.database);
    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });

    expect(await service.overturn({ eventId: "event-1", operationId: "op-1", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: dataAdmin("admin-1") })).toEqual({
      status: "denied",
      reason: "PERMISSION_DENIED",
    });
    expect(await service.overturn({ eventId: "event-missing", operationId: "op-2", verdict: createVerdict("ALLOW_MEANINGFUL"), actor: moderator("mod-1") })).toEqual({
      status: "conflict",
      reason: "EVENT_NOT_FOUND",
      current: null,
    });
  });
});
