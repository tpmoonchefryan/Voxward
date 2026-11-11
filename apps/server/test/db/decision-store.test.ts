import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDecisionStorePort } from "../../src/db/decision-store.js";
import { createScoringPlanner } from "../../src/modules/scoring-engine/index.js";
import { ENABLED } from "../scoring-engine/ledger/helpers.js";
import {
  CHANGE_EXPIRES_AT,
  countWhere,
  DECIDED_AT,
  DEADLINE,
  openDecisionDatabase,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../decision-service/fixtures.js";

// Q19③: the verdict and the score commit in one short transaction. A failure in either one rolls back both.
describe("verdict and score commit in one transaction (Q19③)", () => {
  let db: OpenDatabase;
  let sequence: number;

  beforeEach(() => {
    db = openDecisionDatabase("decision-store-");
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
    return createDecisionStorePort(db.database, {
      planner: createScoringPlanner(ENABLED),
      newId: () => `row-${++sequence}`,
      changeLogExpiresAt: () => CHANGE_EXPIRES_AT,
    });
  }

  function commit(verdict: ReturnType<typeof createVerdict>, changeActorRef: string | null = "mod-1") {
    return store().commitVerdict({
      taskId: "task-1",
      verdictId: "verdict-1",
      deliveryId: "delivery-1",
      verdict,
      source: changeActorRef === null ? "MODEL" : "MANUAL",
      decidedAt: DECIDED_AT,
      decidedByRef: changeActorRef ?? "system:MODEL",
      changeActorRef,
      validUntil: DEADLINE,
    });
  }

  it("a scoring failure rolls back the verdict, the delivery, the task status and the Change Log row", () => {
    // A deduction that is not a non-negative whole number is refused by the scoring plan, inside the transaction.
    const invalid = createVerdict("BLOCK", [{ code: "RULE_X", points: -1 }]);

    expect(() => commit(invalid)).toThrow("scoring input rejected: penaltyHits");

    expect(store().readTask("task-1")?.status).toBe("QUEUED");
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM change_logs")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_ledger")).toBe(0);
  });

  it("a successful human decision writes the verdict, the delivery, the score and the Change Log together", () => {
    const outcome = commit(createVerdict("BLOCK"));

    expect(outcome).toMatchObject({ status: "committed", scoring: "applied", actualDelta: -3, seq: 1 });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM verdicts WHERE is_current = 1")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries WHERE status = 'PENDING'")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_ledger")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM change_logs WHERE change_kind = 'MANUAL_VERDICT'")).toBe(1);
    expect(store().readTask("task-1")?.status).toBe("DONE");
  });

  it("a verdict that changes no score still settles the task and leaves an outcome record", () => {
    const outcome = commit(createVerdict("ALLOW_NOISE"), null);

    expect(outcome).toMatchObject({ status: "committed", scoring: "no_effect", actualDelta: 0 });
    expect(store().readTask("task-1")?.status).toBe("DONE");
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM score_outcomes WHERE outcome = 'NO_EFFECT' AND reason_code = 'NOISE'")).toBe(1);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM change_logs")).toBe(0);
  });
});
