import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildControlledMaterial } from "../../../src/modules/data-lifecycle-service/index.js";
import { actorFor, CHANNEL, type DataFixture, openDataFixture, OTHER_CHANNEL, rowsIn, SUBJECT, TWIN } from "../fixtures.js";

const ADMIN = actorFor("DATA_ADMIN");

interface Created {
  readonly requestId: string;
}

describe("verification of data requests (VW-SUB033-AC001: no verification by nickname)", () => {
  let fixture: DataFixture;

  beforeEach(() => {
    fixture = openDataFixture("verify-");
  });

  afterEach(() => {
    fixture.close();
  });

  function register(kind: "DELETE" | "ACCESS" = "DELETE", mode: "DELETE_DATA_ONLY" | null = "DELETE_DATA_ONLY"): string {
    const response = fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind,
      mode: kind === "DELETE" ? mode : undefined,
      requestSource: "OPERATOR_INITIATED",
    });
    expect(response.status).toBe(201);
    return (response.body as Created).requestId;
  }

  it("starts every request PENDING, with no verification method and no execution", () => {
    const id = register();
    const body = fixture.routes.getRequest(ADMIN, id).body as {
      verification: { state: string; method: string | null };
      execution: string;
      stage: string;
    };
    expect(body.verification).toMatchObject({ state: "PENDING", method: null });
    expect(body.execution).toBe("PENDING");
    expect(body.stage).toBe("AWAITING_VERIFICATION");
  });

  it("refuses a verification that carries only a nickname, because the body has no field for it", () => {
    const id = register();
    const response = fixture.routes.decideVerification(ADMIN, id, { verdict: "VERIFIED", nickname: "Synthetic Name" });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "INVALID_REQUEST" });
    expect(fixture.deps.requests.readRequest(CHANNEL, id)?.verificationState).toBe("PENDING");
  });

  it("refuses VERIFIED without a method, and refuses a method on REJECTED", () => {
    const id = register();
    expect(fixture.routes.decideVerification(ADMIN, id, { verdict: "VERIFIED" }).status).toBe(400);
    expect(fixture.routes.decideVerification(ADMIN, id, { verdict: "REJECTED", method: "ACCOUNT_OWNERSHIP" }).status).toBe(
      400,
    );
    expect(fixture.routes.decideVerification(ADMIN, id, { verdict: "MAYBE", method: "ACCOUNT_OWNERSHIP" }).status).toBe(400);
    expect(fixture.deps.requests.readRequest(CHANNEL, id)?.verificationState).toBe("PENDING");
  });

  it("applies a verified decision once: the method, time and operator are recorded, execution stays PENDING", () => {
    const id = register();
    const response = fixture.routes.decideVerification(ADMIN, id, {
      verdict: "VERIFIED",
      method: "REQUEST_AUTHORIZATION",
    });
    expect(response.status).toBe(200);
    const record = fixture.deps.requests.readRequest(CHANNEL, id);
    expect(record).toMatchObject({
      verificationState: "VERIFIED",
      verificationMethod: "REQUEST_AUTHORIZATION",
      executionState: "PENDING",
      handledByRef: ADMIN.accountId,
    });
    expect(record?.verifiedAt).not.toBeNull();
  });

  it("refuses a second decision on the same request with ALREADY_DECIDED, and writes nothing", () => {
    const id = register();
    fixture.routes.decideVerification(ADMIN, id, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    const changes = rowsIn(fixture.database, "change_logs");
    const second = fixture.routes.decideVerification(ADMIN, id, { verdict: "REJECTED" });
    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: "ALREADY_DECIDED" });
    expect(rowsIn(fixture.database, "change_logs")).toBe(changes);
    expect(fixture.deps.requests.readRequest(CHANNEL, id)?.verificationState).toBe("VERIFIED");
  });

  it("cancels a rejected request, so it can never wait for execution", () => {
    const id = register();
    const response = fixture.routes.decideVerification(ADMIN, id, { verdict: "REJECTED" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ execution: "CANCELLED", stage: "REJECTED", verification: { state: "REJECTED" } });
  });

  it("does not let another channel decide or read the request", () => {
    const id = register();
    const outsider = actorFor("DATA_ADMIN", OTHER_CHANNEL);
    expect(fixture.routes.decideVerification(outsider, id, { verdict: "REJECTED" }).status).toBe(404);
    expect(fixture.routes.getRequest(outsider, id).status).toBe(404);
    expect(fixture.deps.requests.readRequest(CHANNEL, id)?.verificationState).toBe("PENDING");
  });

  it("keeps access, correction and stop-scoring requests out of execution after verification", () => {
    const id = register("ACCESS");
    fixture.routes.decideVerification(ADMIN, id, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    const body = fixture.routes.getRequest(ADMIN, id).body as { stage: string; mode: unknown };
    expect(body.stage).toBe("NOT_EXECUTED_HERE");
    expect(body.mode).toBeNull();
  });

  it("refuses a delete request with no mode, or with a mode on a non-delete kind", () => {
    expect(
      fixture.routes.createRequest(ADMIN, { subjectRef: SUBJECT, kind: "DELETE", requestSource: "OPERATOR_INITIATED" })
        .status,
    ).toBe(400);
    expect(
      fixture.routes.createRequest(ADMIN, {
        subjectRef: SUBJECT,
        kind: "ACCESS",
        mode: "DELETE_DATA_ONLY",
        requestSource: "OPERATOR_INITIATED",
      }).status,
    ).toBe(400);
  });

  it("refuses a registration for a subject that is not in the channel", () => {
    const response = fixture.routes.createRequest(ADMIN, {
      subjectRef: "subject-that-does-not-exist",
      kind: "ACCESS",
      requestSource: "VIEWER_REQUEST",
    });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "SUBJECT_NOT_FOUND" });
  });

  it("registers a request for the twin subject without touching SUBJECT's requests", () => {
    const id = register();
    const twin = fixture.routes.createRequest(ADMIN, {
      subjectRef: TWIN,
      kind: "ACCESS",
      requestSource: "VIEWER_REQUEST",
    });
    expect(twin.status).toBe(201);
    const twinId = (twin.body as { requestId: string }).requestId;
    const subjectList = fixture.routes.listRequests(ADMIN, SUBJECT).body as { requestId: string }[];
    expect(subjectList.map((view) => view.requestId)).toEqual([id]);
    expect(twinId).not.toBe(id);
  });

  it("builds controlled material only for a verified request", () => {
    const id = register();
    const refused = buildControlledMaterial(fixture.deps, ADMIN, id);
    expect(refused).toEqual({ status: 409, body: { error: "REQUEST_NOT_VERIFIED" } });
    fixture.routes.decideVerification(ADMIN, id, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    expect(buildControlledMaterial(fixture.deps, ADMIN, id).status).toBe(200);
  });
});
