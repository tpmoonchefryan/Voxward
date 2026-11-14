import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const WT = "/home/ryanlan/Code/Voxward/.worktrees/verify-m9a";
const OUT_LOG = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave3b/m9a-accept-out/probes/logs/e80-m9a.json";

const reqFromServer = createRequire(`${WT}/apps/server/package.json`);
const reqFromWeb = createRequire(`${WT}/apps/web/package.json`);
const { eq } = await import(reqFromServer.resolve("drizzle-orm"));
const React = await import(reqFromWeb.resolve("react"));
const ReactDOMServer = await import(reqFromWeb.resolve("react-dom/server"));
(globalThis as Record<string, unknown>).React = React.default ?? React;

const { buildApp, restoreDatabaseWithLedger } = await import(`${WT}/apps/server/src/app.ts`);
const { createAccount } = await import(`${WT}/apps/server/src/auth/login.ts`);
const { grantMembership } = await import(`${WT}/apps/server/src/auth/members.ts`);
const { serverConfigSchema } = await import(`${WT}/apps/server/src/config/schema.ts`);
const { createAuditLogPort } = await import(`${WT}/apps/server/src/db/audit-log.ts`);
const { createBackup } = await import(`${WT}/apps/server/src/db/backup-store.ts`);
const { writeChannelSetting } = await import(`${WT}/apps/server/src/db/channel-settings-store.ts`);
const { openDatabase } = await import(`${WT}/apps/server/src/db/client.ts`);
const { createApprovedContentPort } = await import(`${WT}/apps/server/src/db/output-store.ts`);
const { SubjectStore } = await import(`${WT}/apps/server/src/db/repository.ts`);
const {
  accounts,
  changeLogs,
  channelMemberships,
  channels,
  scoreExceptions,
  sessions,
  subjects,
  technicalLogEvidence,
  technicalLogs,
} = await import(`${WT}/apps/server/src/db/schema/index.ts`);
const { createTombstoneLedger } = await import(`${WT}/apps/server/src/db/tombstone-ledger.ts`);
const { runShortTransaction } = await import(`${WT}/apps/server/src/db/transaction.ts`);
const { assertSandboxStartupSafe, SandboxGuardError } = await import(`${WT}/apps/server/src/demo/sandbox-guard.ts`);
const { createInvalidationBus } = await import(`${WT}/apps/server/src/modules/audit-store/index.js`);
const { buildRegistry } = await import(`${WT}/apps/server/src/modules/registry.js`);
const { migratedDatabase, removeDirectory, scratchDirectory } = await import(`${WT}/apps/server/test/db/helpers.ts`);
const { SandboxView } = await import(`${WT}/apps/web/src/pages/sandbox/SandboxPage.tsx`);

interface ProbeResult {
  readonly id: string;
  readonly passed: boolean;
  readonly details: Record<string, unknown>;
}

const results: ProbeResult[] = [];
const baseConfig = serverConfigSchema.parse({ adapters: "synthetic" });
const PASSWORD = "correct horse battery";

// ============================================================================
// P1: S020 Rework 1 — B12 (ViewerCache EXPIRED eviction on shortened retention) + N15c (periodic timer + main.ts check)
// ============================================================================
{
  const dir = scratchDirectory("m9a-b12-");
  const db = migratedDatabase(dir);
  const CH = "ch-b12-reverify";
  const T_NOW = Date.parse("2026-11-14T12:00:00.000Z");
  const isoOffsetDays = (d: number) => new Date(T_NOW + d * 86_400_000).toISOString();

  runShortTransaction(db, (tx) => {
    tx.insert(channels)
      .values({ id: CH, platform: "youtube", platformChannelRef: "yt-b12", displayName: "B12", createdAt: isoOffsetDays(-5), updatedAt: isoOffsetDays(-5) })
      .run();
  });

  const ownerId = (await createAccount(db, { loginName: "owner-b12", displayName: "Owner", password: PASSWORD, now: new Date(T_NOW) })).accountId;
  runShortTransaction(db, (tx) => {
    grantMembership(tx, { channelId: CH, accountId: ownerId, role: "CHANNEL_OWNER", logAccess: true, now: new Date(T_NOW) });
  });

  const audit = createAuditLogPort(db);
  const SECRET = "B12_REVERIFY_SHORTENED_SECRET_PAYLOAD";
  audit.insertTechnicalLog(
    {
      id: "log-b12-1",
      channelId: CH,
      correlationId: "corr-b12-1",
      batchId: null,
      taskId: null,
      attempt: 1,
      level: "INFO",
      data: { note: "test" },
      stage: "INGEST",
      status: "OK",
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      subjectId: null,
      createdAt: isoOffsetDays(-2), // created 2 days ago
      expiresAt: isoOffsetDays(5),  // initial expires_at +5 days in the future!
    },
    [{ id: "evid-b12-1", kind: "MESSAGE_TEXT", payload: SECRET, expiresAt: isoOffsetDays(5) }],
  );
  audit.insertChangeLog({
    id: "chg-b12-1",
    channelId: CH,
    occurredAt: isoOffsetDays(-2),
    actorKind: "SYSTEM",
    actorRef: "sys",
    changeKind: "CONFIG_CHANGED",
    summary: "old change log",
    outcome: "SUCCEEDED",
    correlationId: "corr-b12-1",
    expiresAt: isoOffsetDays(28),
  });

  const bus = createInvalidationBus();
  const events: unknown[] = [];
  bus.subscribe((ev) => events.push(ev));

  const app = buildApp({ modules: buildRegistry(baseConfig), logger: false, database: db, invalidation: bus });
  const loginRes = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName: "owner-b12", password: PASSWORD } });
  assert.equal(loginRes.statusCode, 200);
  const cookie = String(loginRes.headers["set-cookie"]).split(";")[0] ?? "";
  const csrf = (loginRes.json() as { csrfToken: string }).csrfToken;
  const headers = { cookie, "x-csrf-token": csrf };

  // 1) Warm ViewerCache
  const get1 = await app.inject({ method: "GET", url: `/internal/channels/${CH}/logs/technical/log-b12-1`, headers });
  assert.equal(get1.statusCode, 200);
  assert.ok(get1.body.includes(SECRET));

  // 2) Shorten retention-config to 1 day via real HTTP PUT /admin-settings
  const putSettings = await app.inject({
    method: "PUT",
    url: `/channels/${CH}/admin-settings`,
    headers,
    payload: {
      scoring: { initialScore: 0, minScore: -100, maxScore: 100, rewardDelta: 1, penaltyDelta: 5 },
      queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 10, taskDeadlineMs: 5000 },
      retention: { evidenceDays: 1, technicalLogDays: 1, changeLogDays: 1 },
    },
  });
  assert.equal(putSettings.statusCode, 200);

  // 3) Run sweepExpired via decorated app.retention
  const swept = app.retention!.sweepExpired({ nowIso: new Date(T_NOW).toISOString() });
  assert.equal(swept.complete, true);
  assert.equal(swept.removed.evidence, 1);
  assert.equal(swept.removed.technicalLogs, 1);
  assert.equal(swept.removed.changeLogs, 1);

  // 4) Second GET must immediately return 404 (evicted from ViewerCache via EXPIRED event!)
  const get2 = await app.inject({ method: "GET", url: `/internal/channels/${CH}/logs/technical/log-b12-1`, headers });
  assert.equal(get2.statusCode, 404);
  assert.equal(get2.body.includes(SECRET), false);

  await app.close();

  // 5) Verify periodic timer (N15c) runs automatically when retentionSweepIntervalMs is configured
  audit.insertTechnicalLog(
    {
      id: "log-b12-timer",
      channelId: CH,
      correlationId: "corr-b12-timer",
      batchId: null,
      taskId: null,
      attempt: 1,
      level: "INFO",
      data: null,
      stage: "INGEST",
      status: "OK",
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      subjectId: null,
      createdAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2020-01-02T00:00:00.000Z",
    },
    [],
  );
  const appTimer = buildApp({ modules: buildRegistry(baseConfig), logger: false, database: db, retentionSweepIntervalMs: 25 });
  await new Promise((r) => setTimeout(r, 90));
  const timerRemaining = db.orm.select().from(technicalLogs).where(eq(technicalLogs.id, "log-b12-timer")).all().length;
  await appTimer.close();
  db.close();
  removeDirectory(dir);

  const mainTs = fs.readFileSync(path.join(WT, "apps/server/src/main.ts"), "utf8");
  assert.equal(timerRemaining, 0);
  assert.ok(mainTs.includes("retentionSweepIntervalMs: config.databaseFile === \":memory:\" ? undefined : 60_000"));

  results.push({
    id: "P1_s020_b12_and_n15c_closed",
    passed: true,
    details: {
      firstGetStatus: get1.statusCode,
      secondGetStatusAfterSweep: get2.statusCode,
      invalidationEventsCount: events.length,
      periodicTimerRemainingRows: timerRemaining,
    },
  });
}

// ============================================================================
// P2: S020 Rework 1 — B13 (staged restore generation bump + sweepExpired + compact/VACUUM) + Q30
// ============================================================================
{
  const dbDir = scratchDirectory("m9a-b13-db-");
  const workDir = scratchDirectory("m9a-b13-work-");
  const ledger = createTombstoneLedger(path.join(workDir, "tombstones"));
  const backupsDir = path.join(workDir, "backups");
  let db = migratedDatabase(dbDir);
  const targetPath = db.filePath;
  const CH = "ch-b13-reverify";
  const T0 = Date.parse("2026-11-10T00:00:00.000Z");
  const dayIso = (d: number) => new Date(T0 + d * 86_400_000).toISOString();

  const NAT_MARKER = "B13_NATURALLY_EXPIRED_SWEPT_BYTES_MARKER_991";
  const CFG_MARKER = "B13_SHORTENED_CFG_RESURRECTED_HTTP_MARKER_992";
  const DEL_MARKER = "B13_EXPLICITLY_DELETED_SUBJECT_MARKER_993";

  runShortTransaction(db, (tx) => {
    tx.insert(channels)
      .values({ id: CH, platform: "youtube", platformChannelRef: "yt-b13", displayName: "B13", createdAt: dayIso(0), updatedAt: dayIso(0) })
      .run();
    SubjectStore.create(tx, { id: "subj-del", channelId: CH, platformSubjectKey: "yt-del-1", createdAt: dayIso(0) });
    SubjectStore.create(tx, { id: "subj-twin", channelId: CH, platformSubjectKey: "yt-twin-1", createdAt: dayIso(0) });
  });
  writeChannelSetting(db, CH, "retention-config", { evidenceDays: 1, technicalLogDays: 1, changeLogDays: 1 });

  const ownerId = (await createAccount(db, { loginName: "owner-b13", displayName: "Owner", password: PASSWORD, now: new Date(T0) })).accountId;
  runShortTransaction(db, (tx) => {
    grantMembership(tx, { channelId: CH, accountId: ownerId, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true, now: new Date(T0) });
  });

  const audit = createAuditLogPort(db);
  // 1) Subject to be explicitly deleted after backup
  audit.insertTechnicalLog(
    {
      id: "log-del-1",
      channelId: CH,
      correlationId: "corr-del-1",
      batchId: null,
      taskId: null,
      attempt: 1,
      level: "INFO",
      data: null,
      stage: "INGEST",
      status: "OK",
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      subjectId: "subj-del",
      createdAt: dayIso(0),
      expiresAt: dayIso(7),
    },
    [{ id: "ev-del-1", kind: "MESSAGE_TEXT", payload: DEL_MARKER, expiresAt: dayIso(7) }],
  );
  // 2) Naturally expired by day 4 (expiresAt = day 2)
  audit.insertTechnicalLog(
    {
      id: "log-b13-nat",
      channelId: CH,
      correlationId: "corr-b13-nat",
      batchId: null,
      taskId: null,
      attempt: 1,
      level: "INFO",
      data: null,
      stage: "INGEST",
      status: "OK",
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      subjectId: "subj-twin",
      createdAt: dayIso(0),
      expiresAt: dayIso(2),
    },
    [{ id: "ev-b13-nat", kind: "MESSAGE_TEXT", payload: NAT_MARKER, expiresAt: dayIso(2) }],
  );
  // 3) Shortened-retention expired by day 4 (createdAt = day 0, retention = 1d, but initial expiresAt = day 10!)
  audit.insertTechnicalLog(
    {
      id: "log-b13-cfg",
      channelId: CH,
      correlationId: "corr-b13-cfg",
      batchId: null,
      taskId: null,
      attempt: 1,
      level: "INFO",
      data: null,
      stage: "INGEST",
      status: "OK",
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      subjectId: "subj-twin",
      createdAt: dayIso(0),
      expiresAt: dayIso(10),
    },
    [{ id: "ev-b13-cfg", kind: "MESSAGE_TEXT", payload: CFG_MARKER, expiresAt: dayIso(10) }],
  );
  // 4) Unexpired twin log created at day 3.5 (within 1-day retention at day 4)
  audit.insertTechnicalLog(
    {
      id: "log-b13-fresh",
      channelId: CH,
      correlationId: "corr-b13-fresh",
      batchId: null,
      taskId: null,
      attempt: 1,
      level: "INFO",
      data: null,
      stage: "INGEST",
      status: "OK",
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      subjectId: "subj-twin",
      createdAt: dayIso(3.5),
      expiresAt: dayIso(10),
    },
    [{ id: "ev-b13-fresh", kind: "MESSAGE_TEXT", payload: "TWIN_FRESH_ALIVE", expiresAt: dayIso(10) }],
  );

  // Take backup at day 3.6 (before explicit deletion and before day 4 sweep)
  const { created: backup } = createBackup(db, {
    directory: backupsDir,
    limits: { maxCount: 3, maxTotalBytes: 500_000_000, maxAgeDays: 30 },
    nowIso: dayIso(3.6),
  });

  // Execute explicit DELETE_AND_EXCEPT on subj-del over HTTP (bumps generation 0 -> 1, writes tombstones)
  const app1 = buildApp({ modules: buildRegistry(baseConfig), logger: false, database: db, tombstoneLedger: ledger });
  const login1 = await app1.inject({ method: "POST", url: "/auth/login", payload: { loginName: "owner-b13", password: PASSWORD } });
  const cookie1 = String(login1.headers["set-cookie"]).split(";")[0] ?? "";
  const csrf1 = (login1.json() as { csrfToken: string }).csrfToken;
  const h1 = { cookie: cookie1, "x-csrf-token": csrf1 };

  const reqCreate = await app1.inject({
    method: "POST",
    url: `/channels/${CH}/data/requests`,
    headers: h1,
    payload: { subjectRef: "subj-del", kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" },
  });
  const reqId = (reqCreate.json() as { requestId: string }).requestId;
  await app1.inject({
    method: "POST",
    url: `/channels/${CH}/data/requests/${reqId}/verification`,
    headers: h1,
    payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
  });
  const execRes = await app1.inject({ method: "POST", url: `/channels/${CH}/data/requests/${reqId}/execute`, headers: h1 });
  assert.equal(execRes.statusCode, 200);

  const genBeforeRestore = db.orm.select().from(subjects).where(eq(subjects.id, "subj-del")).get()!.processingGeneration;
  assert.equal(genBeforeRestore, 1);

  await app1.close();
  db.close();

  // Restore old backup at day 4!
  restoreDatabaseWithLedger({
    backupPath: backup.path,
    targetPath,
    ledger,
    now: () => new Date(dayIso(4)),
  });

  db = openDatabase({ filePath: targetPath });
  const secureDelete = db.sqlite.pragma("secure_delete", { simple: true });
  const genAfterRestore = db.orm.select().from(subjects).where(eq(subjects.id, "subj-del")).get()!.processingGeneration;
  const excCount = db.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, "subj-del")).all().length;
  const natRows = db.orm.select().from(technicalLogs).where(eq(technicalLogs.id, "log-b13-nat")).all().length;
  const cfgRows = db.orm.select().from(technicalLogs).where(eq(technicalLogs.id, "log-b13-cfg")).all().length;
  const freshRows = db.orm.select().from(technicalLogs).where(eq(technicalLogs.id, "log-b13-fresh")).all().length;
  const rawBytes = fs.readFileSync(targetPath).toString("latin1");

  const app2 = buildApp({ modules: buildRegistry(baseConfig), logger: false, database: db, tombstoneLedger: ledger });
  const login2 = await app2.inject({ method: "POST", url: "/auth/login", payload: { loginName: "owner-b13", password: PASSWORD } });
  const cookie2 = String(login2.headers["set-cookie"]).split(";")[0] ?? "";
  const getCfgAfterRestore = await app2.inject({
    method: "GET",
    url: `/internal/channels/${CH}/logs/technical/log-b13-cfg`,
    headers: { cookie: cookie2 },
  });

  await app2.close();
  db.close();
  removeDirectory(dbDir);
  removeDirectory(workDir);

  assert.equal(secureDelete, 1);
  assert.equal(genAfterRestore, 1);
  assert.equal(excCount, 1);
  assert.equal(natRows, 0);
  assert.equal(cfgRows, 0);
  assert.equal(freshRows, 1);
  assert.equal(rawBytes.includes(NAT_MARKER), false);
  assert.equal(rawBytes.includes(CFG_MARKER), false);
  assert.equal(rawBytes.includes(DEL_MARKER), false);
  assert.equal(getCfgAfterRestore.statusCode, 404);

  results.push({
    id: "P2_s020_b13_and_q30_closed",
    passed: true,
    details: {
      secureDelete,
      genBeforeRestore,
      genAfterRestore,
      reinstatedExceptionCount: excCount,
      natRows,
      cfgRows,
      freshRows,
      httpStatusForShortenedCfgLog: getCfgAfterRestore.statusCode,
      bytesClean: true,
    },
  });
}

// ============================================================================
// P3: S025 SUB-046 Scenarios + Startup Guards + Production Route Isolation
// ============================================================================
{
  // 1) All 6 forbidden env vars & prod paths fail-closed
  for (const key of [
    "GOOGLE_CLIENT_SECRET",
    "YOUTUBE_CLIENT_SECRET",
    "OAUTH_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN",
    "YOUTUBE_ACCESS_TOKEN",
    "GOOGLE_REFRESH_TOKEN",
  ]) {
    assert.throws(() => assertSandboxStartupSafe({ enabled: true, env: { [key]: "secret" } }, ":memory:"), SandboxGuardError);
  }
  assert.throws(() => assertSandboxStartupSafe({ enabled: true, env: {} }, "data/voxward.sqlite3"), SandboxGuardError);
  assert.throws(() => assertSandboxStartupSafe({ enabled: true, env: {} }, "data/prod-sandbox.sqlite3"), SandboxGuardError);

  // 2) Sandbox scenarios + deterministic reset + production route isolation
  const sbDir = scratchDirectory("m9a-sandbox-");
  const sbDbPath = path.join(sbDir, "voxward-sandbox.sqlite3");
  const sbDb = openDatabase({ filePath: sbDbPath });
  const { runMigrations } = await import(`${WT}/apps/server/src/db/migrate.ts`);
  runMigrations(sbDb);

  const defaultApp = buildApp({ modules: buildRegistry(baseConfig), logger: false, database: sbDb });
  const defaultSandboxGet = await defaultApp.inject({ method: "GET", url: "/sandbox-api/state" });
  assert.equal(defaultSandboxGet.statusCode, 404);
  await defaultApp.close();

  const sbApp = buildApp({
    modules: buildRegistry(baseConfig),
    logger: false,
    database: sbDb,
    sandbox: { enabled: true, env: {} },
  });

  // Production role minting forbidden, zero rows in auth tables
  for (const forbiddenRole of ["CHANNEL_OWNER", "DATA_ADMIN", "MODERATOR", "DEPLOYMENT_ADMIN"]) {
    const r = await sbApp.inject({ method: "POST", url: "/sandbox-api/session", payload: { role: forbiddenRole } });
    assert.equal(r.statusCode, 403);
  }
  assert.equal(sbDb.sqlite.prepare("SELECT count(*) FROM auth_accounts").pluck().get(), 0);
  assert.equal(sbDb.sqlite.prepare("SELECT count(*) FROM auth_sessions").pluck().get(), 0);
  assert.equal(sbDb.sqlite.prepare("SELECT count(*) FROM channel_members").pluck().get(), 0);

  // Run all scenarios + post-exception manual review commit -> score stays 0
  await sbApp.inject({ method: "POST", url: "/sandbox-api/scenarios", headers: { "x-demo-role": "DEMO_STREAMER" }, payload: { scenario: "normal-scoring" } });
  await sbApp.inject({ method: "POST", url: "/sandbox-api/scenarios", headers: { "x-demo-role": "DEMO_STREAMER" }, payload: { scenario: "superchat-translation" } });
  await sbApp.inject({ method: "POST", url: "/sandbox-api/privacy", headers: { "x-demo-role": "DEMO_PRIVACY_AUDITOR" }, payload: { mode: "DELETE_AND_EXCEPT", subjectKey: "demo-viewer-alice" } });
  await sbApp.inject({ method: "POST", url: "/sandbox-api/events", headers: { "x-demo-role": "DEMO_STREAMER" }, payload: { subjectKey: "demo-viewer-alice", text: "Post-exception message" } });
  const stateBeforeDecide = ((await sbApp.inject({ method: "GET", url: "/sandbox-api/state", headers: { "x-demo-role": "DEMO_STREAMER" } })).json() as { snapshot: { reviewQueue: Array<{ taskId: string }> } }).snapshot;
  assert.equal(stateBeforeDecide.reviewQueue.length, 1);
  const decideExcepted = await sbApp.inject({
    method: "POST",
    url: `/sandbox-api/review/${stateBeforeDecide.reviewQueue[0]!.taskId}/decide`,
    headers: { "x-demo-role": "DEMO_MODERATOR" },
    payload: { classification: "ALLOW" },
  });
  assert.equal(decideExcepted.statusCode, 200);
  const aliceAfterDecide = ((decideExcepted.json() as { snapshot: { subjects: Array<{ subjectKey: string; currentScore: number; hasException: boolean }> } }).snapshot.subjects).find((s) => s.subjectKey === "demo-viewer-alice")!;
  assert.equal(aliceAfterDecide.currentScore, 0);
  assert.equal(aliceAfterDecide.hasException, true);

  // Check plain-text TRANSLATION compatibility with output-store
  const approvedPort = createApprovedContentPort(sbDb);
  const stateNow = ((await sbApp.inject({ method: "GET", url: "/sandbox-api/state" })).json() as { snapshot: { approvedStage: Array<{ correlationId: string; translation: string | null }> } }).snapshot;
  const scItem = stateNow.approvedStage.find((i) => i.translation !== null)!;
  const approvedRead = approvedPort.readApproved({ channelId: "sandbox-ch-01", correlationId: scItem.correlationId, nowIso: new Date().toISOString() });
  assert.equal(approvedRead?.translation, "Thanks for the awesome stream! Supporting you always!");

  await sbApp.close();
  sbDb.close();
  removeDirectory(sbDir);

  results.push({
    id: "P3_s025_sub046_scenarios_and_prod_isolation_verified",
    passed: true,
    details: {
      defaultAppSandboxStatus: defaultSandboxGet.statusCode,
      aliceScoreAfterExceptedManualAllow: aliceAfterDecide.currentScore,
      scPlainTextTranslation: approvedRead?.translation,
    },
  });
}

// ============================================================================
// P4: S025 Blockers B15 & B16 Empirical Reproduction
//   B15: deploy/sandbox/start-sandbox.mjs exits immediately without starting HTTP server; main.ts ignores VOXWARD_SANDBOX_ENABLED; vite.config.ts lacks /sandbox-api proxy
//   B16: (a) DEMO_MODERATOR / DEMO_STREAMER lack "privacy.delete" (403 on /sandbox-api/privacy) yet execute privacy-delete / privacy-delete-and-except with 200 via /sandbox-api/scenarios (and SandboxPage calls /sandbox-api/scenarios)!
//        (b) GET /sandbox-api/state & SandboxView leak raw blocked toxic originalText, reviewQueue originalText, and logs to DEMO_STAGE_VIEWER!
// ============================================================================
{
  // B15 check
  const startProc = spawnSync(process.execPath, [path.join(WT, "deploy/sandbox/start-sandbox.mjs")], {
    env: {
      ...process.env,
      VOXWARD_SANDBOX_ENABLED: "true",
      VOXWARD_SANDBOX_DB: ":memory:",
      VOXWARD_SANDBOX_PORT: "3199",
    },
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(startProc.status, 0);
  const startJson = JSON.parse(startProc.stdout.trim()) as { note?: string };
  let port3199Refused = false;
  try {
    await fetch("http://127.0.0.1:3199/sandbox-api/state");
  } catch {
    port3199Refused = true;
  }
  const mainTs = fs.readFileSync(path.join(WT, "apps/server/src/main.ts"), "utf8");
  const viteTs = fs.readFileSync(path.join(WT, "apps/web/vite.config.ts"), "utf8");
  const mainMountsSandbox = mainTs.includes("sandbox");
  const viteProxiesSandboxApi = viteTs.includes("/sandbox-api");

  assert.equal(port3199Refused, true);
  assert.equal(mainMountsSandbox, false);
  assert.equal(viteProxiesSandboxApi, false);

  // B16 check
  const sbDir = scratchDirectory("m9a-b16-");
  const sbDb = openDatabase({ filePath: path.join(sbDir, "voxward-sandbox.sqlite3") });
  const { runMigrations } = await import(`${WT}/apps/server/src/db/migrate.ts`);
  runMigrations(sbDb);
  const sbApp = buildApp({
    modules: buildRegistry(baseConfig),
    logger: false,
    database: sbDb,
    sandbox: { enabled: true, env: {} },
  });

  // (a) DEMO_MODERATOR gets 403 on /sandbox-api/privacy, yet 200 on /sandbox-api/scenarios { scenario: "privacy-delete-and-except" }!
  const modDirectPrivacy = await sbApp.inject({
    method: "POST",
    url: "/sandbox-api/privacy",
    headers: { "x-demo-role": "DEMO_MODERATOR" },
    payload: { mode: "DELETE_AND_EXCEPT", subjectKey: "demo-viewer-alice" },
  });
  const modBypassViaScenarios = await sbApp.inject({
    method: "POST",
    url: "/sandbox-api/scenarios",
    headers: { "x-demo-role": "DEMO_MODERATOR" },
    payload: { scenario: "privacy-delete-and-except", subjectKey: "demo-viewer-alice" },
  });
  assert.equal(modDirectPrivacy.statusCode, 403);
  assert.equal(modBypassViaScenarios.statusCode, 200);

  // (b) Trigger spam-toxicity-block & manual-review, then inspect DEMO_STAGE_VIEWER state & rendered HTML
  await sbApp.inject({
    method: "POST",
    url: "/sandbox-api/scenarios",
    headers: { "x-demo-role": "DEMO_STREAMER" },
    payload: { scenario: "spam-toxicity-block" },
  });
  await sbApp.inject({
    method: "POST",
    url: "/sandbox-api/scenarios",
    headers: { "x-demo-role": "DEMO_STREAMER" },
    payload: { scenario: "manual-review" },
  });

  const stageStateRes = await sbApp.inject({
    method: "GET",
    url: "/sandbox-api/state",
    headers: { "x-demo-role": "DEMO_STAGE_VIEWER" },
  });
  assert.equal(stageStateRes.statusCode, 200);
  const stageBody = stageStateRes.json() as {
    role: "DEMO_STAGE_VIEWER";
    capabilities: string[];
    snapshot: Parameters<typeof SandboxView>[0]["snapshot"];
  };
  const leakedBlockedText = stageBody.snapshot?.blockedItems[0]?.originalText ?? null;
  const leakedQueueText = stageBody.snapshot?.reviewQueue[0]?.originalText ?? null;
  const leakedChangeLogsCount = stageBody.snapshot?.changeLogs.length ?? 0;

  const stageHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SandboxView, {
      role: stageBody.role,
      capabilities: stageBody.capabilities,
      snapshot: stageBody.snapshot,
      loading: false,
      error: null,
      onSelectRole: () => {},
      onTriggerScenario: () => {},
      onDecideReview: () => {},
      onReset: () => {},
    }),
  );

  await sbApp.close();
  sbDb.close();
  removeDirectory(sbDir);

  assert.equal(leakedBlockedText, "Click free crypto spam-link-xyz toxic-abuse now!");
  assert.equal(leakedQueueText, "Wait check this link maybe for fanart?");
  assert.equal(stageHtml.includes("Click free crypto spam-link-xyz toxic-abuse now!"), true);

  results.push({
    id: "P4_s025_b15_and_b16_reproduced",
    passed: true,
    details: {
      b15StartSandboxNote: startJson.note,
      b15Port3199RefusedAfterExit: port3199Refused,
      b15MainMountsSandbox: mainMountsSandbox,
      b15ViteProxiesSandboxApi: viteProxiesSandboxApi,
      b16ModeratorPrivacyEndpointStatus: modDirectPrivacy.statusCode,
      b16ModeratorScenariosDeleteBypassStatus: modBypassViaScenarios.statusCode,
      b16StageViewerCapabilities: stageBody.capabilities,
      b16StageViewerLeakedBlockedOriginalText: leakedBlockedText,
      b16StageViewerLeakedReviewOriginalText: leakedQueueText,
      b16StageViewerLeakedChangeLogsCount: leakedChangeLogsCount,
      b16StageViewerHtmlExposesToxicBlockedBody: stageHtml.includes("Click free crypto spam-link-xyz toxic-abuse now!"),
    },
  });
}

const summary = {
  candidate: "6a6af8a",
  total: results.length,
  allProbesCompleted: results.every((r) => r.passed),
  results,
};

fs.writeFileSync(OUT_LOG, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
