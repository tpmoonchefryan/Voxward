import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDecisionRoutes } from "../../src/modules/decision-service/routes.js";
import { createDecisionService, createListAdministration } from "../../src/modules/decision-service/index.js";
import {
  dataAdmin,
  decisionDeps,
  moderator,
  openDecisionDatabase,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "./fixtures.js";

function routesFor(database: OpenDatabase["database"]) {
  const deps = decisionDeps(database);
  return createDecisionRoutes(createDecisionService(deps), createListAdministration(deps));
}

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
    const routes = routesFor(db.database);

    const response = await routes.commitTask(moderator("mod-1"), "task-1", { classification: "BLOCK" });

    expect(response).toEqual({
      status: 200,
      body: { status: "committed", seq: 1, verdict: "BLOCK", deliverySequence: 1, validUntil: expect.any(String), scoring: "applied" },
    });
  });

  it("a second decision on the same task returns 409 with the current decision", async () => {
    const routes = routesFor(db.database);
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
    const routes = routesFor(db.database);

    const response = await routes.commitTask(dataAdmin("admin-1"), "task-1", { classification: "BLOCK" });

    expect(response).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
    expect(db.database.sqlite.prepare("SELECT COUNT(*) AS n FROM verdicts").get()).toEqual({ n: 0 });
  });

  it("a malformed body or task identifier gets 400", async () => {
    const routes = routesFor(db.database);

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

describe("review, resend and list routes", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("decision-routes-review-");
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

  it("a review returns 200, a repeated review is a duplicate, and a data admin gets 403", async () => {
    const deps = decisionDeps(db.database);
    const routes = createDecisionRoutes(createDecisionService(deps), createListAdministration(deps));
    await routes.commitTask(moderator("mod-1"), "task-1", { classification: "BLOCK" });

    const review = { classification: "ALLOW_MEANINGFUL", operationId: "op-1" };
    expect(await routes.reviewEvent(moderator("mod-1"), "event-1", review)).toMatchObject({ status: 200, body: { status: "overturned", seq: 2 } });
    expect(await routes.reviewEvent(moderator("mod-1"), "event-1", review)).toEqual({ status: 200, body: { status: "duplicate", seq: 2 } });
    expect(await routes.reviewEvent(dataAdmin("admin-1"), "event-1", { ...review, operationId: "op-2" })).toEqual({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
    expect(await routes.reviewEvent(moderator("mod-1"), "event-1", { classification: "BLOCK" })).toEqual({
      status: 400,
      body: { error: "INVALID_REQUEST" },
    });
  });

  it("a resend of an unexpired delivery is 409 refused, and list edits map their outcomes to status codes", () => {
    const deps = decisionDeps(db.database);
    const routes = createDecisionRoutes(createDecisionService(deps), createListAdministration(deps));

    expect(routes.editSubjectList(moderator("mod-1"), { subjectKey: "viewer-1", listKind: "BLACKLIST" })).toEqual({
      status: 200,
      body: { status: "applied" },
    });
    expect(routes.editSubjectList(moderator("mod-1"), { subjectKey: "nobody", listKind: "WHITELIST" })).toEqual({
      status: 404,
      body: { status: "refused", reason: "SUBJECT_NOT_FOUND" },
    });
    expect(routes.editSubjectList(dataAdmin("admin-1"), { subjectKey: "viewer-1", listKind: null })).toEqual({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
    expect(routes.editTerm(moderator("mod-1"), { action: "ADD", term: "x", matchKind: "EXACT", language: "zh", groupCode: "G" })).toEqual({
      status: 200,
      body: { status: "applied" },
    });
    expect(routes.editTerm(moderator("mod-1"), { action: "ADD", term: "x", matchKind: "UNKNOWN", language: "zh", groupCode: "G" })).toEqual({
      status: 400,
      body: { error: "INVALID_REQUEST" },
    });
  });
});

