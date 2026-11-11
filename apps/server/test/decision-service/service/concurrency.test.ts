import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDecisionStorePort } from "../../../src/db/decision-store.js";
import { TaskStore } from "../../../src/db/repository.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { createScoringPlanner } from "../../../src/modules/scoring-engine/index.js";
import { ENABLED } from "../../scoring-engine/ledger/helpers.js";
import { T0 } from "../../db/helpers.js";
import {
  CHANGE_EXPIRES_AT,
  countWhere,
  DECIDED_AT,
  DEADLINE,
  openDecisionDatabase,
  scoreOf,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../fixtures.js";

// VW-SUB026-AC001（事务并发与任务代次）。两个提交都在对方写入之前读取任务，模拟同一时刻的两名房管或超时重试。
describe("two commits that both read the task as open (VW-SUB026-AC001)", () => {
  let db: OpenDatabase;
  let sequence: number;

  beforeEach(() => {
    db = openDecisionDatabase("decision-race-");
    sequence = 0;
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

  function store() {
    const newId = () => `race-${++sequence}`;
    return createDecisionStorePort(db.database, {
      planner: createScoringPlanner(ENABLED),
      newId,
      changeLogExpiresAt: () => CHANGE_EXPIRES_AT,
    });
  }

  function commitAs(reviewer: string, classification: "BLOCK" | "ALLOW_MEANINGFUL") {
    return {
      taskId: "task-1",
      verdictId: `verdict-${reviewer}`,
      deliveryId: `delivery-${reviewer}`,
      verdict: createVerdict(classification),
      source: "MANUAL" as const,
      decidedAt: DECIDED_AT,
      decidedByRef: reviewer,
      changeActorRef: reviewer,
      validUntil: DEADLINE,
    };
  }

  it("exactly one of the two settles; the other gets the current result and nothing else changes", () => {
    const port = store();
    // Both reads happen before either write, so both see the task as open.
    const seenByA = port.readTask("task-1");
    const seenByB = port.readTask("task-1");
    expect(seenByA?.status).toBe("QUEUED");
    expect(seenByB?.status).toBe("QUEUED");

    const a = port.commitVerdict(commitAs("mod-a", "BLOCK"));
    const b = port.commitVerdict(commitAs("mod-b", "ALLOW_MEANINGFUL"));

    expect(a.status).toBe("committed");
    expect(b).toEqual({
      status: "conflict",
      reason: "TASK_NOT_OPEN",
      current: expect.objectContaining({ verdictId: "verdict-mod-a", downstream: "BLOCK" }),
    });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_ledger")).toBe(1);
    expect(scoreOf(db.database, "channel-a", "viewer-1")).toBe(-3);
  });

  it("a second verdict for an event that already has a current verdict under another task is ALREADY_FINAL", () => {
    runShortTransaction(db.database, (tx) => {
      TaskStore.create(tx, { id: "task-2", eventId: "event-1", kind: "PAID_TEXT_REVIEW", deadlineAt: DEADLINE, createdAt: T0 });
    });
    const port = store();
    port.commitVerdict(commitAs("mod-a", "BLOCK"));

    const other = port.commitVerdict({ ...commitAs("mod-b", "BLOCK"), taskId: "task-2" });

    expect(other).toEqual({
      status: "conflict",
      reason: "ALREADY_FINAL",
      current: expect.objectContaining({ verdictId: "verdict-mod-a" }),
    });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(1);
  });

  it("a task created for an earlier event version is refused as a stale event version", () => {
    db.database.sqlite.prepare("UPDATE channel_events SET event_version = 2 WHERE id = ?").run("event-1");

    const outcome = store().commitVerdict(commitAs("mod-a", "BLOCK"));

    expect(outcome).toEqual({ status: "conflict", reason: "STALE_EVENT_VERSION", current: null });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(0);
  });
});
