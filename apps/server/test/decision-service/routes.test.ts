import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDecisionRoutes } from "../../src/modules/decision-service/routes.js";
import {
  dataAdmin,
  decisionService,
  moderator,
  openDecisionDatabase,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "./fixtures.js";

describe("decision routes", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("decision-routes-");
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

  it("a valid human decision returns 200 with the committed result", async () => {
    const routes = createDecisionRoutes(decisionService(db.database));

    const response = await routes.commitTask(moderator("mod-1"), "task-1", { classification: "BLOCK" });

    expect(response).toEqual({
      status: 200,
      body: { status: "committed", seq: 1, verdict: "BLOCK", deliverySequence: 1, validUntil: expect.any(String), scoring: "applied" },
    });
  });

  it("a second decision on the same task returns 409 with the current decision", async () => {
    const routes = createDecisionRoutes(decisionService(db.database));
    await routes.commitTask(moderator("mod-1"), "task-1", { classification: "BLOCK" });

    const response = await routes.commitTask(moderator("mod-2"), "task-1", { classification: "ALLOW_MEANINGFUL" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      status: "conflict",
      reason: "TASK_NOT_OPEN",
      current: expect.objectContaining({ seq: 1, downstream: "BLOCK" }),
    });
  });

  it("a caller without the review capability gets 403 and no decision is written", async () => {
    const routes = createDecisionRoutes(decisionService(db.database));

    const response = await routes.commitTask(dataAdmin("admin-1"), "task-1", { classification: "BLOCK" });

    expect(response).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
    expect(db.database.sqlite.prepare("SELECT COUNT(*) AS n FROM verdicts").get()).toEqual({ n: 0 });
  });

  it("a malformed body or task identifier gets 400", async () => {
    const routes = createDecisionRoutes(decisionService(db.database));

    expect(await routes.commitTask(moderator("mod-1"), "task-1", { classification: "MAYBE" })).toEqual({
      status: 400,
      body: { error: "INVALID_REQUEST" },
    });
    expect(await routes.commitTask(moderator("mod-1"), "", { classification: "BLOCK" })).toEqual({
      status: 400,
      body: { error: "INVALID_REQUEST" },
    });
    expect(await routes.commitTask(moderator("mod-1"), "task-1", "not an object")).toEqual({
      status: 400,
      body: { error: "INVALID_REQUEST" },
    });
  });
});
