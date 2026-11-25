import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditScopeError } from "../../src/db/audit-log.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { channels } from "../../src/db/schema/index.js";
import { T0 } from "./helpers.js";
import { CHANNEL_ID, SUBJECT_A, countWhere, openFixture, type Fixture } from "../audit-store/helpers.js";
import type { TechnicalLogRow } from "@voxward/contracts";

/*
 * The database implementation of AuditLogPort: sequence assignment, channel scope and the subject-channel check.
 */

let fixture: Fixture;

beforeEach(() => {
  fixture = openFixture("audit-port-");
});

afterEach(() => {
  fixture.close();
});

function row(id: string, overrides: Partial<TechnicalLogRow> = {}): TechnicalLogRow {
  return {
    id,
    channelId: CHANNEL_ID,
    correlationId: "corr-port",
    batchId: null,
    taskId: null,
    attempt: null,
    stage: "INGEST",
    status: "OK",
    level: "INFO",
    errorCode: null,
    providerRef: null,
    modelRef: null,
    ruleTemplateVersion: null,
    latencyMs: null,
    subjectId: SUBJECT_A,
    data: null,
    createdAt: T0,
    expiresAt: T0,
    ...overrides,
  };
}

describe("sequence assignment", () => {
  it("numbers each chain from 0 and starts another chain from 0 again", () => {
    const { port } = fixture;
    expect(port.insertTechnicalLog(row("p-1"), []).sequence).toBe(0);
    expect(port.insertTechnicalLog(row("p-2"), []).sequence).toBe(1);
    expect(port.insertTechnicalLog(row("p-3", { correlationId: "corr-other" }), []).sequence).toBe(0);
    expect(port.insertTechnicalLog(row("p-4"), []).sequence).toBe(2);
  });

  it("stores the evidence byte count as UTF-8 bytes", () => {
    fixture.port.insertTechnicalLog(row("p-5"), [
      { id: "ev-5", kind: "MESSAGE_TEXT", payload: "中文", expiresAt: T0 },
    ]);
    const stored = fixture.database.sqlite.prepare("select payload_bytes as bytes from technical_log_evidence where id = 'ev-5'").get() as {
      bytes: number;
    };
    expect(stored.bytes).toBe(6);
  });
});

describe("subject and channel scope", () => {
  it("refuses a subject that belongs to another channel and writes nothing", () => {
    runShortTransaction(fixture.database, (tx) => {
      tx.insert(channels)
        .values({ id: "channel-second", platform: "youtube", platformChannelRef: "UC-second", displayName: "second", createdAt: T0, updatedAt: T0 })
        .run();
    });
    expect(() => fixture.port.insertTechnicalLog(row("p-6", { channelId: "channel-second" }), [])).toThrow(AuditScopeError);
    expect(countWhere(fixture.database, "technical_logs", "id = 'p-6'")).toBe(0);
  });

  it("refuses a log row that names a subject the database does not have", () => {
    expect(() => fixture.port.insertTechnicalLog(row("p-7", { subjectId: "subject-missing" }), [])).toThrow(AuditScopeError);
  });

  it("reads a chain only from the channels it is given", () => {
    fixture.port.insertTechnicalLog(row("p-8"), []);
    expect(fixture.port.readChain("corr-port", [CHANNEL_ID])).toHaveLength(1);
    expect(fixture.port.readChain("corr-port", ["channel-elsewhere"])).toEqual([]);
    expect(fixture.port.readChain("corr-port", [])).toEqual([]);
  });

  it("reads Change Log rows only from the channels it is given", () => {
    fixture.port.insertChangeLog({
      id: "cl-port",
      channelId: CHANNEL_ID,
      occurredAt: T0,
      actorKind: "SYSTEM",
      actorRef: "system",
      changeKind: "SCORE_CHANGED",
      summary: "score change",
      outcome: "SUCCEEDED",
      correlationId: "corr-port",
      expiresAt: T0,
    });
    expect(fixture.port.readChangeLogs("corr-port", [CHANNEL_ID]).map((item) => item.id)).toEqual(["cl-port"]);
    expect(fixture.port.readChangeLogs("corr-port", ["channel-elsewhere"])).toEqual([]);
  });

  it("persists summaryCode/summaryParams and clears summaryParamsJson on certification", () => {
    fixture.port.insertChangeLog({
      id: "cl-struct",
      channelId: CHANNEL_ID,
      occurredAt: T0,
      actorKind: "ACCOUNT",
      actorRef: "mod-1",
      changeKind: "MANUAL_VERDICT",
      summary: "legacy",
      summaryCode: "MANUAL_VERDICT_OVERTURNED",
      summaryParams: { before: "ALLOW", after: "BLOCK" },
      outcome: "SUCCEEDED",
      correlationId: `subject:${SUBJECT_A}`,
      expiresAt: T0,
    });

    const before = fixture.port.readChangeLogs(`subject:${SUBJECT_A}`, [CHANNEL_ID])[0];
    expect(before?.summaryCode).toBe("MANUAL_VERDICT_OVERTURNED");
    expect(before?.summaryParams).toEqual({ before: "ALLOW", after: "BLOCK" });

    fixture.port.certifySubjectChangeLogs(SUBJECT_A, "DATA_REQUEST_CERTIFICATE");
    const after = fixture.port.readChangeLogs(`subject:${SUBJECT_A}`, [CHANNEL_ID])[0];
    expect(after?.summary).toBe("DATA_REQUEST_CERTIFICATE");
    expect(after?.summaryCode).toBe("DATA_REQUEST_CERTIFICATE");
    expect(after?.summaryParams).toBeUndefined();
  });
});
