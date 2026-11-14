import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp, restoreDatabaseWithLedger } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import type { ServerConfig } from "../../src/config/schema.js";
import { createBackup } from "../../src/db/backup-store.js";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { SubjectStore } from "../../src/db/repository.js";
import { channels } from "../../src/db/schema/index.js";
import { createTombstoneLedger, TOMBSTONE_FILE, type TombstoneLedger } from "../../src/db/tombstone-ledger.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { CHANNEL, SUBJECT, TWIN } from "../data-lifecycle-service/fixtures.js";
import { count, day, MARKER, seedViewerHistory } from "../data-lifecycle-service/s020/seed.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

/*
 * S020 composition root wiring end-to-end test:
 * buildApp({ modules, database, tombstoneLedger }) -> pre-deletion backup -> HTTP /data/requests execute
 * (writes DELETE + DONE to tombstones.jsonl; unwritable ledger returns 409 fail-closed) -> restoreDatabaseWithLedger
 * -> zero resurrection for SUBJECT and intact TWIN. All values are synthetic.
 */

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const LIMITS = { maxCount: 3, maxTotalBytes: 1_000_000_000, maxAgeDays: 30 };
const PASSWORD = "correct horse battery";
const NOW = new Date(T0);

interface Session {
  readonly cookie: string;
  readonly csrf: string;
}

describe("S020 composition root tombstone wiring", () => {
  let dbDir: string;
  let workDir: string;
  let database: VoxwardDatabase;
  let ledgerDir: string;
  let ledger: TombstoneLedger;
  let backupsDir: string;
  let app: FastifyInstance | undefined;

  beforeEach(async () => {
    dbDir = scratchDirectory("s020-app-db-");
    workDir = scratchDirectory("s020-app-work-");
    ledgerDir = join(workDir, "tombstones");
    backupsDir = join(workDir, "backups");
    database = migratedDatabase(dbDir);
    ledger = createTombstoneLedger(ledgerDir);

    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({ id: CHANNEL, platform: "youtube", platformChannelRef: "UC-channel-1", displayName: CHANNEL, createdAt: T0, updatedAt: T0 })
        .run();
      SubjectStore.create(tx, { id: SUBJECT, channelId: CHANNEL, platformSubjectKey: "synthetic-key-1", createdAt: T0 });
      SubjectStore.create(tx, { id: TWIN, channelId: CHANNEL, platformSubjectKey: "synthetic-key-2", createdAt: T0 });
    });
    seedViewerHistory(database);

    const admin = (await createAccount(database, { loginName: "admin", displayName: "Admin", password: PASSWORD, now: NOW })).accountId;
    runShortTransaction(database, (tx) => {
      grantMembership(tx, { channelId: CHANNEL, accountId: admin, role: "DATA_ADMIN", logAccess: false, now: NOW });
    });
  });

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
    try {
      database.close();
    } catch {
      // May already be closed by a restore test.
    }
    removeDirectory(dbDir);
    removeDirectory(workDir);
  });

  async function signIn(instance: FastifyInstance): Promise<Session> {
    const response = await instance.inject({ method: "POST", url: "/auth/login", payload: { loginName: "admin", password: PASSWORD } });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { csrfToken: string };
    return { cookie: String(response.headers["set-cookie"]).split(";")[0] ?? "", csrf: body.csrfToken };
  }

  async function createAndVerifyDelete(instance: FastifyInstance, headers: Record<string, string>, mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT"): Promise<string> {
    const created = await instance.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests`,
      headers,
      payload: { subjectRef: SUBJECT, kind: "DELETE", mode, requestSource: "OPERATOR_INITIATED" },
    });
    expect(created.statusCode).toBe(201);
    const requestId = (created.json() as { requestId: string }).requestId;
    const decided = await instance.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${requestId}/verification`,
      headers,
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    expect(decided.statusCode).toBe(200);
    return requestId;
  }

  it("writes DELETE and DONE to tombstones.jsonl over HTTP and prevents resurrection on restoreDatabaseWithLedger", async () => {
    const { created: backup } = createBackup(database, { directory: backupsDir, limits: LIMITS, nowIso: day(0) });
    app = buildApp({ modules: buildRegistry(config), logger: false, database, tombstoneLedger: ledger });

    const session = await signIn(app);
    const headers = { cookie: session.cookie, "x-csrf-token": session.csrf };
    const requestId = await createAndVerifyDelete(app, headers, "DELETE_AND_EXCEPT");

    const executed = await app.inject({ method: "POST", url: `/channels/${CHANNEL}/data/requests/${requestId}/execute`, headers });
    expect(executed.statusCode).toBe(200);
    expect((executed.json() as { execution: string }).execution).toBe("COMPLETED");

    const tombstoneFile = join(ledgerDir, TOMBSTONE_FILE);
    expect(existsSync(tombstoneFile)).toBe(true);
    const entries = ledger.read();
    expect(entries.map((entry) => ({ kind: entry.kind, requestId: entry.requestId, subjectId: entry.subjectId }))).toEqual([
      { kind: "DELETE", requestId, subjectId: SUBJECT },
      { kind: "DONE", requestId, subjectId: SUBJECT },
    ]);

    const targetPath = database.filePath;
    await app.close();
    app = undefined;
    database.close();

    restoreDatabaseWithLedger({ backupPath: backup.path, targetPath, ledger });

    const restored = openDatabase({ filePath: targetPath });
    try {
      expect(count(restored, "channel_events where subject_id = ?", SUBJECT)).toBe(0);
      expect(count(restored, "tasks where event_id = 'event-1'")).toBe(0);
      expect(count(restored, "technical_logs where subject_id = ?", SUBJECT)).toBe(0);
      expect(count(restored, "technical_log_evidence where payload like ?", `%${MARKER}%`)).toBe(0);
      expect(count(restored, "score_exceptions where subject_id = ? and removed_at is null", SUBJECT)).toBe(1);

      expect(count(restored, "channel_events where subject_id = ?", TWIN)).toBe(1);
      expect(count(restored, "tasks where event_id = 'event-2'")).toBe(1);
      expect(count(restored, "technical_logs where subject_id = ?", TWIN)).toBe(1);
      expect(count(restored, "technical_log_evidence where log_id = 'log-2'")).toBe(1);

      expect(restored.sqlite.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(restored.sqlite.pragma("foreign_key_check")).toEqual([]);
      expect(readFileSync(targetPath).toString("latin1")).not.toContain(MARKER);
    } finally {
      restored.close();
    }
  });

  it("fails closed with 409 TOMBSTONE_UNAVAILABLE when the ledger cannot be written", async () => {
    const blockedPath = join(workDir, "not-a-directory");
    writeFileSync(blockedPath, "occupied");
    const brokenLedger = createTombstoneLedger(blockedPath);

    app = buildApp({ modules: buildRegistry(config), logger: false, database, tombstoneLedger: brokenLedger });
    const session = await signIn(app);
    const headers = { cookie: session.cookie, "x-csrf-token": session.csrf };
    const requestId = await createAndVerifyDelete(app, headers, "DELETE_DATA_ONLY");

    const executed = await app.inject({ method: "POST", url: `/channels/${CHANNEL}/data/requests/${requestId}/execute`, headers });
    expect(executed.statusCode).toBe(409);
    expect(executed.json()).toEqual({ error: "TOMBSTONE_UNAVAILABLE" });
    expect(count(database, "technical_logs where subject_id = ?", SUBJECT)).toBe(1);
    expect(count(database, "channel_events where subject_id = ?", SUBJECT)).toBe(1);
  });
});
