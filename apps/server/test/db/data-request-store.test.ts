import type { ChangeLogRow, DataRequestRecord } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDataRequestPort } from "../../src/db/data-request-store.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { createSubjectReadPort } from "../../src/db/subject-read.js";
import { countRows, migratedDatabase, removeDirectory, scratchDirectory, seedChannelAndSubject, T0 } from "./helpers.js";

function requestRecord(overrides: Partial<DataRequestRecord> & Pick<DataRequestRecord, "id">): DataRequestRecord {
  return {
    channelId: "channel-1",
    subjectId: "subject-1",
    kind: "DELETE",
    mode: "DELETE_DATA_ONLY",
    requestSource: "OPERATOR_INITIATED",
    verificationState: "PENDING",
    verificationMethod: null,
    executionState: "PENDING",
    createdAt: T0,
    verifiedAt: null,
    completedAt: null,
    updatedAt: T0,
    handledByRef: null,
    ...overrides,
  };
}

function changeRow(id: string): ChangeLogRow {
  return {
    id,
    channelId: "channel-1",
    occurredAt: T0,
    actorKind: "ACCOUNT",
    actorRef: "admin-1",
    changeKind: "DATA_REQUEST_CHANGED",
    summary: "DATA_REQUEST registered kind=DELETE",
    outcome: "SUCCEEDED",
    correlationId: null,
    expiresAt: "2026-12-10T10:00:00.000Z",
  };
}

describe("data request store", () => {
  let directory: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("request-store-");
    database = migratedDatabase(directory);
    seedChannelAndSubject(database, "1");
    seedChannelAndSubject(database, "2");
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  it("writes the request and its Change Log row in one transaction", () => {
    const port = createDataRequestPort(database);
    port.insertRequest(requestRecord({ id: "req-1" }), changeRow("change-1"));
    expect(countRows(database, "data_requests")).toBe(1);
    expect(countRows(database, "change_logs")).toBe(1);
  });

  it("writes neither row when the Change Log row cannot be written", () => {
    const port = createDataRequestPort(database);
    port.insertRequest(requestRecord({ id: "req-1" }), changeRow("change-1"));
    // The second change row reuses an id, so its insert fails after the request row was written.
    expect(() => port.insertRequest(requestRecord({ id: "req-2" }), changeRow("change-1"))).toThrow();
    expect(countRows(database, "data_requests")).toBe(1);
    expect(countRows(database, "change_logs")).toBe(1);
  });

  it("applies one verification decision, and reports a second one as already decided", () => {
    const port = createDataRequestPort(database);
    port.insertRequest(requestRecord({ id: "req-1" }), changeRow("change-1"));
    const decision = {
      requestId: "req-1",
      channelId: "channel-1",
      verificationState: "VERIFIED" as const,
      verificationMethod: "ACCOUNT_OWNERSHIP" as const,
      executionState: "PENDING" as const,
      decidedAt: T0,
      handledByRef: "admin-1",
    };
    expect(port.decideVerification(decision, changeRow("change-2"))).toBe("DECIDED");
    expect(port.decideVerification(decision, changeRow("change-3"))).toBe("ALREADY_DECIDED");
    expect(countRows(database, "change_logs")).toBe(2);
    expect(port.readRequest("channel-1", "req-1")).toMatchObject({
      verificationState: "VERIFIED",
      verificationMethod: "ACCOUNT_OWNERSHIP",
      verifiedAt: T0,
    });
  });

  it("reports a request of another channel as not found, and reads it as absent from that channel", () => {
    const port = createDataRequestPort(database);
    port.insertRequest(requestRecord({ id: "req-1" }), changeRow("change-1"));
    const decision = {
      requestId: "req-1",
      channelId: "channel-2",
      verificationState: "REJECTED" as const,
      verificationMethod: null,
      executionState: "CANCELLED" as const,
      decidedAt: T0,
      handledByRef: "admin-2",
    };
    expect(port.decideVerification(decision, changeRow("change-2"))).toBe("NOT_FOUND");
    expect(port.readRequest("channel-2", "req-1")).toBeUndefined();
    expect(countRows(database, "change_logs")).toBe(1);
  });

  it("lists one subject's requests newest first and never another subject's", () => {
    const port = createDataRequestPort(database);
    port.insertRequest(requestRecord({ id: "req-old", createdAt: "2026-11-01T00:00:00.000Z" }), changeRow("c-1"));
    port.insertRequest(requestRecord({ id: "req-new", createdAt: "2026-11-05T00:00:00.000Z" }), changeRow("c-2"));
    port.insertRequest(requestRecord({ id: "req-other", subjectId: "subject-2" }), changeRow("c-3"));
    expect(port.listRequests("channel-1", "subject-1").map((row) => row.id)).toEqual(["req-new", "req-old"]);
  });

  it("reads the deletion targets of one request", () => {
    const port = createDataRequestPort(database);
    port.insertRequest(requestRecord({ id: "req-1" }), changeRow("change-1"));
    database.sqlite
      .prepare(
        "INSERT INTO data_request_items (id, request_id, target_kind, target_ref, item_state, error_code) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("item-1", "req-1", "SUBJECT_SCORE", "score-1", "FAILED", "STORE_BUSY");
    expect(port.readItems("req-1")).toEqual([
      {
        id: "item-1",
        requestId: "req-1",
        targetKind: "SUBJECT_SCORE",
        targetRef: "score-1",
        itemState: "FAILED",
        errorCode: "STORE_BUSY",
        attemptedAt: null,
        completedAt: null,
      },
    ]);
  });

  it("refuses a DELETE request stored without a mode", () => {
    const port = createDataRequestPort(database);
    expect(() =>
      port.insertRequest(requestRecord({ id: "bad", kind: "DELETE", mode: null }), changeRow("change-x")),
    ).toThrow();
    expect(countRows(database, "data_requests")).toBe(0);
  });

  it("reads a subject only inside its own channel", () => {
    const subjects = createSubjectReadPort(database);
    expect(subjects.readSubject("channel-1", "subject-1")).toMatchObject({ subjectId: "subject-1", channelId: "channel-1" });
    expect(subjects.readSubject("channel-2", "subject-1")).toBeUndefined();
  });
});
