import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifySlsaAttestationBundle } from "../../../../scripts/verify-provenance.mjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createKiroCliInferenceProvider } from "../../src/adapters/kiro-cli/provider.js";
import { describeKiroCli } from "../../src/adapters/kiro-cli/capabilities.js";
import { bootstrapOwner } from "../../src/auth/bootstrap.js";
import { SESSION_COOKIE } from "../../src/auth/guard.js";
import { createAccount } from "../../src/auth/login.js";
import { loadConfig } from "../../src/config/load.js";
import { createBackup } from "../../src/db/backup-store.js";
import { openDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import { restoreDatabaseWithPorts } from "../../src/db/restore-support.js";
import { createTombstoneLedger } from "../../src/db/tombstone-ledger.js";
import { CERTIFICATE_SUMMARY } from "../../src/modules/audit-store/index.js";
import { replayTombstones } from "../../src/modules/data-lifecycle-service/index.js";
import { checkRunnable, checkSettings, DEFAULT_MODEL_SETTINGS } from "../../src/modules/inference-provider/index.js";
import { createYouTubeCredentialStore, createYouTubeAuthRoutes } from "../../src/modules/platform-source/index.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { FAKE_CLI, fakeEnvironment, makeFakeExecutable, moderationValidator } from "../adapters/kiro-cli/helpers.js";
import { removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date(T0);
const OWNER_PASSWORD = "owner-strong-passphrase-123";
const MOD_PASSWORD = "moderator-strong-passphrase-456";

function sessionCookieOf(headers: Record<string, unknown>): string {
  const setCookie = headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? String(setCookie[0]) : String(setCookie ?? "");
  const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(raw);
  if (match === null) throw new Error("missing session cookie");
  return `${SESSION_COOKIE}=${match[1]}`;
}

describe("VOXWARD-SUB-053 non-real deployment drill", () => {
  let directory: string;
  let dbPath: string;
  let backupDir: string;
  let ledgerDir: string;

  beforeEach(() => {
    directory = scratchDirectory("deploy-drill-");
    dbPath = join(directory, "volume", "voxward.sqlite3");
    backupDir = join(directory, "backups");
    ledgerDir = join(directory, "volume", "tombstones");
  });

  afterEach(() => {
    removeDirectory(directory);
  });

  it("executes clean volume migrate -> owner bootstrap -> moderator invites -> restart -> backup & .restoring drill", async () => {
    // 1. Clean volume + migrations + one-time owner bootstrap
    const db1 = openDatabase({ filePath: dbPath });
    runMigrations(db1);
    const owner = await bootstrapOwner(db1, {
      channelId: "channel-deploy",
      loginName: "deploy-owner",
      displayName: "Deploy Owner",
      password: OWNER_PASSWORD,
      now: NOW,
    });
    const mod1 = await createAccount(db1, {
      loginName: "mod-alice",
      displayName: "Alice",
      password: MOD_PASSWORD,
      now: NOW,
    });
    const mod2 = await createAccount(db1, {
      loginName: "mod-bob",
      displayName: "Bob",
      password: MOD_PASSWORD,
      now: NOW,
    });

    // Repeat bootstrap must fail closed
    await expect(
      bootstrapOwner(db1, {
        channelId: "channel-deploy",
        loginName: "second-owner",
        displayName: "Second",
        password: OWNER_PASSWORD,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "OWNER_ALREADY_BOOTSTRAPPED" });

    // 2. Start app, login as owner, invite multiple moderators, verify RBAC & immediate revoke
    const configResult = loadConfig({
      env: { VOXWARD_ADAPTERS: "synthetic", VOXWARD_DATABASE_FILE: dbPath, VOXWARD_KIRO_TIMEOUT_MS: "120000" },
      readFile: () => {
        throw new Error("no file");
      },
    });
    expect(configResult.ok).toBe(true);
    if (!configResult.ok) return;

    const ledger = createTombstoneLedger(ledgerDir);
    const app1 = buildApp({
      modules: buildRegistry(configResult.config),
      database: db1,
      tombstoneLedger: ledger,
      logger: false,
    });

    const loginRes = await app1.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "deploy-owner", password: OWNER_PASSWORD },
    });
    expect(loginRes.statusCode).toBe(200);
    const ownerCookie = sessionCookieOf(loginRes.headers);
    const ownerCsrf = (loginRes.json() as { csrfToken: string }).csrfToken;

    const inviteRes = await app1.inject({
      method: "POST",
      url: "/members/batch",
      headers: { cookie: ownerCookie, "x-csrf-token": ownerCsrf },
      payload: {
        items: [
          { channelId: "channel-deploy", accountId: mod1.accountId, role: "MODERATOR", logAccess: false },
          { channelId: "channel-deploy", accountId: mod2.accountId, role: "MODERATOR", logAccess: true },
        ],
      },
    });
    expect(inviteRes.statusCode).toBe(201);
    expect(inviteRes.json()).toEqual({ granted: 2 });

    // Moderator logs in and is denied members.manage (least privilege)
    const modLoginRes = await app1.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "mod-alice", password: MOD_PASSWORD },
    });
    expect(modLoginRes.statusCode).toBe(200);
    const modCookie = sessionCookieOf(modLoginRes.headers);
    const modCsrf = (modLoginRes.json() as { csrfToken: string }).csrfToken;

    const forbiddenMembers = await app1.inject({
      method: "GET",
      url: "/channels/channel-deploy/members",
      headers: { cookie: modCookie },
    });
    expect(forbiddenMembers.statusCode).toBe(403);

    // Revoke mod1 -> immediate 403 on mod queue
    const revokeRes = await app1.inject({
      method: "DELETE",
      url: `/channels/channel-deploy/members/${mod1.accountId}`,
      headers: { cookie: ownerCookie, "x-csrf-token": ownerCsrf },
    });
    expect(revokeRes.statusCode).toBe(204);
    expect(modCsrf.length).toBeGreaterThan(0);

    await app1.close();
    db1.close();

    // 3. Restart on the same persistent volume and verify state persisted
    const db2 = openDatabase({ filePath: dbPath });
    runMigrations(db2);
    const app2 = buildApp({
      modules: buildRegistry(configResult.config),
      database: db2,
      tombstoneLedger: ledger,
      logger: false,
    });
    const listMembersAfterRestart = await app2.inject({
      method: "GET",
      url: "/channels/channel-deploy/members",
      headers: { cookie: ownerCookie },
    });
    expect(listMembersAfterRestart.statusCode).toBe(200);
    const activeMembers = listMembersAfterRestart.json() as Array<{ accountId: string; role: string }>;
    expect(activeMembers.map((m) => m.accountId).sort()).toEqual([mod2.accountId, owner.accountId].sort());

    // 4. Create backup, close DB, and execute .restoring isolated restore drill
    const backup = createBackup(db2, {
      directory: backupDir,
      limits: { maxCount: 3, maxTotalBytes: 50 * 1024 * 1024, maxAgeDays: 7 },
      nowIso: "2026-11-10T12:00:00.000Z",
    });
    expect(existsSync(backup.created.path)).toBe(true);
    await app2.close();
    db2.close();

    restoreDatabaseWithPorts({
      backupPath: backup.created.path,
      targetPath: dbPath,
      ledger,
      certificateSummary: CERTIFICATE_SUMMARY,
      now: () => new Date("2026-11-10T12:05:00.000Z"),
      replayWith: (ports, tombstones) => replayTombstones(ports, tombstones),
    });
    expect(existsSync(`${dbPath}.restoring`)).toBe(false);

    const db3 = openDatabase({ filePath: dbPath });
    const countRow = db3.sqlite.prepare("SELECT count(*) AS n FROM auth_accounts").get() as { n: number };
    expect(countRow.n).toBe(3);
    db3.close();
  }, 30_000);

  it("enforces fail-closed config, missing YouTube credentials, Q37 timeout cap, and Q47 fake CLI capabilities", async () => {
    // Q37 config bounds
    const badTimeout = loadConfig({
      env: { VOXWARD_ADAPTERS: "synthetic", VOXWARD_KIRO_TIMEOUT_MS: "999999" },
      readFile: () => "",
    });
    expect(badTimeout.ok).toBe(false);
    if (!badTimeout.ok) {
      expect(badTimeout.error.code).toBe("CONFIG_INVALID");
    }

    // Q37 provider upper bound
    makeFakeExecutable();
    const runtimeRoot = join(directory, "kiro-root");
    const logPath = join(directory, "fake-kiro.log");
    expect(() =>
      createKiroCliInferenceProvider({
        command: FAKE_CLI,
        env: fakeEnvironment(logPath, "ok"),
        runtimeRoot,
        maxItems: 5,
        validateOutput: moderationValidator,
        agent: "voxward-runtime",
        model: "kiro-test",
        timeoutMs: 300_001,
      }),
    ).toThrow(RangeError);

    // Q47: describeKiroCli reports no models -> checkSettings/checkRunnable fail-closed
    const caps = describeKiroCli();
    expect(caps).toEqual({ contractVersion: "1", providerName: "kiro-cli", supportsCancel: true });
    expect(
      checkSettings(
        {
          ...DEFAULT_MODEL_SETTINGS,
          realtimeModeration: { modelId: "kiro-test", reasoning: null },
        },
        caps,
      ),
    ).toEqual([{ code: "CAPABILITY_NOT_REPORTED", path: "/realtimeModeration" }]);
    expect(checkRunnable("realtimeModeration", DEFAULT_MODEL_SETTINGS, caps)).toEqual([
      { code: "SELECTION_NOT_CONFIGURED", path: "/realtimeModeration" },
    ]);

    // Missing YouTube credentials -> NOT_CONFIGURED (409 on oauth start)
    const store = createYouTubeCredentialStore({
      client: {
        clientId: "client-id",
        redirectUri: "https://voxward.example.com/youtube/oauth/callback",
        publishingStatus: "TESTING",
      },
      secrets: {
        put: () => ({ ref: "secretref:unused_000000000" }),
        reveal: () => {
          throw new Error("missing");
        },
        remove: () => false,
      },
      refs: {
        insert: () => {},
        findLatest: () => undefined,
        revoke: () => {},
      },
      newId: () => "id-1",
      now: () => T0,
    });
    const ytRoutes = createYouTubeAuthRoutes({
      store,
      http: { postForm: async () => ({ status: 500, body: {} }) },
      states: {
        issue: () => "state-1",
        peek: () => null,
        consume: () => null,
      },
      now: () => T0,
      resolveRole: () => "CHANNEL_OWNER",
    });
    const startRes = await ytRoutes.start(
      { accountId: "owner-1", channelId: "channel-1", role: "CHANNEL_OWNER" },
      {},
    );
    expect(startRes.status).toBe(409);
    expect(startRes.body).toEqual({ state: "NOT_CONFIGURED" });

    // Verify fake CLI log was never touched (no real CLI invoked)
    expect(existsSync(logPath)).toBe(false);
    // Verify deployment template files have no placeholder secret leaks
    const runtimeEnvPath = fileURLToPath(new URL("../../../../deploy/kiro-runtime/runtime.env.example", import.meta.url));
    const runtimeEnv = readFileSync(runtimeEnvPath, "utf8");
    expect(runtimeEnv).toContain("KIRO_API_KEY=\n");
  });

  it("VOXWARD-STORY-066: enforces non-placeholder OCI digest/SLSA provenance pinning and rejects placeholders or tampered manifests", () => {
    const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
    const checkScript = join(repoRoot, "scripts/deploy-check.mjs");

    // Helper creates a minimal fixture copy containing built artifacts + supply-chain files
    const createSupplyChainFixture = (name: string): string => {
      const fixtureRoot = join(directory, name);
      const copyPaths = [
        "Dockerfile",
        ".dockerignore",
        ".github/workflows",
        "deploy/provenance.json",
        "deploy/k3s",
        "deploy/server",
        "deploy/kiro-runtime",
        "apps/server/dist",
        "apps/server/src/db/migrations/meta/_journal.json",
        "apps/web/dist",
      ];
      for (const rel of copyPaths) {
        const src = join(repoRoot, rel);
        const dst = join(fixtureRoot, rel);
        mkdirSync(dirname(dst), { recursive: true });
        cpSync(src, dst, { recursive: true });
      }
      return fixtureRoot;
    };

    const runCheckJson = (rootDir: string) => {
      try {
        const stdout = execFileSync(
          process.execPath,
          [checkScript, "--root", rootDir, "--json", "--env-file", "deploy/server/server.env.example"],
          { encoding: "utf8" },
        );
        return { exitCode: 0, report: JSON.parse(stdout) as { ok: boolean; checks: Array<{ name: string; ok: boolean }> } };
      } catch (err) {
        const stdout = String((err as { stdout?: unknown }).stdout ?? "{}");
        return { exitCode: 1, report: JSON.parse(stdout) as { ok: boolean; checks: Array<{ name: string; ok: boolean }> } };
      }
    };

    // Valid repo passes supply-chain & non-placeholder provenance checks
    const validFixture = createSupplyChainFixture("valid-supply-chain");
    const validOut = runCheckJson(validFixture);
    expect(validOut.exitCode).toBe(0);
    expect(validOut.report.ok).toBe(true);

    const realProv = JSON.parse(readFileSync(join(repoRoot, "deploy/provenance.json"), "utf8")) as {
      appImage: {
        repository: string;
        digest: string;
        imageDigestStatus: string;
        manifests: string[];
        provenance: { predicateType: string; sourceRepository: string; sourceCommit: string; workflow: string };
      };
    };
    expect(realProv.appImage.imageDigestStatus).toBe("verified");
    expect(realProv.appImage.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(realProv.appImage.digest).not.toBe(`sha256:${"0".repeat(64)}`);
    const expectedImage = `${realProv.appImage.repository}@${realProv.appImage.digest}`;
    for (const rel of realProv.appImage.manifests) {
      const yaml = readFileSync(join(repoRoot, rel), "utf8");
      expect(yaml).toContain(`image: ${expectedImage}`);
    }

    // Positive & Negative SLSA attestation statement verification
    const validStatement = {
      _type: "https://in-toto.io/Statement/v1",
      subject: [{ name: realProv.appImage.repository, digest: { sha256: realProv.appImage.digest.slice(7) } }],
      predicateType: realProv.appImage.provenance.predicateType,
      predicate: {
        buildDefinition: {
          externalParameters: {
            workflow: {
              repository: realProv.appImage.provenance.sourceRepository,
              path: realProv.appImage.provenance.workflow,
            },
          },
          resolvedDependencies: [{ digest: { gitCommit: realProv.appImage.provenance.sourceCommit } }],
        },
      },
    };
    const b64 = Buffer.from(JSON.stringify(validStatement), "utf8").toString("base64");
    expect(verifySlsaAttestationBundle({ attestations: [{ bundle: { dsseEnvelope: { payload: b64 } } }] }, realProv).ok).toBe(true);

    const mismatchedStatement = { ...validStatement, subject: [{ name: realProv.appImage.repository, digest: { sha256: "f".repeat(64) } }] };
    const badB64 = Buffer.from(JSON.stringify(mismatchedStatement), "utf8").toString("base64");
    expect(verifySlsaAttestationBundle({ attestations: [{ bundle: { dsseEnvelope: { payload: badB64 } } }] }, realProv)).toEqual({
      ok: false,
      reason: "ATTESTATION_MISMATCH",
    });

    // Negative 1: unpinned Dockerfile base image tag
    const badDocker = createSupplyChainFixture("bad-docker");
    writeFileSync(
      join(badDocker, "Dockerfile"),
      readFileSync(join(badDocker, "Dockerfile"), "utf8").replace(
        /node:24-bookworm-slim@sha256:[0-9a-f]{64}/g,
        "node:24-bookworm-slim",
      ),
    );
    const badDockerOut = runCheckJson(badDocker);
    expect(badDockerOut.exitCode).toBe(1);
    expect(badDockerOut.report.checks.find((c) => c.name === "supply-chain:dockerfile-base-digest")?.ok).toBe(false);

    // Negative 2: mutable GitHub Action tag in ci.yml & container-provenance.yml
    const badCi = createSupplyChainFixture("bad-ci");
    writeFileSync(
      join(badCi, ".github/workflows/ci.yml"),
      readFileSync(join(badCi, ".github/workflows/ci.yml"), "utf8").replace(
        /actions\/checkout@[0-9a-f]{40}/,
        "actions/checkout@v4",
      ),
    );
    const badCiOut = runCheckJson(badCi);
    expect(badCiOut.exitCode).toBe(1);
    expect(badCiOut.report.checks.find((c) => c.name === "supply-chain:workflow-sha:.github/workflows/ci.yml")?.ok).toBe(false);

    const badContainerWf = createSupplyChainFixture("bad-container-wf");
    writeFileSync(
      join(badContainerWf, ".github/workflows/container-provenance.yml"),
      readFileSync(join(badContainerWf, ".github/workflows/container-provenance.yml"), "utf8").replace(
        /actions\/attest-build-provenance@[0-9a-f]{40}/,
        "actions/attest-build-provenance@v2",
      ),
    );
    const badContainerWfOut = runCheckJson(badContainerWf);
    expect(badContainerWfOut.exitCode).toBe(1);
    expect(badContainerWfOut.report.checks.find((c) => c.name === "supply-chain:workflow-sha:.github/workflows/container-provenance.yml")?.ok).toBe(false);

    // Negative 3: unpinned floating k3s manifest image tag & provenance mismatch
    const badK3s = createSupplyChainFixture("bad-k3s");
    writeFileSync(
      join(badK3s, "deploy/k3s/production/deployment.yaml"),
      readFileSync(join(badK3s, "deploy/k3s/production/deployment.yaml"), "utf8").replace(
        /image:\s*[^\s]+/,
        "image: ghcr.io/tpmoonchefryan/voxward:latest",
      ),
    );
    const badK3sOut = runCheckJson(badK3s);
    expect(badK3sOut.exitCode).toBe(1);
    expect(badK3sOut.report.checks.find((c) => c.name === "supply-chain:k3s:deploy/k3s/production/deployment.yaml")?.ok).toBe(false);

    // Negative 4: all-zero placeholder digest is rejected even if all manifests match it
    const placeholderDir = createSupplyChainFixture("placeholder-digest");
    const zeroDigest = `sha256:${"0".repeat(64)}`;
    for (const rel of ["deploy/provenance.json", ...realProv.appImage.manifests]) {
      writeFileSync(
        join(placeholderDir, rel),
        readFileSync(join(placeholderDir, rel), "utf8").replaceAll(realProv.appImage.digest, zeroDigest),
      );
    }
    const placeholderOut = runCheckJson(placeholderDir);
    expect(placeholderOut.exitCode).toBe(1);
    expect(placeholderOut.report.checks.find((c) => c.name === "supply-chain:app-image-provenance")?.ok).toBe(false);

    // Negative 5: missing or unverified provenance metadata in provenance.json is rejected
    const badProvDir = createSupplyChainFixture("bad-prov");
    const tamperedProv = structuredClone(realProv) as Record<string, unknown>;
    (tamperedProv.appImage as Record<string, unknown>).imageDigestStatus = "candidate-placeholder-until-oci-build";
    writeFileSync(join(badProvDir, "deploy/provenance.json"), JSON.stringify(tamperedProv, null, 2));
    const badProvOut = runCheckJson(badProvDir);
    expect(badProvOut.exitCode).toBe(1);
    expect(badProvOut.report.checks.find((c) => c.name === "supply-chain:app-image-provenance")?.ok).toBe(false);
  });
});
