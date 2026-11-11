import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { SubjectStore } from "../../../src/db/repository.js";
import {
  countWhere,
  dataAdmin,
  DEADLINE,
  decisionService,
  moderator,
  openDecisionDatabase,
  scoreOf,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../fixtures.js";

// VW-SUB026-AC001: 仅一次有效结算；冲突显示当前结果；旧任务结果无效。
describe("DecisionService.commit settles a task once (VW-SUB026-AC001)", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("decision-commit-");
    seedChannel(db.database, "channel-a");
    seedOpenTask(db.database, {
      channelId: "channel-a",
      subjectKey: "viewer-1",
      subjectId: "subject-1",
      eventId: "event-1",
      platformMessageRef: "msg-1",
      taskId: "task-1",
    });
  });

  afterEach(() => db.close());

  it("a human takeover settles once, and a late AI result is refused without a score change", async () => {
    const service = decisionService(db.database);

    const first = await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });

    expect(first).toMatchObject({
      status: "committed",
      seq: 1,
      scoring: "applied",
      actualDelta: -3,
      intent: {
        verdict: "BLOCK",
        platformOrder: 1,
        deliverySequence: 1,
        validUntil: DEADLINE,
        eventRef: { channelId: "channel-a", platformMessageId: "msg-1", correlationId: "corr-event-1" },
      },
    });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-3);

    const late = await service.commit("task-1", createVerdict("ALLOW_MEANINGFUL"), { kind: "SYSTEM", source: "MODEL" });

    expect(late).toEqual({
      status: "conflict",
      reason: "TASK_NOT_OPEN",
      current: expect.objectContaining({ seq: 1, downstream: "BLOCK", source: "MANUAL" }),
    });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-3);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_ledger")).toBe(1);
  });

  it("the second of two moderators gets the current result, and the first result is not overwritten", async () => {
    const service = decisionService(db.database);

    const first = await service.commit("task-1", createVerdict("ALLOW_MEANINGFUL"), { kind: "HUMAN", actor: moderator("mod-a") });
    const second = await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-b") });

    expect(first.status).toBe("committed");
    expect(second).toEqual({
      status: "conflict",
      reason: "TASK_NOT_OPEN",
      current: expect.objectContaining({ seq: 1, downstream: "ALLOW", source: "MANUAL" }),
    });
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(2);
  });

  it("a timeout retry of the same decision does not settle again", async () => {
    const service = decisionService(db.database);
    const operator = moderator("mod-1");

    await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: operator });
    const retry = await service.commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: operator });

    expect(retry).toMatchObject({ status: "conflict", reason: "TASK_NOT_OPEN" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(1);
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-3);
  });

  it("a result for a task whose subject was regenerated after a deletion is refused, and nothing is written", async () => {
    const service = decisionService(db.database);
    // Deletion crossing: the subject's processing generation rises after the task was created.
    runShortTransaction(db.database, (tx) => SubjectStore.bumpGeneration(tx, "subject-1"));

    const outcome = await service.commit("task-1", createVerdict("BLOCK"), { kind: "SYSTEM", source: "MODEL" });

    expect(outcome).toEqual({ status: "conflict", reason: "STALE_GENERATION", current: null });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(0);
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(0);
  });

  it("an unknown task is a conflict, not a failure", async () => {
    const outcome = await decisionService(db.database).commit("task-missing", createVerdict("BLOCK"), {
      kind: "SYSTEM",
      source: "MODEL",
    });

    expect(outcome).toEqual({ status: "conflict", reason: "TASK_NOT_FOUND", current: null });
  });

  it("a human without the review capability, or from another channel, is denied and writes nothing", async () => {
    const service = decisionService(db.database);

    const noCapability = await service.commit("task-1", createVerdict("BLOCK"), {
      kind: "HUMAN",
      actor: dataAdmin("admin-1"),
    });
    const otherChannel = await service.commit("task-1", createVerdict("BLOCK"), {
      kind: "HUMAN",
      actor: moderator("mod-x", "channel-b"),
    });

    expect(noCapability).toEqual({ status: "denied", reason: "PERMISSION_DENIED" });
    expect(otherChannel).toEqual({ status: "denied", reason: "PERMISSION_DENIED" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(0);
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(0);
  });

  it("the Change Log row of a human decision names the outcome and carries no score", async () => {
    await decisionService(db.database).commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });

    const row = db.database.sqlite
      .prepare("SELECT change_kind, summary, actor_ref, correlation_id FROM change_logs")
      .get() as { change_kind: string; summary: string; actor_ref: string; correlation_id: string };

    expect(row).toEqual({
      change_kind: "MANUAL_VERDICT",
      summary: "人工裁决：拦截",
      actor_ref: "mod-1",
      correlation_id: "corr-event-1",
    });
    expect(row.summary).not.toMatch(/\d/);
  });
});
