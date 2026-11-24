import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { CONTRACT_VERSION } from "@voxward/contracts";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";
import { createAccount } from "../../../src/auth/login.js";
import { grantMembership } from "../../../src/auth/members.js";
import type { ServerConfig } from "../../../src/config/schema.js";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import { BackupError, createBackup, restoreBackup } from "../../../src/db/backup-store.js";
import { openDatabase, type VoxwardDatabase } from "../../../src/db/client.js";
import { SubjectStore } from "../../../src/db/repository.js";
import { restoreDatabaseWithPorts } from "../../../src/db/restore-support.js";
import { createRetentionStore } from "../../../src/db/retention-store.js";
import {
  channelEvents,
  channels,
  scoreExceptions,
  subjectNicknameChanges,
  subjects,
  technicalLogEvidence,
  technicalLogs,
} from "../../../src/db/schema/index.js";
import { createTombstoneLedger } from "../../../src/db/tombstone-ledger.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { CERTIFICATE_SUMMARY, createAuditStore } from "../../../src/modules/audit-store/index.js";
import { replayTombstones } from "../../../src/modules/data-lifecycle-service/index.js";
import { buildRegistry } from "../../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const PASSWORD = "correct horse battery";
const NOW = new Date();
const T0 = NOW.toISOString();

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

interface Session {
  readonly cookie: string;
  readonly csrf: string;
}

describe("S028 Data Lifecycle: Micro-Batch Isolation, Cross-Channel correlationId, RBAC & WAL/Restore Erasure", () => {
  let dbDir: string;
  let backupDir: string;
  let ledgerDir: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;

  async function signIn(loginName: string): Promise<Session> {
    const response = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName, password: PASSWORD } });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { csrfToken: string };
    return { cookie: String(response.headers["set-cookie"]).split(";")[0] ?? "", csrf: body.csrfToken };
  }

  function writeTechLog(channelId: string, subjectId: string, correlationId: string, secretTag: string, clockDate = NOW): string {
    const audit = createAuditStore({
      port: createAuditLogPort(database),
      sanitize: (s) => s,
      newId: randomUUID,
      access: {
        channelsFor: () => [channelId],
        capabilitiesFor: () => new Set(["logs.view", "logs.view_content"]),
      },
      clock: () => clockDate,
    });
    return audit.recordTechnical({
      contractVersion: CONTRACT_VERSION,
      kind: "TECHNICAL",
      channelId,
      correlationId,
      stage: "BASE_RULE",
      status: "OK",
      level: "INFO",
      subjectRef: subjectId,
      batchId: "micro-batch-1",
      taskId: null,
      attempt: 1,
      errorCode: null,
      providerRef: "synthetic",
      modelRef: "synthetic-model",
      ruleTemplateVersion: "v1",
      latencyMs: 5,
      data: { batch: "micro-batch-1" },
      evidence: [
        { kind: "MESSAGE_TEXT", payload: `MSG_${secretTag}` },
        { kind: "TRANSLATION", payload: `TRANS_${secretTag}` },
        { kind: "VALIDATED_JSON", payload: JSON.stringify({ secret: `JSON_${secretTag}`, action: "ALLOW_MEANINGFUL" }) },
        { kind: "ITEM_ID_MAP", payload: JSON.stringify({ item0: `evt-${secretTag}` }) },
      ],
    }).logId;
  }

  beforeEach(async () => {
    dbDir = scratchDirectory("s028-iso-");
    backupDir = scratchDirectory("s028-bak-");
    ledgerDir = scratchDirectory("s028-led-");
    database = migratedDatabase(dbDir);

    runShortTransaction(database, (tx) => {
      for (const ch of ["ch-1", "ch-2"]) {
        tx.insert(channels)
          .values({ id: ch, platform: "youtube", platformChannelRef: `UC-${ch}`, displayName: ch, createdAt: T0, updatedAt: T0 })
          .run();
      }
    });

    const admin = await createAccount(database, { loginName: "admin", displayName: "DataAdmin", password: PASSWORD, now: NOW });
    const modWithLogs = await createAccount(database, { loginName: "modlogs", displayName: "ModLogs", password: PASSWORD, now: NOW });
    const modNoLogs = await createAccount(database, { loginName: "modnologs", displayName: "ModNoLogs", password: PASSWORD, now: NOW });

    runShortTransaction(database, (tx) => {
      grantMembership(tx, { channelId: "ch-1", accountId: admin.accountId, role: "DATA_ADMIN", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: "ch-1", accountId: modWithLogs.accountId, role: "MODERATOR", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: "ch-1", accountId: modNoLogs.accountId, role: "MODERATOR", logAccess: false, now: NOW });
    });

    app = buildApp({
      modules: buildRegistry(config),
      logger: false,
      database,
      tombstoneLedger: createTombstoneLedger(ledgerDir),
    });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    removeDirectory(dbDir);
    removeDirectory(backupDir);
    removeDirectory(ledgerDir);
  });

  it("isolates micro-batch subjects and cross-channel correlationId, enforces RBAC field permissions, and blocks deleted/expired retrieval", async () => {
    const sharedCorr = "corr-cross-channel-shared";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, { id: "sub-1a", channelId: "ch-1", platformSubjectKey: "plat-1a", createdAt: T0 });
      SubjectStore.create(tx, { id: "sub-1b", channelId: "ch-1", platformSubjectKey: "plat-1b", createdAt: T0 });
      SubjectStore.create(tx, { id: "sub-2a", channelId: "ch-2", platformSubjectKey: "plat-2a", createdAt: T0 });
      tx.insert(channelEvents)
        .values([
          {
            id: "evt-1a",
            channelId: "ch-1",
            subjectId: "sub-1a",
            platformMessageRef: "pm-1a",
            platformOrder: 1,
            receivedAt: T0,
            correlationId: "evt-corr-1a",
            createdAt: T0,
          },
          {
            id: "evt-1b",
            channelId: "ch-1",
            subjectId: "sub-1b",
            platformMessageRef: "pm-1b",
            platformOrder: 2,
            receivedAt: T0,
            correlationId: "evt-corr-1b",
            createdAt: T0,
          },
          {
            id: "evt-2a",
            channelId: "ch-2",
            subjectId: "sub-2a",
            platformMessageRef: "pm-2a",
            platformOrder: 1,
            receivedAt: T0,
            correlationId: "evt-corr-2a",
            createdAt: T0,
          },
        ])
        .run();
    });

    const log1a = writeTechLog("ch-1", "sub-1a", sharedCorr, "1A");
    const log1b = writeTechLog("ch-1", "sub-1b", sharedCorr, "1B");
    const log2a = writeTechLog("ch-2", "sub-2a", sharedCorr, "2A");

    const admin = await signIn("admin");
    const modLogs = await signIn("modlogs");
    const modNoLogs = await signIn("modnologs");

    const modData = await app.inject({
      method: "GET",
      url: "/channels/ch-1/data/subjects/sub-1a",
      headers: { cookie: modLogs.cookie },
    });
    expect(modData.statusCode).toBe(403);

    const modNoLogView = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/technical/${log1a}`,
      headers: { cookie: modNoLogs.cookie },
    });
    expect(modNoLogView.statusCode).toBe(403);

    // MODERATOR with logs.view sees MESSAGE_TEXT/TRANSLATION (message.original), but VALIDATED_JSON/ITEM_ID_MAP are null (no subject.evidence)
    const modLogDetail = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/technical/${log1a}`,
      headers: { cookie: modLogs.cookie },
    });
    expect(modLogDetail.statusCode).toBe(200);
    const modEvidence = (modLogDetail.json() as { evidence: { kind: string; payload: string | null }[] }).evidence;
    expect(modEvidence.find((e) => e.kind === "MESSAGE_TEXT")?.payload).toContain("MSG_1A");
    expect(modEvidence.find((e) => e.kind === "VALIDATED_JSON")).toBeUndefined();
    expect(modEvidence.find((e) => e.kind === "ITEM_ID_MAP")).toBeUndefined();

    // DATA_ADMIN sees VALIDATED_JSON/ITEM_ID_MAP (subject.evidence), while MESSAGE_TEXT/TRANSLATION are omitted (no message.original)
    const adminLogDetail = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/technical/${log1a}`,
      headers: { cookie: admin.cookie },
    });
    expect(adminLogDetail.statusCode).toBe(200);
    const adminEvidence = (adminLogDetail.json() as { evidence: { kind: string; payload: string | null }[] }).evidence;
    expect(adminEvidence.find((e) => e.kind === "VALIDATED_JSON")?.payload).toContain("JSON_1A");
    expect(adminEvidence.find((e) => e.kind === "MESSAGE_TEXT")).toBeUndefined();

    const chainBefore = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/chains/${sharedCorr}`,
      headers: { cookie: admin.cookie },
    });
    expect(chainBefore.statusCode).toBe(200);
    const chainIdsBefore = (chainBefore.json() as { items: { id: string }[] }).items.map((i) => i.id);
    expect(chainIdsBefore).toContain(log1a);
    expect(chainIdsBefore).toContain(log1b);
    expect(chainIdsBefore).not.toContain(log2a);

    const createReq = await app.inject({
      method: "POST",
      url: "/channels/ch-1/data/requests",
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: { subjectRef: "sub-1a", kind: "DELETE", mode: "DELETE_DATA_ONLY", requestSource: "OPERATOR_INITIATED" },
    });
    const reqId = (createReq.json() as { requestId: string }).requestId;
    await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${reqId}/verification`,
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    const execReq = await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${reqId}/execute`,
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
    });
    expect((execReq.json() as { execution: string }).execution).toBe("COMPLETED");

    const deletedDetail = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/technical/${log1a}`,
      headers: { cookie: admin.cookie },
    });
    expect(deletedDetail.statusCode).toBe(404);

    const chainAfter = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/chains/${sharedCorr}`,
      headers: { cookie: admin.cookie },
    });
    const chainIdsAfter = (chainAfter.json() as { items: { id: string }[] }).items.map((i) => i.id);
    expect(chainIdsAfter).toEqual([log1b]);

    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, "sub-1b")).all()).toHaveLength(1);
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, "sub-2a")).all()).toHaveLength(1);
    expect(database.orm.select().from(technicalLogs).where(eq(technicalLogs.id, log2a)).all()).toHaveLength(1);

    const retention = createRetentionStore(database);
    const farFuture = new Date(Date.parse(T0) + 120 * 86_400_000).toISOString();
    const sweep = retention.sweepExpired({ nowIso: farFuture });
    expect(sweep.complete).toBe(true);
    expect(sweep.removed.evidence).toBeGreaterThanOrEqual(4);

    const expiredDetail = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/technical/${log1b}`,
      headers: { cookie: admin.cookie },
    });
    expect(expiredDetail.statusCode).toBe(404);
  });

  it("replays tombstones, sweeps expired rows, compacts WAL, erases raw sqlite3 bytes, and cleans .restoring files", async () => {
    const secretNickHash = sha256("SECRET_NICKNAME_ALICE_991");
    const secretMsg = "SECRET_MSG_BODY_XYZ_882";
    const secretJson = "SECRET_JSON_PAYLOAD_773";
    const secretExpired = "SECRET_EXPIRED_EVIDENCE_664";

    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, { id: "sub-bak", channelId: "ch-1", platformSubjectKey: "plat-bak", createdAt: T0 });
      tx.insert(subjectNicknameChanges)
        .values({
          id: "nick-bak",
          subjectId: "sub-bak",
          previousNicknameHash: null,
          nextNicknameHash: secretNickHash,
          changedAt: T0,
        })
        .run();
      tx.insert(channelEvents)
        .values({
          id: "evt-bak",
          channelId: "ch-1",
          subjectId: "sub-bak",
          platformMessageRef: "pm-bak",
          platformOrder: 1,
          receivedAt: T0,
          correlationId: "corr-bak",
          createdAt: T0,
        })
        .run();
      SubjectStore.create(tx, { id: "sub-exp", channelId: "ch-1", platformSubjectKey: "plat-exp", createdAt: T0 });
    });

    writeTechLog("ch-1", "sub-bak", "corr-bak", `${secretMsg}_${secretJson}`);
    const oldDate = new Date(Date.parse(T0) - 30 * 86_400_000);
    writeTechLog("ch-1", "sub-exp", "corr-exp", secretExpired, oldDate);

    const limits = { maxCount: 5, maxTotalBytes: 50 * 1024 * 1024, maxAgeDays: 30 };
    const backup = createBackup(database, { directory: backupDir, limits, nowIso: T0 });
    expect(existsSync(backup.created.path)).toBe(true);

    const admin = await signIn("admin");
    const createReq = await app.inject({
      method: "POST",
      url: "/channels/ch-1/data/requests",
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: { subjectRef: "sub-bak", kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" },
    });
    const reqId = (createReq.json() as { requestId: string }).requestId;
    await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${reqId}/verification`,
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    const execReq = await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${reqId}/execute`,
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
    });
    expect((execReq.json() as { execution: string }).execution).toBe("COMPLETED");

    const targetPath = database.filePath;
    await app.close();
    database.close();

    const ledger = createTombstoneLedger(ledgerDir);

    expect(() =>
      restoreBackup({
        backupPath: backup.created.path,
        targetPath,
        ledger,
        replay: () => ({ complete: false }),
      }),
    ).toThrow(BackupError);
    expect(existsSync(`${targetPath}.restoring`)).toBe(false);
    expect(existsSync(`${targetPath}.restoring-wal`)).toBe(false);

    restoreDatabaseWithPorts({
      backupPath: backup.created.path,
      targetPath,
      ledger,
      certificateSummary: CERTIFICATE_SUMMARY,
      now: () => new Date(Date.parse(T0) + 10 * 86_400_000),
      replayWith: (ports, tombstones) => replayTombstones(ports, tombstones),
    });

    expect(existsSync(`${targetPath}.restoring`)).toBe(false);
    expect(existsSync(`${targetPath}.restoring-wal`)).toBe(false);
    if (existsSync(`${targetPath}-wal`)) {
      expect(statSync(`${targetPath}-wal`).size).toBe(0);
    }

    const restored = openDatabase({ filePath: targetPath });
    try {
      expect(restored.orm.select().from(subjectNicknameChanges).where(eq(subjectNicknameChanges.subjectId, "sub-bak")).all()).toHaveLength(0);
      expect(restored.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, "sub-bak")).all()).toHaveLength(0);
      expect(restored.orm.select().from(technicalLogs).where(eq(technicalLogs.subjectId, "sub-bak")).all()).toHaveLength(0);
      expect(restored.orm.select().from(technicalLogEvidence).all()).toHaveLength(0);
      const exc = restored.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, "sub-bak")).get();
      expect(exc?.removedAt).toBeNull();
      const subBak = restored.orm.select().from(subjects).where(eq(subjects.id, "sub-bak")).get();
      expect(subBak?.processingGeneration).toBeGreaterThanOrEqual(1);
    } finally {
      restored.close();
    }

    const rawBytes = readFileSync(targetPath);
    for (const marker of [secretNickHash, secretMsg, secretJson, secretExpired]) {
      expect(rawBytes.includes(marker)).toBe(false);
    }
  });
});
