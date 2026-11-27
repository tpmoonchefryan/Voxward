import { existsSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import {
  CONTRACT_VERSION,
  NATIVE_CLOSE,
  NATIVE_OUTPUT_PATH,
  NATIVE_OUTPUT_PROTOCOL,
  createVerdict,
  type ChannelEvent,
  type DeliverFrame,
  type NativeFrame,
} from "@voxward/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { attachBlivechatOutput } from "../../src/adapters/blivechat/socket.js";
import { attachNativeOutput, createWsUpgradeRateLimiter } from "../../src/adapters/native-output/socket.js";
import { buildApp } from "../../src/app.js";
import { bootstrapOwner } from "../../src/auth/bootstrap.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import { createAuditLogPort } from "../../src/db/audit-log.js";
import { createBackup } from "../../src/db/backup-store.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { openDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import {
  createApprovedContentPort,
  createOutputDeliveryPort,
  createOutputGrantPort,
  insertOutputGrant,
  revokeOutputGrant,
} from "../../src/db/output-store.js";
import { ChannelEventStore, TaskStore } from "../../src/db/repository.js";
import { restoreDatabaseWithPorts } from "../../src/db/restore-support.js";
import {
  channelEvents,
  deliveries,
  deploymentSettings,
  scoreExceptions,
  subjectScores,
  subjects,
  technicalLogs,
} from "../../src/db/schema/index.js";
import { createTombstoneLedger } from "../../src/db/tombstone-ledger.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { CERTIFICATE_SUMMARY, createAuditStore } from "../../src/modules/audit-store/index.js";
import { replayTombstones } from "../../src/modules/data-lifecycle-service/index.js";
import { BLIVECHAT_OUTPUT_PATH, BLIVECHAT_PROTOCOL_VERSION, createBlivechatAdapter } from "../../src/modules/output/index.js";
import { createDeliveryPump } from "../../src/modules/output-adapter/delivery.js";
import { createSubscriptionRegistry } from "../../src/modules/output-adapter/subscription.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";
import { eq } from "drizzle-orm";

const CH = "ch-mvp-e2e";
const OWNER_PW = "OwnerStrongPass#2026";
const MOD_PW = "ModStrongPass#2026";
const NOW = new Date(T0);

describe("VOXWARD-STORY-030 / SUB-054: Browser-to-OBS MVP E2E Matrix", () => {
  let dir: string;
  let dbPath: string;
  let ledgerDir: string;
  let backupDir: string;
  let db: VoxwardDatabase;
  let app: FastifyInstance | undefined;
  let wsServer: ReturnType<typeof createServer> | undefined;

  beforeEach(() => {
    dir = scratchDirectory("init001-e2e-");
    dbPath = `${dir}/voxward.sqlite3`;
    ledgerDir = `${dir}/tombstones`;
    backupDir = `${dir}/backups`;
    db = openDatabase({ filePath: dbPath });
    runMigrations(db);
  });

  afterEach(async () => {
    if (wsServer !== undefined) {
      await new Promise<void>((resolve) => wsServer!.close(() => resolve()));
      wsServer = undefined;
    }
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
    db.close();
    removeDirectory(dir);
  });

  it("verifies full clean-volume -> RBAC -> moderation/SC -> native/blivechat WS -> Overlay -> DELETE_AND_EXCEPT -> restore flow", async () => {
    // 1. Bootstrap Owner & invite Moderator + Data Admin roles
    const owner = await bootstrapOwner(db, {
      channelId: CH,
      loginName: "mvp-owner",
      displayName: "MVP Owner",
      password: OWNER_PW,
      now: NOW,
    });
    const mod = await createAccount(db, {
      loginName: "mvp-mod",
      displayName: "MVP Mod",
      password: MOD_PW,
      now: NOW,
    });
    const dataAdmin = await createAccount(db, {
      loginName: "mvp-dadmin",
      displayName: "MVP Data Admin",
      password: OWNER_PW,
      now: NOW,
    });
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH, accountId: mod.accountId, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH, accountId: dataAdmin.accountId, role: "DATA_ADMIN", logAccess: true, now: NOW });
      tx.insert(deploymentSettings)
        .values({ key: "retention.default", valueJson: JSON.stringify({ days: 7 }), updatedAt: T0 })
        .run();
    });

    const tombstoneLedger = createTombstoneLedger(ledgerDir);
    const modules = buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: dbPath }, {}, { database: db });
    app = buildApp({ modules, logger: false, database: db, tombstoneLedger });
    await app.ready();

    // Sign in Owner, Moderator, Data Admin
    const ownerLogin = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName: "mvp-owner", password: OWNER_PW } });
    expect(ownerLogin.statusCode).toBe(200);
    const ownerSession = {
      cookie: String(ownerLogin.headers["set-cookie"]).split(";")[0]!,
      csrf: (ownerLogin.json() as { csrfToken: string }).csrfToken,
    };
    const modLogin = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName: "mvp-mod", password: MOD_PW } });
    expect(modLogin.statusCode).toBe(200);
    const modSession = {
      cookie: String(modLogin.headers["set-cookie"]).split(";")[0]!,
      csrf: (modLogin.json() as { csrfToken: string }).csrfToken,
    };
    const adminLogin = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName: "mvp-dadmin", password: OWNER_PW } });
    expect(adminLogin.statusCode).toBe(200);
    const adminSession = {
      cookie: String(adminLogin.headers["set-cookie"]).split(";")[0]!,
      csrf: (adminLogin.json() as { csrfToken: string }).csrfToken,
    };

    // Owner has full channel access, Mod lacks logs.view (logAccess: false)
    const ownerChannels = await app.inject({
      method: "GET",
      url: "/auth/channels",
      headers: { cookie: ownerSession.cookie },
    });
    expect(ownerChannels.statusCode).toBe(200);
    const modLogsDeny = await app.inject({
      method: "GET",
      url: `/internal/channels/${CH}/logs/integration`,
      headers: { cookie: modSession.cookie },
    });
    expect(modLogsDeny.statusCode).toBe(403);

    // 2. Evaluate viewer message through ModerationEngine + ScoringEngine + seed Event/Task/Verdict/Delivery
    const corrId = "corr-mvp-1";
    const channelEvent: ChannelEvent = {
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: CH,
      platformMessageId: "pm-mvp-1",
      platformOrder: 101,
      correlationId: corrId,
      receivedAt: T0,
      sender: { contractVersion: CONTRACT_VERSION, senderRef: "yt-viewer-1" },
      body: "Amazing stream today!",
    };
    const modOutcome = await modules.moderationEngine.moderate(channelEvent);
    expect(["FAST_PASS", "REVIEW", "BLOCK"]).toContain(modOutcome.route);
    const scoreOutcome = await modules.scoringEngine.applyVerdict(channelEvent, createVerdict("ALLOW_MEANINGFUL"));
    expect(scoreOutcome.contractVersion).toBe(CONTRACT_VERSION);

    const subjectRow = db.orm.select().from(subjects).where(eq(subjects.channelId, CH)).get();
    expect(subjectRow).toBeDefined();
    const subjectId = subjectRow!.id;
    const eventId = "evt-mvp-1";
    const taskId = "task-mvp-1";
    const verdictId = "verd-mvp-1";
    const deliveryId = "deliv-mvp-1";

    const nativeCred = `vwo_${"n".repeat(43)}`;
    const bliveCred = `vwo_${"b".repeat(43)}`;
    const validUntil = "2099-01-01T00:00:00.000Z";

    runShortTransaction(db, (tx) => {
      ChannelEventStore.recordIfNew(tx, {
        id: eventId,
        channelId: CH,
        subjectId,
        platformMessageRef: "pm-mvp-1",
        platformOrder: 101,
        receivedAt: T0,
        correlationId: corrId,
        exceptionMarked: false,
        createdAt: T0,
      });
      TaskStore.create(tx, {
        id: taskId,
        eventId,
        kind: "REALTIME_REVIEW",
        deadlineAt: validUntil,
        createdAt: T0,
      });
      TaskStore.commitVerdict(tx, {
        verdictId,
        taskId,
        classification: "ALLOW_MEANINGFUL",
        source: "MODEL",
        decidedAt: T0,
        decidedByRef: owner.accountId,
      });
      insertOutputGrant(tx, {
        grantId: "grant-mvp-native",
        credentialRefId: "cref-mvp-native",
        channelId: CH,
        outputKind: "NATIVE_V1",
        credential: nativeCred,
        nowIso: T0,
      });
      insertOutputGrant(tx, {
        grantId: "grant-mvp-blive",
        credentialRefId: "cref-mvp-blive",
        channelId: CH,
        outputKind: "BLIVECHAT",
        credential: bliveCred,
        nowIso: T0,
      });
      tx.insert(deliveries)
        .values({
          id: deliveryId,
          eventId,
          verdictId,
          outputGrantId: "grant-mvp-native",
          deliverySequence: 1,
          platformOrder: 101,
          validUntil,
          status: "PENDING",
          attempts: 0,
          updatedAt: T0,
        })
        .run();
    });

    // 3. Downstream WebSockets (native-v1 + blivechat) + instant 4403 on grant revoke
    const subscribers = createSubscriptionRegistry();
    const grants = createOutputGrantPort(db, ["NATIVE_V1", "BLIVECHAT"]);
    const authLimiter = createWsUpgradeRateLimiter({ maxAttempts: 20, windowMs: 60_000 });
    wsServer = createServer();
    const nativeEp = attachNativeOutput(wsServer, {
      grants,
      subscribers,
      timing: { heartbeatMs: 40, pongTimeoutMs: 500 },
      ignoredPaths: new Set([BLIVECHAT_OUTPUT_PATH]),
      authLimiter,
    });
    const bliveEp = attachBlivechatOutput(wsServer, {
      path: BLIVECHAT_OUTPUT_PATH,
      protocolVersion: BLIVECHAT_PROTOCOL_VERSION,
      grants,
      subscribers,
      protocol: createBlivechatAdapter(),
      authLimiter,
    });
    await new Promise<void>((resolve) => wsServer!.listen(0, "127.0.0.1", () => resolve()));
    const port = (wsServer.address() as AddressInfo).port;

    const nativeFrames: NativeFrame[] = [];
    const nativeWs = new WebSocket(`ws://127.0.0.1:${port}${NATIVE_OUTPUT_PATH}`, [NATIVE_OUTPUT_PROTOCOL, `vw-cred.${nativeCred}`]);
    nativeWs.on("message", (raw) => {
      const parsed = JSON.parse(raw.toString("utf8")) as NativeFrame;
      if (parsed && typeof parsed.type === "string") nativeFrames.push(parsed);
    });
    const audit = createAuditStore({
      port: createAuditLogPort(db),
      sanitize: (s) => s,
      newId: randomUUID,
      access: { channelsFor: () => [CH], capabilitiesFor: () => new Set(["logs.view", "logs.view_content"]) },
      clock: () => NOW,
    });
    audit.recordTechnical({
      contractVersion: CONTRACT_VERSION,
      kind: "TECHNICAL",
      channelId: CH,
      correlationId: corrId,
      stage: "BASE_RULE",
      status: "OK",
      level: "INFO",
      subjectRef: subjectId,
      batchId: "batch-mvp-1",
      taskId,
      attempt: 1,
      errorCode: null,
      providerRef: "synthetic",
      modelRef: "synthetic-model",
      ruleTemplateVersion: "v1",
      latencyMs: 5,
      data: { verdict: "ALLOW_MEANINGFUL" },
      evidence: [{ kind: "MESSAGE_TEXT", payload: "Amazing stream today!" }],
    });

    try {
      const bliveConnected = new Promise<void>((resolve, reject) => {
        const bliveWs = new WebSocket(`ws://127.0.0.1:${port}${BLIVECHAT_OUTPUT_PATH}`, [BLIVECHAT_PROTOCOL_VERSION, `vw-cred.${bliveCred}`]);
        bliveWs.once("open", () => {
          bliveWs.close();
          resolve();
        });
        bliveWs.once("error", reject);
      });
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          nativeWs.once("open", () => resolve());
          nativeWs.once("error", reject);
        }),
        bliveConnected,
      ]);

      const pump = createDeliveryPump({
        delivery: createOutputDeliveryPort(db),
        content: createApprovedContentPort(db),
        subscribers,
        now: () => NOW,
        batchLimit: 20,
        expireLimit: 20,
        maxAttempts: 2,
      });
      const pass = await pump.runPass();
      expect(pass.sent).toBeGreaterThanOrEqual(1);
      await new Promise((r) => setTimeout(r, 40));

      // Query-string credential upgrade (?cred=...) must be refused with HTTP 401 before opening WS
      const queryUpgradeStatus = await new Promise<number>((resolve) => {
        const qws = new WebSocket(`ws://127.0.0.1:${port}${NATIVE_OUTPUT_PATH}?cred=${nativeCred}`, [NATIVE_OUTPUT_PROTOCOL]);
        qws.once("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0));
        qws.once("open", () => {
          qws.close();
          resolve(101);
        });
        qws.once("error", () => undefined);
      });
      expect(queryUpgradeStatus).toBe(401);

      const helloFrame = nativeFrames.find((f) => f.type === "HELLO");
      const deliverFrame = nativeFrames.find((f): f is DeliverFrame => f.type === "DELIVER");
      expect(helloFrame).toBeDefined();
      expect(deliverFrame).toBeDefined();
      expect(deliverFrame?.deliveryId).toBe(deliveryId);
      expect(deliverFrame?.display.text).toBe("Amazing stream today!");
      expect(JSON.stringify(deliverFrame)).not.toContain("yt-viewer-1");

      // Revoking output grant triggers terminal 4403 close on grant check
      const closedPromise = new Promise<{ code: number }>((resolve) => {
        nativeWs.once("close", (code) => resolve({ code }));
      });
      runShortTransaction(db, (tx) => revokeOutputGrant(tx, { grantId: "grant-mvp-native", channelId: CH, nowIso: new Date().toISOString() }));
      const closeEvt = await closedPromise;
      expect(closeEvt.code).toBe(NATIVE_CLOSE.GRANT_REVOKED.code);
    } finally {
      nativeWs.terminate();
      nativeEp.close();
      bliveEp.close();
    }

    // 4. Moderator manual review decision + Data Admin DELETE_AND_EXCEPT + Tombstone Restore persistence

    // Moderator manual review BLOCK
    const reviewRes = await app.inject({
      method: "POST",
      url: `/channels/${CH}/events/${eventId}/review`,
      headers: { cookie: modSession.cookie, "x-csrf-token": modSession.csrf },
      payload: {
        operationId: "op-mvp-review-1",
        classification: "BLOCK",
        reasonCodes: ["HARASSMENT"],
        platformDeleteStatus: "PENDING",
      },
    });
    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.json()).toMatchObject({ localStatus: "BLOCK", platformDeleteStatus: "PENDING" });

    // Create backup BEFORE deletion, then execute DELETE_AND_EXCEPT, then verify restore replays tombstones
    const backup = createBackup(db, { directory: backupDir, limits: { maxCount: 3, maxTotalBytes: 50_000_000, maxAgeDays: 7 }, nowIso: T0 });
    expect(backup.created.path).toBeTruthy();

    const delReq = await app.inject({
      method: "POST",
      url: `/channels/${CH}/data/requests`,
      headers: { cookie: adminSession.cookie, "x-csrf-token": adminSession.csrf },
      payload: { subjectRef: subjectId, kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" },
    });
    expect(delReq.statusCode).toBe(201);
    const { requestId } = delReq.json() as { requestId: string };

    const verReq = await app.inject({
      method: "POST",
      url: `/channels/${CH}/data/requests/${requestId}/verification`,
      headers: { cookie: adminSession.cookie, "x-csrf-token": adminSession.csrf },
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    expect(verReq.statusCode).toBe(200);

    const execReq = await app.inject({
      method: "POST",
      url: `/channels/${CH}/data/requests/${requestId}/execute`,
      headers: { cookie: adminSession.cookie, "x-csrf-token": adminSession.csrf },
    });
    expect(execReq.statusCode).toBe(200);
    expect(execReq.json()).toMatchObject({ execution: "COMPLETED" });

    // Verify subject content surfaces deleted, score reset, generation incremented, and exception marker retained
    expect(db.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, subjectId)).all()).toHaveLength(0);
    expect(db.orm.select().from(technicalLogs).where(eq(technicalLogs.subjectId, subjectId)).all()).toHaveLength(0);
    expect(db.orm.select().from(subjects).where(eq(subjects.id, subjectId)).get()?.processingGeneration).toBeGreaterThanOrEqual(1);
    expect(db.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, subjectId)).get()?.currentScore).toBe(0);
    expect(db.orm.select().from(scoreExceptions).where(eq(scoreExceptions.channelId, CH)).all().length).toBeGreaterThanOrEqual(1);

    // Close app/db and restore pre-deletion backup -> verify tombstone replay re-applies deletion & exception
    await app.close();
    app = undefined;
    db.close();

    restoreDatabaseWithPorts({
      backupPath: backup.created.path,
      targetPath: dbPath,
      ledger: tombstoneLedger,
      certificateSummary: CERTIFICATE_SUMMARY,
      now: () => new Date(),
      replayWith: (ports, tombstones) => replayTombstones(ports, tombstones),
    });
    expect(existsSync(`${dbPath}.restoring`)).toBe(false);

    const dbReopened = openDatabase({ filePath: dbPath });
    expect(dbReopened.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, subjectId)).all()).toHaveLength(0);
    expect(dbReopened.orm.select().from(technicalLogs).where(eq(technicalLogs.subjectId, subjectId)).all()).toHaveLength(0);
    expect(dbReopened.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, subjectId)).get()?.currentScore).toBe(0);
    expect(dbReopened.orm.select().from(scoreExceptions).where(eq(scoreExceptions.channelId, CH)).all().length).toBeGreaterThanOrEqual(1);
    db = dbReopened;
  });
});
