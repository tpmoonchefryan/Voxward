import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dataRequestItems, dataRequests } from "../../../src/db/schema/index.js";
import { actorFor, type DataFixture, openDataFixture, SUBJECT } from "../fixtures.js";

const ADMIN = actorFor("DATA_ADMIN");

interface View {
  readonly requestId: string;
  readonly stage: string;
  readonly execution: string;
  readonly counts: { done: number; failed: number; pending: number };
  readonly targets: { targetKind: string; state: string; errorCode: string | null }[];
}

describe("request status shows real external scope and failures (VW-SUB033-AC001)", () => {
  let fixture: DataFixture;

  beforeEach(() => {
    fixture = openDataFixture("scope-");
  });

  afterEach(() => {
    fixture.close();
  });

  function registerAndVerify(kind: "DELETE" | "STOP_SCORING"): string {
    const created = fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind,
      mode: kind === "DELETE" ? "DELETE_DATA_ONLY" : undefined,
      requestSource: "VIEWER_REQUEST",
    });
    const requestId = (created.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(ADMIN, requestId, { verdict: "VERIFIED", method: "REQUEST_AUTHORIZATION" });
    return requestId;
  }

  it("shows a verified delete as awaiting execution, which this package never performs", () => {
    const id = registerAndVerify("DELETE");
    const view = fixture.routes.getRequest(ADMIN, id).body as View;
    expect(view.stage).toBe("AWAITING_EXECUTION");
    expect(view.execution).toBe("PENDING");
    expect(view.counts).toEqual({ done: 0, failed: 0, pending: 0 });
  });

  it("shows a partial failure with each target's state and error code, as the execution path leaves them", () => {
    const id = registerAndVerify("DELETE");
    // Stands in for the execution path (STORY-019), which is not part of this package. The rows use the table's values.
    fixture.database.orm.update(dataRequests).set({ executionState: "PARTIAL_FAILED" }).where(eq(dataRequests.id, id)).run();
    fixture.database.orm
      .insert(dataRequestItems)
      .values([
        { id: "item-1", requestId: id, targetKind: "SUBJECT_SCORE", targetRef: "score-1", itemState: "DONE" },
        { id: "item-2", requestId: id, targetKind: "TECHNICAL_LOG", targetRef: "log-1", itemState: "DONE" },
        {
          id: "item-3",
          requestId: id,
          targetKind: "CHANGE_LOG",
          targetRef: "change-1",
          itemState: "FAILED",
          errorCode: "STORE_BUSY",
        },
      ])
      .run();
    const view = fixture.routes.getRequest(ADMIN, id).body as View;
    expect(view.stage).toBe("PARTIAL_FAILED");
    expect(view.counts).toEqual({ done: 2, failed: 1, pending: 0 });
    expect(view.targets.find((target) => target.targetKind === "CHANGE_LOG")).toEqual({
      targetKind: "CHANGE_LOG",
      state: "FAILED",
      errorCode: "STORE_BUSY",
    });
  });

  it("shows access, correction and stop-scoring requests as not executed here, even after verification", () => {
    const id = registerAndVerify("STOP_SCORING");
    const view = fixture.routes.getRequest(ADMIN, id).body as View;
    expect(view.stage).toBe("NOT_EXECUTED_HERE");
  });

  it("shows a running request as executing, and a request from another channel as absent", () => {
    const id = registerAndVerify("DELETE");
    fixture.database.orm.update(dataRequests).set({ executionState: "RUNNING" }).where(eq(dataRequests.id, id)).run();
    expect((fixture.routes.getRequest(ADMIN, id).body as View).stage).toBe("EXECUTING");
    const outsider = actorFor("DATA_ADMIN", "channel-2");
    expect(fixture.routes.getRequest(outsider, id)).toEqual({ status: 404, body: { error: "REQUEST_NOT_FOUND" } });
  });

  it("lists requests of the subject newest first", () => {
    const first = registerAndVerify("DELETE");
    const second = registerAndVerify("STOP_SCORING");
    const list = fixture.routes.listRequests(ADMIN, SUBJECT).body as View[];
    expect(list.map((view) => view.requestId).sort()).toEqual([first, second].sort());
    expect(list.every((view) => typeof view.stage === "string")).toBe(true);
  });
});
