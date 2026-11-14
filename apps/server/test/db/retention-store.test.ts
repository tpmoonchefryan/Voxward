import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogPort } from "../../src/db/audit-log.js";
import { writeChannelSetting } from "../../src/db/channel-settings-store.js";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { createRetentionStore } from "../../src/db/retention-store.js";
import { CHANNEL, openDataFixture, type DataFixture } from "../data-lifecycle-service/fixtures.js";
import { changeLog, count, day, evidence, MARKER, seedViewerHistory, techLog } from "../data-lifecycle-service/s020/seed.js";
import { removeDirectory, scratchDirectory } from "./helpers.js";

/*
 * VW-S020-AC001 (SUB-037): tiered retention, Q30 secure delete, coordination with active tasks. All values are synthetic.
 */

let fixture: DataFixture;
let database: VoxwardDatabase;

beforeEach(() => {
  fixture = openDataFixture("s020-retention");
  database = fixture.database;
});

afterEach(() => {
  fixture.close();
});

function seedTiers(): void {
  const logs = createAuditLogPort(database);
  logs.insertTechnicalLog(techLog("log-a", "corr-a", null, null, day(14)), [evidence("ev-a", "MESSAGE_TEXT", "text", day(7))]);
  logs.insertChangeLog(changeLog("change-a", "corr-a", "MANUAL_VERDICT", day(30)));
}

describe("Q30 secure_delete", () => {
  it("is ON on every connection that openDatabase returns", () => {
    expect(database.sqlite.pragma("secure_delete", { simple: true })).toBe(1);
    const directory = scratchDirectory("s020-q30");
    const second = openDatabase({ filePath: join(directory, "second.sqlite3") });
    try {
      expect(second.sqlite.pragma("secure_delete", { simple: true })).toBe(1);
    } finally {
      second.close();
      removeDirectory(directory);
    }
  });
});

describe("tiered expiry", () => {
  it("removes evidence first, then technical log metadata, then the Change Log, each on its own period", () => {
    seedTiers();
    const store = createRetentionStore(database);

    const first = store.sweepExpired({ nowIso: day(8) });
    expect(first.removed).toEqual({ evidence: 1, technicalLogs: 0, changeLogs: 0 });
    expect(count(database, "technical_logs where id = 'log-a'")).toBe(1);

    const second = store.sweepExpired({ nowIso: day(15) });
    expect(second.removed).toEqual({ evidence: 0, technicalLogs: 1, changeLogs: 0 });
    expect(count(database, "change_logs where id = 'change-a'")).toBe(1);

    const third = store.sweepExpired({ nowIso: day(31) });
    expect(third.removed.changeLogs).toBe(1);
    expect(third.complete).toBe(true);
  });

  it("keeps unexpired rows and does not delete a log that still has unexpired evidence", () => {
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog("log-b", "corr-b", null, null, day(5)), [evidence("ev-b", "MESSAGE_TEXT", "kept", day(20))]);
    const result = createRetentionStore(database).sweepExpired({ nowIso: day(6) });
    expect(result.removed).toEqual({ evidence: 0, technicalLogs: 0, changeLogs: 0 });
    expect(count(database, "technical_logs where id = 'log-b'")).toBe(1);
    expect(count(database, "technical_log_evidence where id = 'ev-b'")).toBe(1);
    // The log is past its own expiry but its evidence is not, so the sweep does not claim to be finished.
    expect(result.complete).toBe(false);
  });

  it("lets a channel retention-config shorten a stored expiry, never extend it", () => {
    seedTiers();
    writeChannelSetting(database, CHANNEL, "retention-config", { changeLogDays: 3, technicalLogDays: 2, evidenceDays: 1 });
    const shortened = createRetentionStore(database).sweepExpired({ nowIso: day(4) });
    expect(shortened.removed).toEqual({ evidence: 1, technicalLogs: 1, changeLogs: 1 });
    expect(shortened.complete).toBe(true);

    seedTiers2();
    writeChannelSetting(database, CHANNEL, "retention-config", { changeLogDays: 3650, technicalLogDays: 365, evidenceDays: 365 });
    const kept = createRetentionStore(database).sweepExpired({ nowIso: day(31) });
    expect(kept.removed).toEqual({ evidence: 1, technicalLogs: 1, changeLogs: 1 });
  });

  function seedTiers2(): void {
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog("log-c", "corr-c", null, null, day(14)), [evidence("ev-c", "MESSAGE_TEXT", "text", day(7))]);
    logs.insertChangeLog(changeLog("change-c", "corr-c", "MANUAL_VERDICT", day(30)));
  }

  it("runs in bounded batches and still drains every expired row", () => {
    const logs = createAuditLogPort(database);
    for (let i = 0; i < 5; i += 1) logs.insertChangeLog(changeLog(`change-batch-${i}`, `corr-batch-${i}`, "MANUAL_VERDICT", day(1)));
    const result = createRetentionStore(database).sweepExpired({ nowIso: day(2), batchSize: 2 });
    expect(result.removed.changeLogs).toBe(5);
    expect(() => createRetentionStore(database).sweepExpired({ nowIso: "not a time" })).toThrow(RangeError);
  });
});

describe("coordination with active tasks and S019", () => {
  it("skips the rows of a queued task, reports the cleanup as incomplete, and removes them once the task is done", () => {
    seedViewerHistory(database);
    database.sqlite.prepare("update technical_logs set expires_at = ? where id = 'log-1'").run(day(1));
    database.sqlite.prepare("update technical_log_evidence set expires_at = ? where log_id = 'log-1'").run(day(1));
    const store = createRetentionStore(database);

    const blocked = store.sweepExpired({ nowIso: day(2) });
    expect(blocked.removed.technicalLogs).toBe(0);
    expect(blocked.remainingExpired.technicalLogs).toBe(1);
    expect(blocked.complete).toBe(false);
    expect(count(database, "technical_log_evidence where log_id = 'log-1'")).toBe(2);

    database.sqlite.prepare("update tasks set status = 'DONE' where id = 'task-1'").run();
    const done = store.sweepExpired({ nowIso: day(2) });
    expect(done.removed).toMatchObject({ evidence: 2, technicalLogs: 1 });
    expect(done.complete).toBe(true);
    // The other subject's task and rows are untouched.
    expect(count(database, "technical_logs where id = 'log-2'")).toBe(1);
  });

  it("leaves S019 request, item and exception rows alone", () => {
    seedViewerHistory(database);
    const before = ["data_requests", "data_request_items", "score_exceptions"].map((table) => count(database, table));
    createRetentionStore(database).sweepExpired({ nowIso: day(400) });
    expect(["data_requests", "data_request_items", "score_exceptions"].map((table) => count(database, table))).toEqual(before);
  });
});

describe("page release after expiry", () => {
  it("leaves no trace of an expired payload in the database file or the WAL after compact()", () => {
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog("log-m", "corr-m", null, null, day(1)), [evidence("ev-m", "MESSAGE_TEXT", MARKER.repeat(20), day(1))]);
    database.sqlite.pragma("wal_checkpoint(TRUNCATE)");
    const bytes = (): string => {
      const parts = [database.filePath, `${database.filePath}-wal`].filter((path) => existsSync(path));
      return parts.map((path) => readFileSync(path).toString("latin1")).join("");
    };
    expect(bytes()).toContain(MARKER);

    const store = createRetentionStore(database);
    store.sweepExpired({ nowIso: day(2) });
    expect(store.compact()).toEqual({ compacted: true, code: "COMPACTED" });
    expect(bytes()).not.toContain(MARKER);
  });

  it("reports WAL_BUSY instead of success while another connection holds a read transaction", () => {
    const reader = openDatabase({ filePath: database.filePath });
    // The checkpoint waits for the connection's busy timeout. A short one keeps the test fast and the outcome the same.
    database.sqlite.pragma("busy_timeout = 50");
    try {
      reader.sqlite.exec("BEGIN");
      reader.sqlite.prepare("select count(*) from channels").get();
      createAuditLogPort(database).insertChangeLog(changeLog("change-w", "corr-w", "MANUAL_VERDICT"));
      const result = createRetentionStore(database).compact();
      expect(result.compacted).toBe(false);
      expect(["WAL_BUSY", "VACUUM_FAILED"]).toContain(result.code);
    } finally {
      reader.sqlite.exec("ROLLBACK");
      reader.close();
    }
  });
});
