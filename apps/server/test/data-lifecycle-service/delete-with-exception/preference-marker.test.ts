import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scoreExceptions } from "../../../src/db/schema/index.js";
import { T0 } from "../../db/helpers.js";
import {
  preferenceMarkerOf,
  PREFERENCE_PURPOSE,
  resumeScoring,
  startDeletionRequest,
} from "../../../src/modules/data-lifecycle-service/index.js";
import { actorFor, CHANNEL, openDataFixture, SUBJECT, TWIN, type DataFixture } from "../fixtures.js";

/* Synthetic data only. */

let fixture: DataFixture;

beforeEach(() => {
  fixture = openDataFixture("data-preference-marker");
});

afterEach(() => {
  fixture.close();
});

function createAndVerify(subjectRef: string, kind: "CORRECTION" | "RESUME_SCORING"): string {
  const actor = actorFor("DATA_ADMIN");
  const created = fixture.routes.createRequest(actor, { subjectRef, kind, requestSource: "OPERATOR_INITIATED" });
  expect(created.status).toBe(201);
  const requestId = (created.body as { requestId: string }).requestId;
  expect(fixture.routes.decideVerification(actor, requestId, { verdict: "VERIFIED", method: "REQUEST_AUTHORIZATION" }).status).toBe(200);
  return requestId;
}

function deleteAndExcept(subjectRef: string): void {
  const actor = actorFor("DATA_ADMIN");
  const created = fixture.routes.createRequest(actor, {
    subjectRef,
    kind: "DELETE",
    mode: "DELETE_AND_EXCEPT",
    requestSource: "OPERATOR_INITIATED",
  });
  const requestId = (created.body as { requestId: string }).requestId;
  expect(fixture.routes.decideVerification(actor, requestId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" }).status).toBe(200);
  expect(startDeletionRequest(fixture.deps, actor, requestId).status).toBe(200);
}

function activeExceptionOf(subjectId: string) {
  return fixture.database.orm
    .select()
    .from(scoreExceptions)
    .where(eq(scoreExceptions.subjectId, subjectId))
    .all()
    .filter((row) => row.removedAt === null);
}

describe("the preference keeps only its minimal marker (VW-SUB035-STORY)", () => {
  it("the marker holds the purpose, the subject reference and the time, and nothing else", () => {
    const marker = preferenceMarkerOf(TWIN, T0);
    expect(Object.keys(marker).sort()).toEqual(["createdAt", "purpose", "subjectId"]);
    expect(marker.purpose).toBe(PREFERENCE_PURPOSE);
  });

  it("the exception row carries no score, nickname or content column", () => {
    deleteAndExcept(TWIN);
    const [row] = fixture.database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, TWIN)).all();
    expect(row).toBeDefined();
    const columns = Object.keys(row ?? {});
    expect(columns.sort()).toEqual(
      ["channelId", "createdAt", "id", "purposeCode", "removedAt", "removedReasonCode", "sourceRequestId", "subjectId"].sort(),
    );
    expect(row?.purposeCode).toBe(PREFERENCE_PURPOSE);
  });
});

describe("restoring scoring needs an explicit request (VW-SUB035-PARENT)", () => {
  it("only a verified RESUME_SCORING request lifts the exception", () => {
    deleteAndExcept(TWIN);
    const actor = actorFor("DATA_ADMIN");

    // A correction is not a request to resume scoring: the exception stays.
    const correction = createAndVerify(TWIN, "CORRECTION");
    expect(resumeScoring(fixture.deps, actor, TWIN, correction)).toEqual({
      status: 409,
      body: { error: "REQUEST_NOT_ELIGIBLE" },
    });
    expect(activeExceptionOf(TWIN)).toHaveLength(1);

    const resume = createAndVerify(TWIN, "RESUME_SCORING");
    const response = resumeScoring(fixture.deps, actor, TWIN, resume);
    expect(response).toEqual({ status: 200, body: { outcome: "RESUMED" } });
    expect(activeExceptionOf(TWIN)).toHaveLength(0);
    expect(fixture.deps.subjects.readSubject(CHANNEL, TWIN)?.exception).toBeNull();
    expect(fixture.deps.requests.readRequest(CHANNEL, resume)?.executionState).toBe("COMPLETED");

    // The same request cannot lift anything twice.
    expect(resumeScoring(fixture.deps, actor, TWIN, resume).status).toBe(409);
  });

  it("a resume request for a subject with no exception completes as a no-op", () => {
    const resume = createAndVerify(TWIN, "RESUME_SCORING");
    expect(resumeScoring(fixture.deps, actorFor("DATA_ADMIN"), TWIN, resume)).toEqual({
      status: 200,
      body: { outcome: "NO_ACTIVE_EXCEPTION" },
    });
    expect(fixture.deps.requests.readRequest(CHANNEL, resume)?.executionState).toBe("COMPLETED");
  });

  it("a resume request names only its own subject", () => {
    deleteAndExcept(SUBJECT);
    const resumeForTwin = createAndVerify(TWIN, "RESUME_SCORING");
    expect(resumeScoring(fixture.deps, actorFor("DATA_ADMIN"), SUBJECT, resumeForTwin).status).toBe(409);
    expect(activeExceptionOf(SUBJECT)).toHaveLength(1);
  });
});
