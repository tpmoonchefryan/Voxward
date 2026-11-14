import { spawn, spawnSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = process.env.REPO_ROOT;
const OUT_FILE = process.env.PROBE_OUT_FILE;
if (!REPO_ROOT || !OUT_FILE) {
  throw new Error("REPO_ROOT and PROBE_OUT_FILE are required");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function getFreePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      srv.close((err) => (err ? rejectPort(err) : resolvePort(port)));
    });
    srv.on("error", rejectPort);
  });
}

function unpaddedBase64(bytes: Buffer): string {
  return bytes.toString("base64").replace(/=+$/, "");
}

function cookiePair(headers: Record<string, unknown>, cookieName: string): { pair: string; raw: string } {
  const sc = headers["set-cookie"];
  const raw = Array.isArray(sc) ? String(sc[0]) : String(sc ?? "");
  const m = new RegExp(`${cookieName}=([^;]+)`).exec(raw);
  assert(m !== null && m[1] !== undefined, `missing ${cookieName} in set-cookie`);
  return { pair: `${cookieName}=${m[1]}`, raw };
}

async function main() {
  const scratch = mkdtempSync(join(tmpdir(), "vw-m10-probe-"));
  try {
    // Dynamic imports from candidate worktree
    const { buildApp } = await import(resolve(REPO_ROOT, "apps/server/src/app.ts"));
    const { buildRegistry } = await import(resolve(REPO_ROOT, "apps/server/src/modules/registry.ts"));
    const { loadConfig } = await import(resolve(REPO_ROOT, "apps/server/src/config/load.ts"));
    const { openDatabase } = await import(resolve(REPO_ROOT, "apps/server/src/db/client.ts"));
    const { runMigrations } = await import(resolve(REPO_ROOT, "apps/server/src/db/migrate.ts"));
    const { createBackup } = await import(resolve(REPO_ROOT, "apps/server/src/db/backup-store.ts"));
    const { restoreDatabaseWithPorts } = await import(resolve(REPO_ROOT, "apps/server/src/db/restore-support.ts"));
    const { createTombstoneLedger } = await import(resolve(REPO_ROOT, "apps/server/src/db/tombstone-ledger.ts"));
    const { createAccount, hashPassword, login, MAX_SCRYPT_CONCURRENCY, verifyPassword } = await import(
      resolve(REPO_ROOT, "apps/server/src/auth/login.ts")
    );
    const { authorizeSocketHandshake, SESSION_COOKIE } = await import(
      resolve(REPO_ROOT, "apps/server/src/auth/guard.ts")
    );
    const { CERTIFICATE_SUMMARY } = await import(resolve(REPO_ROOT, "apps/server/src/modules/audit-store/index.ts"));
    const { REQUEST_SOURCES, VERIFICATION_METHODS } = await import(
      resolve(REPO_ROOT, "packages/contracts/src/index.ts")
    );
    const { replayTombstones } = await import(
      resolve(REPO_ROOT, "apps/server/src/modules/data-lifecycle-service/index.ts")
    );
    const { createKiroCliInferenceProvider } = await import(
      resolve(REPO_ROOT, "apps/server/src/adapters/kiro-cli/provider.ts")
    );
    const { describeKiroCli } = await import(
      resolve(REPO_ROOT, "apps/server/src/adapters/kiro-cli/capabilities.ts")
    );
    const { checkRunnable, checkSettings, DEFAULT_MODEL_SETTINGS } = await import(
      resolve(REPO_ROOT, "apps/server/src/modules/inference-provider/index.ts")
    );
    const { createYouTubeAuthRoutes, createYouTubeCredentialStore } = await import(
      resolve(REPO_ROOT, "apps/server/src/modules/platform-source/index.ts")
    );
    const { FAKE_CLI, fakeEnvironment, makeFakeExecutable, moderationValidator } = await import(
      resolve(REPO_ROOT, "apps/server/test/adapters/kiro-cli/helpers.ts")
    );

    // =========================================================================
    // P1: deploy-check.mjs (positive & negative) + real dist/main.js lifecycle
    // =========================================================================
    const dcPos = spawnSync(
      process.execPath,
      [resolve(REPO_ROOT, "scripts/deploy-check.mjs"), "--env-file", "deploy/server/server.env.example", "--json"],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } },
    );
    assert(dcPos.status === 0, `deploy-check positive exited ${dcPos.status}: ${dcPos.stderr}`);
    const dcPosJson = JSON.parse(dcPos.stdout) as { ok: boolean; checks: Array<{ name: string; ok: boolean }> };
    assert(dcPosJson.ok === true && dcPosJson.checks.length === 19, "deploy-check positive 19/19 checks");

    const dcNegSandbox = spawnSync(
      process.execPath,
      [resolve(REPO_ROOT, "scripts/deploy-check.mjs"), "--json"],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "", VOXWARD_SANDBOX_ENABLED: "true" } },
    );
    assert(dcNegSandbox.status === 1, "deploy-check must reject VOXWARD_SANDBOX_ENABLED=true");

    const dcNegTimeout = spawnSync(
      process.execPath,
      [resolve(REPO_ROOT, "scripts/deploy-check.mjs"), "--json"],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "", VOXWARD_KIRO_TIMEOUT_MS: "300001" } },
    );
    assert(dcNegTimeout.status === 1, "deploy-check must reject VOXWARD_KIRO_TIMEOUT_MS=300001");

    const badEnvFile = join(scratch, "bad-server.env");
    writeFileSync(badEnvFile, "VOXWARD_ADAPTERS=live-unverified\nVOXWARD_PORT=70000\n", "utf8");
    const dcNegFile = spawnSync(
      process.execPath,
      [resolve(REPO_ROOT, "scripts/deploy-check.mjs"), "--env-file", badEnvFile, "--json"],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } },
    );
    assert(dcNegFile.status === 1, "deploy-check must reject invalid env-file");

    // Production bundle fail-closed checks
    const mainJs = resolve(REPO_ROOT, "apps/server/dist/main.js");
    const mainSandboxFail = spawnSync(process.execPath, [mainJs], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", VOXWARD_SANDBOX_ENABLED: "1", VOXWARD_ADAPTERS: "synthetic" },
    });
    assert(
      mainSandboxFail.status === 1 && mainSandboxFail.stderr.includes("PRODUCTION_STARTUP_FAILED"),
      "dist/main.js must fail closed on VOXWARD_SANDBOX_ENABLED=1",
    );

    const secretTimeoutToken = "987654";
    const mainTimeoutFail = spawnSync(process.execPath, [mainJs], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", VOXWARD_ADAPTERS: "synthetic", VOXWARD_KIRO_TIMEOUT_MS: secretTimeoutToken },
    });
    assert(
      mainTimeoutFail.status === 1 &&
        mainTimeoutFail.stderr.includes("CONFIG_INVALID") &&
        !mainTimeoutFail.stderr.includes(secretTimeoutToken),
      "dist/main.js must fail closed on out-of-range VOXWARD_KIRO_TIMEOUT_MS without echoing value",
    );

    // Spawn real dist/main.js on ephemeral port + persistent volume, hit /healthz & /sandbox-api/state, then SIGTERM
    const volDir = join(scratch, "volume");
    mkdirSync(volDir, { recursive: true });
    const liveDbPath = join(volDir, "voxward.sqlite3");
    const port = await getFreePort();
    const child = spawn(process.execPath, [mainJs], {
      cwd: REPO_ROOT,
      env: {
        PATH: process.env.PATH ?? "",
        VOXWARD_HOST: "127.0.0.1",
        VOXWARD_PORT: String(port),
        VOXWARD_ADAPTERS: "synthetic",
        VOXWARD_DATABASE_FILE: liveDbPath,
        VOXWARD_KIRO_TIMEOUT_MS: "120000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let healthStatus = 0;
    let healthBody = "";
    let sandboxProbeStatus = 0;
    try {
      const deadline = Date.now() + 8_000;
      while (Date.now() < deadline) {
        try {
          const r = await fetch(`http://127.0.0.1:${port}/healthz`);
          healthStatus = r.status;
          healthBody = await r.text();
          if (healthStatus === 200) break;
        } catch {
          await new Promise((r) => setTimeout(r, 80));
        }
      }
      assert(healthStatus === 200 && healthBody.includes('"ok"'), `healthz failed: ${healthStatus} ${healthBody}`);
      const sbRes = await fetch(`http://127.0.0.1:${port}/sandbox-api/state`);
      sandboxProbeStatus = sbRes.status;
      assert(sandboxProbeStatus === 404, `production main.js must not expose /sandbox-api/state (got ${sandboxProbeStatus})`);
    } finally {
      child.kill("SIGTERM");
    }
    const exitCode: number | null = await new Promise((res) => {
      child.once("exit", (code) => res(code));
    });
    assert(exitCode === 0, `dist/main.js SIGTERM exit code expected 0, got ${exitCode}`);

    // =========================================================================
    // P2: Q17 bootstrap-owner CLI + Q26 scrypt + RBAC/CSRF/WS + restart + .restoring
    // =========================================================================
    const bootstrapCli = resolve(REPO_ROOT, "scripts/bootstrap-owner.mjs");
    const ownerPass = "Owner-Strong-Passphrase-2026!";
    const modPass = "Mod-Strong-Passphrase-2026!";

    const bsMissingEnv = spawnSync(
      process.execPath,
      [bootstrapCli, "--db", liveDbPath, "--channel-id", "room-prod", "--login-name", "prod-owner"],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } },
    );
    assert(bsMissingEnv.status === 1 && bsMissingEnv.stderr.includes("BOOTSTRAP_FAILED"), "missing password env fails");

    const bsWeak = spawnSync(
      process.execPath,
      [bootstrapCli, "--db", liveDbPath, "--channel-id", "room-prod", "--login-name", "prod-owner"],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "", VOXWARD_BOOTSTRAP_PASSWORD: "short" } },
    );
    assert(
      bsWeak.status === 1 && bsWeak.stderr.includes("WEAK_PASSWORD"),
      `weak password must fail with WEAK_PASSWORD, got: ${bsWeak.stderr}`,
    );

    const bsOk = spawnSync(
      process.execPath,
      [
        bootstrapCli,
        "--db",
        liveDbPath,
        "--channel-id",
        "room-prod",
        "--login-name",
        "prod-owner",
        "--display-name",
        "Prod Owner",
      ],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "", VOXWARD_BOOTSTRAP_PASSWORD: ownerPass } },
    );
    assert(bsOk.status === 0, `first bootstrap failed: ${bsOk.stderr}`);
    assert(!bsOk.stdout.includes(ownerPass) && !bsOk.stderr.includes(ownerPass), "bootstrap must not echo password");
    const bsParsed = JSON.parse(bsOk.stdout) as { ok: boolean; accountId: string; channelId: string };
    assert(bsParsed.ok === true && bsParsed.channelId === "room-prod", "bootstrap output mismatch");

    const bsRepeat = spawnSync(
      process.execPath,
      [bootstrapCli, "--db", liveDbPath, "--channel-id", "room-2", "--login-name", "owner-two"],
      { cwd: REPO_ROOT, encoding: "utf8", env: { PATH: process.env.PATH ?? "", VOXWARD_BOOTSTRAP_PASSWORD: ownerPass } },
    );
    assert(
      bsRepeat.status === 1 && bsRepeat.stderr.includes("OWNER_ALREADY_BOOTSTRAPPED"),
      `repeat bootstrap must fail closed with OWNER_ALREADY_BOOTSTRAPPED, got: ${bsRepeat.stderr}`,
    );

    // Q26 hash bounds & concurrency cap
    assert(MAX_SCRYPT_CONCURRENCY === 4, "MAX_SCRYPT_CONCURRENCY must be 4");
    const salt = randomBytes(16);
    const key14 = scryptSync(ownerPass, salt, 64, { N: 2 ** 14, r: 8, p: 1 });
    const validLegacy14 = `$scrypt$ln=14,r=8,p=1$${unpaddedBase64(salt)}$${unpaddedBase64(key14)}`;
    const weakLn13 = `$scrypt$ln=13,r=8,p=1$${unpaddedBase64(salt)}$${unpaddedBase64(key14)}`;
    const weakR4 = `$scrypt$ln=14,r=4,p=1$${unpaddedBase64(salt)}$${unpaddedBase64(key14)}`;
    const overMemLn22 = `$scrypt$ln=22,r=8,p=1$${unpaddedBase64(salt)}$${unpaddedBase64(key14)}`;
    assert((await verifyPassword(ownerPass, validLegacy14)) === true, "valid ln=14 hash still verifies");
    assert((await verifyPassword(ownerPass, weakLn13)) === false, "ln=13 rejected");
    assert((await verifyPassword(ownerPass, weakR4)) === false, "r=4 rejected");
    assert((await verifyPassword(ownerPass, overMemLn22)) === false, "ln=22 (>256 MiB) rejected");
    assert((await verifyPassword(ownerPass, "$argon2id$v=19$m=65536,t=3,p=4$abc$def")) === false, "non-scrypt rejected");
    const freshHash = await hashPassword(ownerPass);
    assert(freshHash.startsWith("$scrypt$ln=17,r=8,p=1$"), "new hash uses OWASP N=2^17,r=8,p=1");

    // Open liveDbPath, verify pragmas, run 8 concurrent logins + multi-moderator RBAC/CSRF/WS + backup + post-backup tombstone + restore
    const db1 = openDatabase({ filePath: liveDbPath });
    runMigrations(db1);
    const journalMode = db1.sqlite.pragma("journal_mode", { simple: true });
    const secureDelete = db1.sqlite.pragma("secure_delete", { simple: true });
    const foreignKeys = db1.sqlite.pragma("foreign_keys", { simple: true });
    assert(journalMode === "wal" && secureDelete === 1 && foreignKeys === 1, "SQLite WAL/secure_delete/FK pragmas");

    const now = new Date("2026-11-10T10:00:00.000Z");
    const concurrentLogins = await Promise.all([
      ...Array.from({ length: 5 }, () => login(db1, { loginName: "prod-owner", password: ownerPass, now })),
      ...Array.from({ length: 3 }, () => login(db1, { loginName: "nonexistent-user", password: "wrong", now })),
    ]);
    assert(
      concurrentLogins.slice(0, 5).every((r) => r.ok) && concurrentLogins.slice(5).every((r) => !r.ok),
      "8 concurrent logins settled accurately under scrypt semaphore",
    );

    const modNoLogs = await createAccount(db1, {
      loginName: "mod-nolog",
      displayName: "Mod NoLog",
      password: modPass,
      now,
    });
    const modLogs = await createAccount(db1, {
      loginName: "mod-log",
      displayName: "Mod Log",
      password: modPass,
      now,
    });
    const dataAdmin = await createAccount(db1, {
      loginName: "data-admin",
      displayName: "Data Admin",
      password: modPass,
      now,
    });

    const cfgRes = loadConfig({
      env: { VOXWARD_ADAPTERS: "synthetic", VOXWARD_DATABASE_FILE: liveDbPath, VOXWARD_KIRO_TIMEOUT_MS: "120000" },
      readFile: () => "",
    });
    assert(cfgRes.ok, "loadConfig ok");
    const ledgerDir = join(volDir, "tombstones");
    const ledger = createTombstoneLedger(ledgerDir);
    const app1 = buildApp({
      modules: buildRegistry(cfgRes.config),
      database: db1,
      tombstoneLedger: ledger,
      logger: false,
    });

    const ownerLoginRes = await app1.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "prod-owner", password: ownerPass },
    });
    assert(ownerLoginRes.statusCode === 200, "owner HTTP login 200");
    const ownerCookieInfo = cookiePair(ownerLoginRes.headers, SESSION_COOKIE);
    assert(
      ownerCookieInfo.raw.includes("HttpOnly") &&
        ownerCookieInfo.raw.includes("Secure") &&
        ownerCookieInfo.raw.includes("SameSite=Strict"),
      `cookie flags missing: ${ownerCookieInfo.raw}`,
    );
    const ownerCsrf = (ownerLoginRes.json() as { csrfToken: string }).csrfToken;

    // Missing CSRF must fail with 403
    const noCsrfInvite = await app1.inject({
      method: "POST",
      url: "/channels/room-prod/members",
      headers: { cookie: ownerCookieInfo.pair },
      payload: { accountId: modNoLogs.accountId, role: "MODERATOR", logAccess: false },
    });
    assert(noCsrfInvite.statusCode === 403, "missing x-csrf-token must be rejected with 403");

    // Batch invite 3 roles
    const batchInvite = await app1.inject({
      method: "POST",
      url: "/members/batch",
      headers: { cookie: ownerCookieInfo.pair, "x-csrf-token": ownerCsrf },
      payload: {
        items: [
          { channelId: "room-prod", accountId: modNoLogs.accountId, role: "MODERATOR", logAccess: false },
          { channelId: "room-prod", accountId: modLogs.accountId, role: "MODERATOR", logAccess: true },
          { channelId: "room-prod", accountId: dataAdmin.accountId, role: "DATA_ADMIN", logAccess: false },
        ],
      },
    });
    assert(batchInvite.statusCode === 201, `batchInvite status ${batchInvite.statusCode}`);

    // WebSocket handshake same-origin vs cross-origin check
    const wsSameOrigin = authorizeSocketHandshake(db1, {
      headers: {
        cookie: ownerCookieInfo.pair,
        host: "voxward.example.com",
        origin: "https://voxward.example.com",
      },
      now: new Date(),
    });
    const wsCrossOrigin = authorizeSocketHandshake(db1, {
      headers: {
        cookie: ownerCookieInfo.pair,
        host: "voxward.example.com",
        origin: "https://attacker.example.com",
      },
      now: new Date(),
    });
    assert(wsSameOrigin.ok === true && wsCrossOrigin.ok === false, "WS handshake enforces Origin === Host");

    // Least privilege checks on moderators
    const modNoLogLogin = await app1.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "mod-nolog", password: modPass },
    });
    const modNoLogCookie = cookiePair(modNoLogLogin.headers, SESSION_COOKIE).pair;
    const modLogsDenied = await app1.inject({
      method: "GET",
      url: "/internal/channels/room-prod/logs/change",
      headers: { cookie: modNoLogCookie },
    });
    assert(modLogsDenied.statusCode === 403, `moderator with logAccess=false denied logs.view (got ${modLogsDenied.statusCode})`);

    const modWithLogLogin = await app1.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "mod-log", password: modPass },
    });
    const modWithLogCookie = cookiePair(modWithLogLogin.headers, SESSION_COOKIE).pair;
    const modLogsAllowed = await app1.inject({
      method: "GET",
      url: "/internal/channels/room-prod/logs/change",
      headers: { cookie: modWithLogCookie },
    });
    assert(modLogsAllowed.statusCode === 200, `moderator with logAccess=true allowed logs.view (got ${modLogsAllowed.statusCode})`);

    // Seed a subject BEFORE taking the backup so post-backup DELETE_AND_EXCEPT must be replayed on restore!
    db1.sqlite
      .prepare(
        "INSERT INTO subjects (id, channel_id, platform_subject_key, processing_generation, created_at) VALUES (?, ?, ?, 0, ?)",
      )
      .run("viewer-post-backup", "room-prod", "yt:viewer-post-backup", "2026-11-10T11:00:00.000Z");

    // Take backup BEFORE executing a DELETE_AND_EXCEPT privacy request!
    const backupDir = join(scratch, "backups");
    const snap = createBackup(db1, {
      directory: backupDir,
      limits: { maxCount: 3, maxTotalBytes: 50 * 1024 * 1024, maxAgeDays: 7 },
      nowIso: "2026-11-10T12:00:00.000Z",
    });
    assert(existsSync(snap.created.path), "backup file created");

    // Execute post-backup DELETE_AND_EXCEPT request as DATA_ADMIN so tombstone ledger records it!
    const daLogin = await app1.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "data-admin", password: modPass },
    });
    const daCookie = cookiePair(daLogin.headers, SESSION_COOKIE).pair;
    const daCsrf = (daLogin.json() as { csrfToken: string }).csrfToken;
    const createReqRes = await app1.inject({
      method: "POST",
      url: "/channels/room-prod/data/requests",
      headers: { cookie: daCookie, "x-csrf-token": daCsrf },
      payload: {
        subjectRef: "viewer-post-backup",
        kind: "DELETE",
        mode: "DELETE_AND_EXCEPT",
        requestSource: REQUEST_SOURCES[0],
      },
    });
    assert(createReqRes.statusCode === 201, `create data request status ${createReqRes.statusCode}: ${createReqRes.body}`);
    const reqBody = createReqRes.json() as { id?: string; requestId?: string; request?: { id: string } };
    const reqId = reqBody.id ?? reqBody.requestId ?? reqBody.request?.id ?? "";
    assert(reqId !== "", `missing request id in ${createReqRes.body}`);
    const verReqRes = await app1.inject({
      method: "POST",
      url: `/channels/room-prod/data/requests/${reqId}/verification`,
      headers: { cookie: daCookie, "x-csrf-token": daCsrf },
      payload: { verdict: "VERIFIED", method: VERIFICATION_METHODS[0] },
    });
    assert(verReqRes.statusCode === 200, `verify data request status ${verReqRes.statusCode}: ${verReqRes.body}`);
    const execReqRes = await app1.inject({
      method: "POST",
      url: `/channels/room-prod/data/requests/${reqId}/execute`,
      headers: { cookie: daCookie, "x-csrf-token": daCsrf },
    });
    assert(execReqRes.statusCode === 200, `execute data request status ${execReqRes.statusCode}: ${execReqRes.body}`);

    await app1.close();
    db1.close();

    // Missing backup fail-closed check (must not touch liveDbPath)
    let missingBackupCode = "";
    try {
      restoreDatabaseWithPorts({
        backupPath: join(backupDir, "does-not-exist.sqlite3"),
        targetPath: liveDbPath,
        ledger,
        certificateSummary: CERTIFICATE_SUMMARY,
        now: () => new Date("2026-11-10T12:10:00.000Z"),
        replayWith: (ports, tombstones) => replayTombstones(ports, tombstones),
      });
    } catch (err) {
      missingBackupCode = (err as { code?: string }).code ?? String(err);
    }
    assert(missingBackupCode.includes("BACKUP_NOT_FOUND"), `expected BACKUP_NOT_FOUND, got ${missingBackupCode}`);

    // Real .restoring recovery from pre-delete backup + post-backup tombstone replay!
    let replayedTombstonesCount = 0;
    restoreDatabaseWithPorts({
      backupPath: snap.created.path,
      targetPath: liveDbPath,
      ledger,
      certificateSummary: CERTIFICATE_SUMMARY,
      now: () => new Date("2026-11-10T12:10:00.000Z"),
      replayWith: (ports, tombstones) => {
        replayedTombstonesCount = tombstones.length;
        return replayTombstones(ports, tombstones);
      },
    });
    assert(!existsSync(`${liveDbPath}.restoring`), ".restoring staging file cleaned up");
    assert(replayedTombstonesCount >= 1, "post-backup tombstone replayed during .restoring restore");

    const dbRestored = openDatabase({ filePath: liveDbPath });
    const excRow = dbRestored.sqlite
      .prepare(
        "SELECT subject_id FROM score_exceptions WHERE channel_id = ? AND subject_id = ? AND removed_at IS NULL",
      )
      .get("room-prod", "viewer-post-backup") as { subject_id: string } | undefined;
    assert(excRow?.subject_id === "viewer-post-backup", "tombstone replay preserved post-backup score_exception");
    dbRestored.close();

    // =========================================================================
    // P3: Q28 / Q37 / Q47 non-live verification + docs/specs hygiene & links
    // =========================================================================
    // Q28: attacker callback cannot burn owner's PKCE state; re-auth retires old grant; failed remote revoke keeps grant
    const memVault = new Map<string, { purpose: string; value: string }>();
    let seq = 0;
    const refsList: Array<{
      id: string;
      channelId: string | null;
      purpose: "PLATFORM_OAUTH" | "PLATFORM_PROJECT_KEY";
      secretRef: string;
      createdAt: string;
      revokedAt: string | null;
    }> = [];
    const ytStore = createYouTubeCredentialStore({
      client: {
        clientId: "cid-1",
        redirectUri: "https://voxward.example.com/youtube/oauth/callback",
        publishingStatus: "TESTING",
      },
      secrets: {
        put: (purpose, value) => {
          const ref = `secretref:test_${++seq}`;
          memVault.set(ref, { purpose, value });
          return { ref };
        },
        reveal: (ref, purpose) => {
          const hit = memVault.get(ref);
          if (!hit || hit.purpose !== purpose) throw new Error("unreadable");
          return hit.value;
        },
        remove: (ref, purpose) => {
          const hit = memVault.get(ref);
          if (!hit) return false;
          if (hit.purpose !== purpose) throw new Error("purpose mismatch");
          return memVault.delete(ref);
        },
      },
      refs: {
        insert: (row) => refsList.push({ ...row, revokedAt: null }),
        findLatest: (channelId, purpose) =>
          [...refsList].reverse().find((r) => r.channelId === channelId && r.purpose === purpose),
        revoke: (id, revokedAt) => {
          const row = refsList.find((r) => r.id === id);
          if (row) row.revokedAt = revokedAt;
        },
      },
      newId: () => `ref-${++seq}`,
      now: () => "2026-11-10T12:00:00.000Z",
    });
    ytStore.registerClientSecret("placeholder-client-secret-for-unit-test");
    const stateMap = new Map<string, { channelId: string; accountId: string; operation: string; codeVerifier: string }>();
    const states = {
      issue: (entry: { channelId: string; accountId: string; operation: string; codeVerifier: string }) => {
        const s = `st-${++seq}`;
        stateMap.set(s, entry);
        return s;
      },
      peek: (s: string) => stateMap.get(s) ?? null,
      consume: (s: string) => {
        const entry = stateMap.get(s) ?? null;
        stateMap.delete(s);
        return entry;
      },
    };
    let revokeShouldFail = true;
    let tokenSeq = 0;
    const ytRoutes = createYouTubeAuthRoutes({
      store: ytStore,
      http: {
        postForm: async (url) => {
          if (url.includes("revoke")) {
            return revokeShouldFail ? { status: 500, body: { error: "server_error" } } : { status: 200, body: {} };
          }
          return {
            status: 200,
            body: {
              access_token: `at-${++tokenSeq}`,
              refresh_token: `rt-${tokenSeq}`,
              scope: "https://www.googleapis.com/auth/youtube.readonly",
            },
          };
        },
      },
      states,
      now: () => "2026-11-10T12:00:00.000Z",
      resolveRole: (acc) => (acc === "owner-1" ? "CHANNEL_OWNER" : "MODERATOR"),
    });
    const start1 = await ytRoutes.start(
      { accountId: "owner-1", channelId: "room-prod", role: "CHANNEL_OWNER" },
      { operation: "AUTHORIZED_DATA_READ" },
    );
    assert(start1.status === 200, "yt start 200");
    const authUrl1 = new URL(String(start1.body.authorizationUrl));
    const stateParam1 = authUrl1.searchParams.get("state") ?? "";
    assert(authUrl1.searchParams.get("code_challenge_method") === "S256", "PKCE S256 required");
    // Attacker callback attempt with owner's state must fail 400 STATE_INVALID and NOT consume state!
    const attackerAttempt = await ytRoutes.callback("other-account", { state: stateParam1, code: "stolen" });
    assert(attackerAttempt.status === 400, "other account rejected with 400");
    const ownerCb1 = await ytRoutes.callback("owner-1", { state: stateParam1, code: "valid-code-1" });
    assert(ownerCb1.status === 200 && ownerCb1.body.state === "AUTHORIZED", "owner still completes callback");
    // Re-authorize -> retires previous grant & removes old refresh token from vault
    const start2 = await ytRoutes.start(
      { accountId: "owner-1", channelId: "room-prod", role: "CHANNEL_OWNER" },
      { operation: "AUTHORIZED_DATA_READ" },
    );
    const stateParam2 = new URL(String(start2.body.authorizationUrl)).searchParams.get("state") ?? "";
    const ownerCb2 = await ytRoutes.callback("owner-1", { state: stateParam2, code: "valid-code-2" });
    assert(ownerCb2.status === 200, "second callback 200");
    const oauthRows = refsList.filter((r) => r.purpose === "PLATFORM_OAUTH");
    assert(
      oauthRows.length === 2 && oauthRows[0]?.revokedAt !== null && !memVault.has(oauthRows[0]!.secretRef),
      "old grant revoked and old vault secret removed on re-auth",
    );
    // Failed remote revoke keeps grant active
    const revFail = await ytRoutes.revoke({ accountId: "owner-1", channelId: "room-prod", role: "CHANNEL_OWNER" });
    assert(revFail.status === 502 && ytStore.readGrant("room-prod").kind === "ACTIVE", "failed remote revoke keeps grant");
    revokeShouldFail = false;
    const revOk = await ytRoutes.revoke({ accountId: "owner-1", channelId: "room-prod", role: "CHANNEL_OWNER" });
    assert(revOk.status === 200 && ytStore.readGrant("room-prod").kind === "REVOKED", "confirmed revoke marks REVOKED");

    // Q37 + Q47 fake CLI verification (0 real CLI)
    makeFakeExecutable();
    const fakeLog = join(scratch, "fake-cli.log");
    for (const badMs of [0, -1, 300_001, 1.5]) {
      let threw = false;
      try {
        createKiroCliInferenceProvider({
          command: FAKE_CLI,
          env: fakeEnvironment(fakeLog, "ok"),
          runtimeRoot: join(scratch, "kiro-rt"),
          maxItems: 4,
          validateOutput: moderationValidator,
          agent: "voxward-runtime",
          model: "kiro-fake",
          timeoutMs: badMs,
        });
      } catch (e) {
        threw = e instanceof RangeError;
      }
      assert(threw, `expected RangeError for timeoutMs=${badMs}`);
    }
    const caps = describeKiroCli();
    assert(
      caps.providerName === "kiro-cli" &&
        caps.supportsCancel === true &&
        checkSettings(
          { ...DEFAULT_MODEL_SETTINGS, realtimeModeration: { modelId: "m1", reasoning: null } },
          caps,
        )[0]?.code === "CAPABILITY_NOT_REPORTED" &&
        checkRunnable("realtimeModeration", DEFAULT_MODEL_SETTINGS, caps)[0]?.code === "SELECTION_NOT_CONFIGURED",
      "Q47 fail-closed capability checks",
    );
    assert(!existsSync(fakeLog), "no CLI process spawned during Q37/Q47 checks");

    // Hygiene & relative path verification across all S029 touched files
    const s029Files = [
      ".kiro/specs/voxward-s029-deploy/design.md",
      ".kiro/specs/voxward-s029-deploy/tasks.md",
      ".kiro/specs/voxward-s029-deploy/evidence/self-check.md",
      "deploy/server/server.env.example",
      "deploy/server/voxward.service",
      "deploy/server/Caddyfile.example",
      "deploy/server/README.md",
      "deploy/kiro-runtime/README.md",
      "deploy/kiro-runtime/runtime.env.example",
      "docs/deployment/remote-deploy.md",
      "docs/deployment/moderators-and-access.md",
      "docs/deployment/logs-and-retention.md",
      "docs/deployment/backup-and-recovery.md",
      "docs/deployment/upgrade-and-rollback.md",
      "docs/deployment/troubleshooting-and-quotas.md",
      "docs/deployment/youtube-credentials.md",
      "scripts/bootstrap-owner.mjs",
      "scripts/deploy-check.mjs",
      "apps/server/src/auth/bootstrap.ts",
      "apps/server/src/auth/bootstrap-cli.ts",
      "apps/server/src/auth/login.ts",
      "apps/server/test/auth/bootstrap-and-q26.test.ts",
      "apps/server/test/deployment/deployment-drill.test.ts",
    ];
    const bannedTokens = [
      ["/home/", "ryanlan"].join(""),
      ["file:", "///"].join(""),
      [".work", "trees"].join(""),
      ["/tm", "p/"].join(""),
      ["pnpm add -D ", "@"].join(""),
    ];
    for (const rel of s029Files) {
      const abs = resolve(REPO_ROOT, rel);
      assert(existsSync(abs), `missing S029 file ${rel}`);
      let txt = readFileSync(abs, "utf8");
      txt = txt.replace(/<!-- EINZBERN-SPEC:MANAGED-START -->[\s\S]*?<!-- EINZBERN-SPEC:MANAGED-END -->/g, "");
      for (const b of bannedTokens) {
        assert(!txt.includes(b), `file ${rel} contains banned token`);
      }
    }
    for (const unverifiedDoc of [
      ".kiro/specs/voxward-s029-deploy/design.md",
      ".kiro/specs/voxward-s029-deploy/evidence/self-check.md",
      "deploy/kiro-runtime/README.md",
      "docs/deployment/remote-deploy.md",
      "docs/deployment/troubleshooting-and-quotas.md",
    ]) {
      const txt = readFileSync(resolve(REPO_ROOT, unverifiedDoc), "utf8");
      assert(
        txt.includes("VW-S029-KIRO-REAL") && txt.includes("UNVERIFIED"),
        `${unverifiedDoc} must disclose VW-S029-KIRO-REAL UNVERIFIED`,
      );
    }

    const report = {
      allProbesCompleted: true,
      checkCount: 3,
      p1: {
        deployCheckPositiveCount: dcPosJson.checks.length,
        deployCheckNegativeRejected: 3,
        mainBundleFailClosedRejected: 2,
        liveHealthStatus: healthStatus,
        liveSandboxProbeStatus: sandboxProbeStatus,
        gracefulSigtermExit: exitCode,
      },
      p2: {
        bootstrapCliVerified: true,
        repeatBootstrapRejectedCode: "OWNER_ALREADY_BOOTSTRAPPED",
        q26MaxConcurrency: MAX_SCRYPT_CONCURRENCY,
        q26RejectedWeakAndOversizedHashes: 4,
        concurrentLoginsSettled: concurrentLogins.length,
        csrfAndWsOriginEnforced: true,
        moderatorRbacVerified: true,
        missingBackupRejected: "BACKUP_NOT_FOUND",
        restoringReplayedTombstones: replayedTombstonesCount,
      },
      p3: {
        q28PkceAndGrantRetireVerified: true,
        q37TimeoutBoundsRejected: 4,
        q47CapabilityFailClosed: true,
        s029FilesHygieneChecked: s029Files.length,
        kiroRealMarkedUnverifiedInDocs: 5,
      },
    };
    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + "\n", "utf8");
    process.stdout.write(JSON.stringify({ allProbesCompleted: true, checkCount: 3 }) + "\n");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

await main();
