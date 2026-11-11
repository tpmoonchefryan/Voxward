import type { DeletionStart } from "@voxward/contracts";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { changeLogs, scoreExceptions, subjects } from "../../../src/db/schema/index.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import { startDeletionRequest } from "../../../src/modules/data-lifecycle-service/index.js";
import { T0 } from "../../db/helpers.js";
import { actorFor, CHANNEL, openDataFixture, SUBJECT, TWIN, type DataFixture } from "../fixtures.js";

/* Synthetic data only. TWIN has no exception at the start; SUBJECT already has one (see fixtures.ts). */

let fixture: DataFixture;

beforeEach(() => {
  fixture = openDataFixture("data-delete-start");
});

afterEach(() => {
  fixture.close();
});

function verifiedRequest(subjectRef: string, mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT"): string {
  const actor = actorFor("DATA_ADMIN");
  const created = fixture.routes.createRequest(actor, {
    subjectRef,
    kind: "DELETE",
    mode,
    requestSource: "OPERATOR_INITIATED",
  });
  expect(created.status).toBe(201);
  const requestId = (created.body as { requestId: string }).requestId;
  const decided = fixture.routes.decideVerification(actor, requestId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
  expect(decided.status).toBe(200);
  return requestId;
}

function generationOf(subjectId: string): number | undefined {
  return fixture.database.orm
    .select({ generation: subjects.processingGeneration })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .get()?.generation;
}

function exceptionRows(subjectId: string) {
  return fixture.database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, subjectId)).all();
}

function exceptionChangeRows(subjectId: string) {
  return fixture.database.orm
    .select()
    .from(changeLogs)
    .where(and(eq(changeLogs.changeKind, "SCORE_EXCEPTION_CHANGED"), eq(changeLogs.correlationId, `subject:${subjectId}`)))
    .all();
}

describe("starting a deletion with a scoring exception (VW-SUB035-AC001)", () => {
  it("writes the exception, the generation and every target in one start", () => {
    const requestId = verifiedRequest(TWIN, "DELETE_AND_EXCEPT");
    const response = startDeletionRequest(fixture.deps, actorFor("DATA_ADMIN"), requestId);

    expect(response.status).toBe(200);
    const body = response.body as { execution: string; stage: string; targets: unknown[]; counts: { pending: number } };
    expect(body.execution).toBe("RUNNING");
    expect(body.stage).toBe("EXECUTING");
    expect(body.targets).toHaveLength(15);
    expect(body.counts.pending).toBe(15);
    expect(generationOf(TWIN)).toBe(1);
    expect(exceptionRows(TWIN).filter((row) => row.removedAt === null)).toHaveLength(1);
    expect(exceptionChangeRows(TWIN)).toHaveLength(1);
    expect(fixture.deps.subjects.readSubject(CHANNEL, TWIN)?.exception).not.toBeNull();
  });

  it("writes nothing when the transaction fails after the exception and the generation (fault injection)", () => {
    const requestId = verifiedRequest(TWIN, "DELETE_AND_EXCEPT");
    // The start change row is over the 500-character summary limit, so the last write of the transaction fails.
    const broken: DeletionStart = {
      requestId,
      channelId: CHANNEL,
      subjectId: TWIN,
      mode: "DELETE_AND_EXCEPT",
      at: T0,
      exceptionId: "exception-broken",
      exceptionChange: {
        id: "change-broken-exception",
        channelId: CHANNEL,
        occurredAt: T0,
        actorKind: "ACCOUNT",
        actorRef: "synthetic-admin",
        changeKind: "SCORE_EXCEPTION_CHANGED",
        summary: "exception",
        outcome: "SUCCEEDED",
        correlationId: `subject:${TWIN}`,
        expiresAt: T0,
      },
      targets: [{ id: "item-broken", targetKind: "SCORE_LEDGER", targetRef: TWIN }],
      startChange: {
        id: "change-broken-start",
        channelId: CHANNEL,
        occurredAt: T0,
        actorKind: "ACCOUNT",
        actorRef: "synthetic-admin",
        changeKind: "DATA_REQUEST_CHANGED",
        summary: "x".repeat(501),
        outcome: "SUCCEEDED",
        correlationId: null,
        expiresAt: T0,
      },
    };

    expect(() => fixture.deps.requests.startDeletion(broken)).toThrow();
    expect(exceptionRows(TWIN)).toHaveLength(0);
    expect(generationOf(TWIN)).toBe(0);
    expect(fixture.deps.requests.readRequest(CHANNEL, requestId)?.executionState).toBe("PENDING");
    expect(fixture.deps.requests.readItems(requestId)).toHaveLength(0);
  });

  it("a repeated start changes nothing", () => {
    const requestId = verifiedRequest(TWIN, "DELETE_AND_EXCEPT");
    const actor = actorFor("DATA_ADMIN");
    const first = startDeletionRequest(fixture.deps, actor, requestId);
    const second = startDeletionRequest(fixture.deps, actor, requestId);

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(generationOf(TWIN)).toBe(1);
    expect(exceptionRows(TWIN)).toHaveLength(1);
    expect(exceptionChangeRows(TWIN)).toHaveLength(1);
    expect(fixture.deps.requests.readItems(requestId)).toHaveLength(15);
  });

  it("reuses the marker of a subject already on the exception list, and writes no second exception change", () => {
    const requestId = verifiedRequest(SUBJECT, "DELETE_AND_EXCEPT");
    const response = startDeletionRequest(fixture.deps, actorFor("DATA_ADMIN"), requestId);

    expect(response.status).toBe(200);
    expect(exceptionRows(SUBJECT)).toHaveLength(1);
    expect(exceptionRows(SUBJECT)[0]?.removedAt).toBeNull();
    expect(exceptionChangeRows(SUBJECT)).toHaveLength(0);
    expect(generationOf(SUBJECT)).toBe(1);
  });

  it("a data-only deletion neither adds nor lifts an exception", () => {
    const onExcepted = verifiedRequest(SUBJECT, "DELETE_DATA_ONLY");
    expect(startDeletionRequest(fixture.deps, actorFor("DATA_ADMIN"), onExcepted).status).toBe(200);
    expect(exceptionRows(SUBJECT).filter((row) => row.removedAt === null)).toHaveLength(1);
    expect(fixture.deps.subjects.readSubject(CHANNEL, SUBJECT)?.exception).not.toBeNull();

    const onOther = verifiedRequest(TWIN, "DELETE_DATA_ONLY");
    expect(startDeletionRequest(fixture.deps, actorFor("DATA_ADMIN"), onOther).status).toBe(200);
    expect(exceptionRows(TWIN)).toHaveLength(0);
    expect(generationOf(TWIN)).toBe(1);
  });

  it("refuses the subject's new scoring after the start, and the decision never runs", () => {
    const requestId = verifiedRequest(TWIN, "DELETE_AND_EXCEPT");
    expect(startDeletionRequest(fixture.deps, actorFor("DATA_ADMIN"), requestId).status).toBe(200);

    const result = createScoringLedgerPort(fixture.database).commitScoreDecision({
      subject: { channelId: CHANNEL, subjectKey: "synthetic-key-2" },
      idempotencyKey: "synthetic-after-deletion-1",
      committedAt: T0,
      decide: () => {
        throw new Error("the decision must not run for a subject on the exception list");
      },
    });
    expect(result).toEqual({ status: "refused", subjectRef: expect.any(String), reason: "EXCEPTION_ACTIVE" });
  });
});
