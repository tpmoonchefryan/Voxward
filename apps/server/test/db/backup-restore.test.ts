import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogPort } from "../../src/db/audit-log.js";
import { BackupError, createBackup, listBackups, pruneBackups, restoreBackup, pruneLedgerForBackups } from "../../src/db/backup-store.js";
import { writeChannelSetting } from "../../src/db/channel-settings-store.js";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { bumpGenerationForTombstone, reinstateException } from "../../src/db/restore-support.js";
import { createSubjectCleanupPort } from "../../src/db/subject-cleanup.js";
import { createTombstoneLedger, ledgerRecorder, TombstoneLedgerError, TOMBSTONE_FILE, type TombstoneLedger } from "../../src/db/tombstone-ledger.js";
import { CERTIFICATE_SUMMARY } from "../../src/modules/audit-store/index.js";
import { executeRequest, replayTombstones } from "../../src/modules/data-lifecycle-service/index.js";
import { actorFor, CHANNEL, openDataFixture, SUBJECT, TWIN, type DataFixture } from "../data-lifecycle-service/fixtures.js";
import { changeLog, count, day, evidence, MARKER, seedViewerHistory, techLog } from "../data-lifecycle-service/s020/seed.js";
import { removeDirectory, scratchDirectory, T0 } from "./helpers.js";

/*
 * VW-SUB038-AC001: bounded local backups, an external tombstone ledger, and a restore that replays deletions in
 * isolation before the live file is replaced. All values are synthetic.
 */

const LIMITS = { maxCount: 3, maxTotalBytes: 1_000_000_000, maxAgeDays: 30 };

let fixture: DataFixture;
let database: VoxwardDatabase;
let workDir: string;
let backups: string;
let ledger: TombstoneLedger;

beforeEach(() => {
  fixture = openDataFixture("s020-backup");
  database = fixture.database;
  workDir = scratchDirectory("s020-work");
  backups = join(workDir, "backups");
  ledger = createTombstoneLedger(join(workDir, "tombstones"));
});

afterEach(() => {
  fixture.close();
  removeDirectory(workDir);
});

function stamp(offsetDays: number, ms = 0): string {
  return new Date(Date.parse(day(offsetDays)) + ms).toISOString();
}

function verifiedDelete(subjectRef: string, mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT"): string {
  const actor = actorFor("DATA_ADMIN");
  const created = fixture.routes.createRequest(actor, { subjectRef, kind: "DELETE", mode, requestSource: "OPERATOR_INITIATED" });
  const requestId = (created.body as { requestId: string }).requestId;
  fixture.routes.decideVerification(actor, requestId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
  return requestId;
}

function runDeletion(subjectRef: string, mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT"): string {
  const requestId = verifiedDelete(subjectRef, mode);
  const deps = { ...fixture.deps, tombstones: ledgerRecorder(ledger) };
  const response = executeRequest(deps, actorFor("DATA_ADMIN"), requestId);
  expect((response.body as { execution: string }).execution).toBe("COMPLETED");
  return requestId;
}

function replayOn(staged: VoxwardDatabase, tombstones: Parameters<typeof replayTombstones>[1]) {
  let n = 0;
  return replayTombstones(
    {
      cleanup: createSubjectCleanupPort(staged),
      logs: createAuditLogPort(staged),
      reinstateException: (input) => reinstateException(staged, { ...input, id: `restored-${++n}` }),
      bumpGenerationForTombstone: (input) => bumpGenerationForTombstone(staged, input),
      certificateSummary: CERTIFICATE_SUMMARY,
      now: () => new Date(T0),
    },
    tombstones,
  );
}

function subjectRows(db: VoxwardDatabase, subjectId: string, eventId: string): Record<string, number> {
  return {
    events: count(db, "channel_events where subject_id = ?", subjectId),
    tasks: count(db, `tasks where event_id = '${eventId}'`),
    logs: count(db, "technical_logs where subject_id = ?", subjectId),
    evidence: count(db, `technical_log_evidence where payload like '%${MARKER}%' or log_id in (select id from technical_logs where subject_id = '${subjectId}')`),
    ledger: count(db, "score_ledger where subject_id = ?", subjectId),
    identities: count(db, "subject_identities where subject_id = ?", subjectId),
    nicknames: count(db, "subject_nickname_changes where subject_id = ?", subjectId),
  };
}

describe("bounded rotation", () => {
  it("keeps at most maxCount backups, always the newest, and removes stray temporary files", () => {
    mkdirSync(backups, { recursive: true });
    writeFileSync(join(backups, "voxward-20200101T000000.000Z.sqlite3.tmp"), "half");
    for (let i = 0; i < 5; i += 1) createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(i) });
    const kept = listBackups(backups);
    expect(kept.map((b) => b.createdAt)).toEqual([stamp(4), stamp(3), stamp(2)]);
    expect(readdirSync(backups).some((name) => name.endsWith(".tmp"))).toBe(false);
  });

  it("prunes by total size and by age, and never removes the newest", () => {
    for (let i = 0; i < 3; i += 1) createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(i) });
    const bySize = pruneBackups(backups, { ...LIMITS, maxTotalBytes: 1 }, stamp(3));
    expect(bySize).toHaveLength(2);
    expect(listBackups(backups).map((b) => b.createdAt)).toEqual([stamp(2)]);

    const byAge = pruneBackups(backups, { ...LIMITS, maxAgeDays: 1 }, stamp(60));
    expect(byAge).toHaveLength(0);
    expect(listBackups(backups)).toHaveLength(1);
  });

  it("refuses unbounded or invalid limits and a repeated timestamp", () => {
    for (const limits of [{ ...LIMITS, maxCount: 0 }, { ...LIMITS, maxTotalBytes: Infinity }, { ...LIMITS, maxAgeDays: -1 }]) {
      expect(() => createBackup(database, { directory: backups, limits, nowIso: stamp(0) })).toThrow(BackupError);
    }
    createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(0) });
    expect(() => createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(0) })).toThrowError(/BACKUP_EXISTS/);
  });

  it("takes a consistent copy that opens, passes integrity_check and holds the live rows", () => {
    seedViewerHistory(database);
    const { created } = createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(0) });
    const copy = openDatabase({ filePath: created.path });
    try {
      expect(copy.sqlite.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(count(copy, "technical_logs")).toBe(2);
    } finally {
      copy.close();
    }
  });
});

describe("tombstone ledger", () => {
  it("lives outside the database and the backups, dedupes a request, and refuses an unreadable file", () => {
    runDeletionPrereqs();
    const entry = { kind: "DELETE", requestId: "r-1", channelId: CHANNEL, subjectId: SUBJECT, mode: "DELETE_DATA_ONLY", at: T0 } as const;
    ledger.record(entry);
    ledger.record(entry);
    expect(ledger.read()).toHaveLength(1);
    expect(existsSync(join(workDir, "tombstones", TOMBSTONE_FILE))).toBe(true);
    expect(readFileSync(join(workDir, "tombstones", TOMBSTONE_FILE), "utf8")).not.toContain("synthetic-key");

    appendFileSync(join(workDir, "tombstones", TOMBSTONE_FILE), "not json\n");
    expect(() => ledger.read()).toThrow(TombstoneLedgerError);
  });

  it("drops a finished tombstone only once the oldest backup is not older than it, and never an unfinished one", () => {
    const base = { channelId: CHANNEL, subjectId: SUBJECT, mode: "DELETE_DATA_ONLY" } as const;
    ledger.record({ kind: "DELETE", requestId: "done", at: stamp(1), ...base });
    ledger.record({ kind: "DONE", requestId: "done", channelId: CHANNEL, subjectId: SUBJECT, at: stamp(1, 5) });
    ledger.record({ kind: "DELETE", requestId: "open", at: stamp(1, 1), ...base, subjectId: TWIN });

    createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(0) });
    expect(pruneLedgerForBackups(ledger, backups, stamp(10))).toBe(0);

    pruneBackups(backups, { ...LIMITS, maxCount: 1 }, stamp(3));
    createBackup(database, { directory: backups, limits: { ...LIMITS, maxCount: 1 }, nowIso: stamp(2) });
    expect(listBackups(backups).map((b) => b.createdAt)).toEqual([stamp(2)]);
    expect(pruneLedgerForBackups(ledger, backups, stamp(10))).toBe(2);
    expect(ledger.read().map((e) => e.requestId)).toEqual(["open"]);
  });

  function runDeletionPrereqs(): void {
    expect(ledger.read()).toEqual([]);
  }
});

describe("restore with replay (zero resurrection)", () => {
  function restoreFlow(mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT") {
    seedViewerHistory(database);
    const { created } = createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(0) });
    expect(subjectRows(database, SUBJECT, "event-1").logs).toBe(1);
    const requestId = runDeletion(SUBJECT, mode);
    expect(subjectRows(database, SUBJECT, "event-1")).toEqual({ events: 0, tasks: 0, logs: 0, evidence: 0, ledger: 0, identities: 0, nicknames: 0 });
    return { created, requestId };
  }

  it("repeats a deletion that happened after the backup: nothing of the subject comes back, other subjects stay", () => {
    const { created } = restoreFlow("DELETE_DATA_ONLY");
    const livePath = database.filePath;
    database.close();

    // The snapshot is the old state: it still holds every row of SUBJECT.
    const old = openDatabase({ filePath: created.path });
    expect(subjectRows(old, SUBJECT, "event-1").logs).toBe(1);
    old.close();

    restoreBackup({ backupPath: created.path, targetPath: livePath, ledger, replay: replayOn });
    const restored = openDatabase({ filePath: livePath });
    try {
      expect(subjectRows(restored, SUBJECT, "event-1")).toEqual({ events: 0, tasks: 0, logs: 0, evidence: 0, ledger: 0, identities: 0, nicknames: 0 });
      expect(subjectRows(restored, TWIN, "event-2")).toMatchObject({ events: 1, tasks: 1, logs: 1, evidence: 1 });
      expect(count(restored, "score_exceptions where subject_id = ? and removed_at is null", SUBJECT)).toBe(1); // the fixture's own marker is unchanged
      expect(restored.sqlite.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(restored.sqlite.pragma("foreign_key_check")).toEqual([]);
      expect(readFileSync(livePath).toString("latin1")).not.toContain(MARKER);
    } finally {
      restored.close();
    }
    expect(existsSync(`${livePath}.restoring`)).toBe(false);
  });

  it("reinstates the scoring exception of DELETE_AND_EXCEPT when the snapshot predates it, and honours a later RESUME", () => {
    seedViewerHistory(database);
    database.sqlite.prepare("delete from score_exceptions").run();
    const { created } = createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(0) });
    runDeletion(SUBJECT, "DELETE_AND_EXCEPT");
    const livePath = database.filePath;
    database.close();

    restoreBackup({ backupPath: created.path, targetPath: livePath, ledger, replay: replayOn });
    let restored = openDatabase({ filePath: livePath });
    expect(count(restored, "score_exceptions where subject_id = ? and removed_at is null", SUBJECT)).toBe(1);
    restored.close();

    ledger.record({ kind: "RESUME", requestId: "resume-1", channelId: CHANNEL, subjectId: SUBJECT, at: stamp(5) });
    restoreBackup({ backupPath: created.path, targetPath: livePath, ledger, replay: replayOn });
    restored = openDatabase({ filePath: livePath });
    try {
      expect(count(restored, "score_exceptions where subject_id = ?", SUBJECT)).toBe(0);
      expect(subjectRows(restored, SUBJECT, "event-1").events).toBe(0);
    } finally {
      restored.close();
    }
  });

  it("leaves the live file untouched and removes staging when the replay is incomplete or the ledger is unreadable", () => {
    const { created } = restoreFlow("DELETE_DATA_ONLY");
    const livePath = database.filePath;
    database.close();
    const before = readFileSync(livePath);

    expect(() =>
      restoreBackup({ backupPath: created.path, targetPath: livePath, ledger, replay: () => ({ complete: false }) }),
    ).toThrowError(/RESTORE_REPLAY_INCOMPLETE/);
    expect(readFileSync(livePath).equals(before)).toBe(true);
    expect(existsSync(`${livePath}.restoring`)).toBe(false);

    appendFileSync(join(workDir, "tombstones", TOMBSTONE_FILE), "garbage\n");
    expect(() => restoreBackup({ backupPath: created.path, targetPath: livePath, ledger, replay: replayOn })).toThrow(TombstoneLedgerError);
    expect(readFileSync(livePath).equals(before)).toBe(true);
    expect(existsSync(`${livePath}.restoring`)).toBe(false);
  });

  it("fails closed: a deletion whose tombstone cannot be written removes nothing", () => {
    seedViewerHistory(database);
    const requestId = verifiedDelete(SUBJECT, "DELETE_DATA_ONLY");
    const deps = {
      ...fixture.deps,
      tombstones: {
        record: () => {
          throw new TombstoneLedgerError("LEDGER_WRITE_FAILED");
        },
      },
    };
    const response = executeRequest(deps, actorFor("DATA_ADMIN"), requestId);
    expect(response).toEqual({ status: 409, body: { error: "TOMBSTONE_UNAVAILABLE" } });
    expect(subjectRows(database, SUBJECT, "event-1").logs).toBe(1);
  });

  it("reports a tombstoned subject that the snapshot does not contain as absent, not as a failure", () => {
    ledger.record({ kind: "DELETE", requestId: "r-x", channelId: CHANNEL, subjectId: "subject-never-existed", mode: "DELETE_DATA_ONLY", at: T0 });
    const report = replayOn(database, ledger.read());
    expect(report).toMatchObject({ complete: true, replayed: 0, absent: 1, failed: [] });
  });

  it("advances processing_generation for post-backup deletions and sweeps/compacts expired rows during restore (B13)", () => {
    seedViewerHistory(database);
    const logs = createAuditLogPort(database);
    const natMarker = "B13_NATURALLY_EXPIRED_SWEPT_BYTES";
    const cfgMarker = "B13_SHORTENED_CFG_RESURRECTED_BYTES";
    logs.insertTechnicalLog(techLog("log-nat", "corr-nat", null, null, day(14)), [
      evidence("ev-nat", "MESSAGE_TEXT", natMarker, day(1)),
    ]);
    logs.insertTechnicalLog(techLog("log-cfg", "corr-cfg", null, null, day(30)), [
      evidence("ev-cfg", "MESSAGE_TEXT", cfgMarker, day(30)),
    ]);
    logs.insertChangeLog(changeLog("change-nat", "corr-nat", "MANUAL_VERDICT", day(1)));
    writeChannelSetting(database, CHANNEL, "retention-config", {
      changeLogDays: 30,
      technicalLogDays: 14,
      evidenceDays: 1,
    });

    const genBefore = database.sqlite
      .prepare("select processing_generation as g from subjects where id = ?")
      .get(SUBJECT) as { g: number };
    expect(genBefore.g).toBe(0);

    const { created } = createBackup(database, { directory: backups, limits: LIMITS, nowIso: stamp(0) });
    runDeletion(SUBJECT, "DELETE_DATA_ONLY");
    const livePath = database.filePath;
    database.close();

    restoreBackup({
      backupPath: created.path,
      targetPath: livePath,
      ledger,
      now: () => new Date(day(2)),
      replay: replayOn,
    });

    const restored = openDatabase({ filePath: livePath });
    try {
      const genAfter = restored.sqlite
        .prepare("select processing_generation as g from subjects where id = ?")
        .get(SUBJECT) as { g: number };
      expect(genAfter.g).toBe(1);
      expect(count(restored, "technical_log_evidence where id in ('ev-nat', 'ev-cfg')")).toBe(0);
      expect(count(restored, "change_logs where id = 'change-nat'")).toBe(0);
      const rawBytes = readFileSync(livePath).toString("latin1");
      expect(rawBytes).not.toContain(natMarker);
      expect(rawBytes).not.toContain(cfgMarker);
      expect(rawBytes).not.toContain(MARKER);
    } finally {
      restored.close();
    }
  });
});
