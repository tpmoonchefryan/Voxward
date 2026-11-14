import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.VERIFY_REPO_ROOT;
const outJsonPath = process.env.PROBE_OUT_JSON;
assert.ok(repoRoot && fs.existsSync(repoRoot), "VERIFY_REPO_ROOT is required");
assert.ok(outJsonPath, "PROBE_OUT_JSON is required");

const importRepo = (relPath: string) => import(pathToFileURL(path.join(repoRoot, relPath)).href);
const reqFromWeb = createRequire(path.join(repoRoot, "apps/web/package.json"));
const ReactMod = await import(pathToFileURL(reqFromWeb.resolve("react")).href);
const React = ReactMod.default ?? ReactMod;
(globalThis as Record<string, unknown>).React = React;
const ReactDomMod = await import(pathToFileURL(reqFromWeb.resolve("react-dom/server")).href);
const ReactDomServer = ReactDomMod.default ?? ReactDomMod;

const { buildApp } = await importRepo("apps/server/src/app.ts");
const { buildRegistry } = await importRepo("apps/server/src/modules/registry.ts");
const { migratedDatabase, removeDirectory, scratchDirectory } = await importRepo("apps/server/test/db/helpers.ts");
const { SandboxView } = await importRepo("apps/web/src/pages/sandbox/SandboxPage.tsx");

interface ProbeCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly details: Record<string, unknown>;
}

const checks: ProbeCheck[] = [];

async function allocateFreePort(): Promise<number> {
  return await new Promise((resolvePort, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close(() => reject(new Error("port alloc failed")));
        return;
      }
      const p = addr.port;
      srv.close((err) => (err ? reject(err) : resolvePort(p)));
    });
  });
}

async function isPortOpen(port: number): Promise<boolean> {
  return await new Promise((resolveOpen) => {
    const sock = net.createConnection({ host: "127.0.0.1", port });
    sock.once("connect", () => {
      sock.destroy();
      resolveOpen(true);
    });
    sock.once("error", () => {
      sock.destroy();
      resolveOpen(false);
    });
  });
}

// ============================================================================
// P1: B15 Real Subprocess Launcher (start-sandbox.mjs), SPA Fallback, Path Traversal Guard, and Production main.ts Fail-Closed
// ============================================================================
{
  const launcherPath = path.join(repoRoot, "deploy/sandbox/start-sandbox.mjs");
  const checkOnly = spawnSync(process.execPath, [launcherPath, "--check-only"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, VOXWARD_SANDBOX_DB: ":memory:" },
  });
  assert.equal(checkOnly.status, 0);
  const checkJson = JSON.parse(checkOnly.stdout);
  assert.equal(checkJson.ok, true);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vw-m9ar1-sbx-"));
  const dbPath = path.join(dir, "sandbox-probe.sqlite3");
  const port = await allocateFreePort();

  const child = spawn(process.execPath, [launcherPath], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VOXWARD_SANDBOX_ENABLED: "true",
      VOXWARD_SANDBOX_DB: dbPath,
      VOXWARD_SANDBOX_HOST: "127.0.0.1",
      VOXWARD_SANDBOX_PORT: String(port),
    },
  });

  let stateStatus = 0;
  let spaStatus = 0;
  let spaContentType = "";
  let traversalStatus = 0;
  try {
    const base = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(`${base}/sandbox-api/state`);
        if (r.ok) {
          stateStatus = r.status;
          const body = (await r.json()) as { snapshot: { syntheticOnly: boolean } };
          assert.equal(body.snapshot.syntheticOnly, true);
          break;
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(stateStatus, 200);

    const spaRes = await fetch(`${base}/sandbox`);
    spaStatus = spaRes.status;
    spaContentType = spaRes.headers.get("content-type") ?? "";
    const spaHtml = await spaRes.text();
    assert.equal(spaStatus, 200);
    assert.ok(spaContentType.includes("text/html"));
    assert.ok(spaHtml.toLowerCase().includes("<!doctype html>"));

    const travRes = await fetch(`${base}/assets/..%2F..%2Fpackage.json`);
    traversalStatus = travRes.status;
    assert.equal(traversalStatus, 404);
  } finally {
    const exitP = new Promise<{ code: number | null; signal: string | null }>((res) => {
      child.once("exit", (code, signal) => res({ code, signal }));
    });
    child.kill("SIGINT");
    const exited = await exitP;
    assert.ok(exited.code === 0 || exited.signal === "SIGINT");
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const residualListening = await isPortOpen(port);
  assert.equal(residualListening, false);

  // Production main.js must fail closed when VOXWARD_SANDBOX_ENABLED=true
  const prodMain = path.join(repoRoot, "apps/server/dist/main.js");
  const prodRun = spawnSync(process.execPath, [prodMain], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, VOXWARD_SANDBOX_ENABLED: "true" },
  });
  assert.equal(prodRun.status, 1);
  assert.ok(prodRun.stderr.includes("VOXWARD_SANDBOX_ENABLED"));

  const viteCfg = fs.readFileSync(path.join(repoRoot, "apps/web/vite.config.ts"), "utf8");
  assert.ok(viteCfg.includes('"/sandbox-api"'));

  checks.push({
    id: "P1_b15_real_launcher_spa_shutdown_and_prod_fail_closed",
    passed: true,
    details: {
      checkOnlyStatus: checkOnly.status,
      stateStatus,
      spaStatus,
      spaContentType,
      traversalStatus,
      residualListening,
      prodMainExitCodeWithSandboxEnv: prodRun.status,
    },
  });
}

// ============================================================================
// P2: B16 Scenario Privacy Capability Gate & Role-Based Snapshot / SSR UI Redaction
// ============================================================================
{
  const dir = scratchDirectory("m9ar1-p2-sandbox-");
  const db = migratedDatabase(dir);
  const app = buildApp({
    modules: buildRegistry({ host: "127.0.0.1", port: 3100, adapters: "synthetic", databaseFile: "data/voxward-sandbox.sqlite3" }),
    database: db,
    logger: false,
    sandbox: { enabled: true, databasePath: "data/voxward-sandbox.sqlite3", env: {} },
  });

  try {
    for (const sc of ["normal-scoring", "spam-toxicity-block", "superchat-translation", "manual-review"]) {
      const r = await app.inject({
        method: "POST",
        url: "/sandbox-api/scenarios",
        headers: { "x-demo-role": "DEMO_STREAMER" },
        payload: { scenario: sc },
      });
      assert.equal(r.statusCode, 200);
    }

    // DEMO_MODERATOR, DEMO_STREAMER, DEMO_STAGE_VIEWER must ALL get 403 on privacy-delete* scenarios
    const forbiddenStatuses: Record<string, number[]> = {};
    for (const role of ["DEMO_MODERATOR", "DEMO_STREAMER", "DEMO_STAGE_VIEWER"]) {
      forbiddenStatuses[role] = [];
      for (const sc of ["privacy-delete", "privacy-delete-and-except"]) {
        const res = await app.inject({
          method: "POST",
          url: "/sandbox-api/scenarios",
          headers: { "x-demo-role": role },
          payload: { scenario: sc, subjectKey: "demo-viewer-alice" },
        });
        assert.equal(res.statusCode, 403);
        forbiddenStatuses[role]!.push(res.statusCode);
      }
    }

    // DEMO_STAGE_VIEWER state snapshot must redact all unapproved/audit fields
    const stageRes = await app.inject({
      method: "GET",
      url: "/sandbox-api/state",
      headers: { "x-demo-role": "DEMO_STAGE_VIEWER" },
    });
    assert.equal(stageRes.statusCode, 200);
    const stageBody = stageRes.json() as {
      capabilities: string[];
      snapshot: {
        subjects: unknown[];
        reviewQueue: unknown[];
        blockedItems: unknown[];
        approvedStage: unknown[];
        changeLogs: unknown[];
        technicalLogs: unknown[];
        dataRequests: unknown[];
      };
    };
    assert.ok(stageBody.snapshot.approvedStage.length >= 2);
    assert.equal(stageBody.snapshot.subjects.length, 0);
    assert.equal(stageBody.snapshot.reviewQueue.length, 0);
    assert.equal(stageBody.snapshot.blockedItems.length, 0);
    assert.equal(stageBody.snapshot.changeLogs.length, 0);
    assert.equal(stageBody.snapshot.technicalLogs.length, 0);
    assert.equal(stageBody.snapshot.dataRequests.length, 0);
    assert.equal(JSON.stringify(stageBody).includes("spam-link-xyz"), false);
    assert.equal(JSON.stringify(stageBody).includes("Wait check this link"), false);

    // SSR check for DEMO_STAGE_VIEWER and DEMO_MODERATOR
    const stageHtml = ReactDomServer.renderToStaticMarkup(
      React.createElement(SandboxView, {
        role: "DEMO_STAGE_VIEWER",
        capabilities: stageBody.capabilities,
        snapshot: stageBody.snapshot,
        loading: false,
        error: null,
        onSelectRole: () => undefined,
        onTriggerScenario: () => undefined,
        onDecideReview: () => undefined,
        onReset: () => undefined,
      }),
    );
    assert.equal(stageHtml.includes("人工审核队列（"), false);
    assert.equal(stageHtml.includes("已拦截内容（"), false);
    assert.equal(stageHtml.includes("观众评分与隐私例外状态"), false);
    assert.ok(stageHtml.includes("舞台 / 叠加层已批准输出"));

    // DEMO_PRIVACY_AUDITOR has logs.read + privacy.delete (not review.decide): blockedItems originalText must be null
    const audStateRes = await app.inject({
      method: "GET",
      url: "/sandbox-api/state",
      headers: { "x-demo-role": "DEMO_PRIVACY_AUDITOR" },
    });
    const audBody = audStateRes.json() as {
      snapshot: { blockedItems: Array<{ originalText: string | null }>; reviewQueue: unknown[]; changeLogs: unknown[] };
    };
    assert.equal(audBody.snapshot.reviewQueue.length, 0);
    assert.ok(audBody.snapshot.blockedItems.length >= 1);
    assert.equal(audBody.snapshot.blockedItems[0]?.originalText, null);
    assert.ok(audBody.snapshot.changeLogs.length >= 1);

    // DEMO_PRIVACY_AUDITOR can execute privacy-delete-and-except via /sandbox-api/scenarios -> 200
    const audDelRes = await app.inject({
      method: "POST",
      url: "/sandbox-api/scenarios",
      headers: { "x-demo-role": "DEMO_PRIVACY_AUDITOR" },
      payload: { scenario: "privacy-delete-and-except", subjectKey: "demo-viewer-alice" },
    });
    assert.equal(audDelRes.statusCode, 200);
    const aliceAfter = (audDelRes.json() as { snapshot: { subjects: Array<{ subjectKey: string; hasException: boolean; currentScore: number }> } })
      .snapshot.subjects.find((s) => s.subjectKey === "demo-viewer-alice");
    assert.equal(aliceAfter?.hasException, true);
    assert.equal(aliceAfter?.currentScore, 0);

    checks.push({
      id: "P2_b16_privacy_capability_gate_and_role_redaction_verified",
      passed: true,
      details: {
        forbiddenStatuses,
        stageApprovedCount: stageBody.snapshot.approvedStage.length,
        auditorBlockedOriginalText: audBody.snapshot.blockedItems[0]?.originalText,
        auditorPrivacyDeleteStatus: audDelRes.statusCode,
      },
    });
  } finally {
    await app.close();
    db.close();
    removeDirectory(dir);
  }
}

// ============================================================================
// P3: N17a, N17b & Portable Path Audit Across All S025 Files
// ============================================================================
{
  const scenariosSrc = fs.readFileSync(path.join(repoRoot, "apps/server/src/demo/scenarios/index.ts"), "utf8");
  const removedAtChecks = scenariosSrc.match(/isNull\(scoreExceptions\.removedAt\)/g) ?? [];
  assert.equal(removedAtChecks.length, 2);

  const s025Files = [
    "apps/server/src/sandbox-main.ts",
    "apps/server/src/demo/routes.ts",
    "apps/server/src/demo/scenarios/index.ts",
    "apps/server/src/demo/demo-roles.ts",
    "apps/server/src/demo/sandbox-guard.ts",
    "apps/server/src/demo/synthetic-source.ts",
    "apps/server/src/demo/reset.ts",
    "apps/web/src/pages/sandbox/SandboxPage.tsx",
    "apps/web/vite.config.ts",
    "deploy/sandbox/start-sandbox.mjs",
    "deploy/sandbox/README.md",
    ".kiro/specs/voxward-s025-sandbox/design.md",
    ".kiro/specs/voxward-s025-sandbox/tasks.md",
    ".kiro/specs/voxward-s025-sandbox/evidence/self-check.md",
  ];

  const badScheme = "file:" + "///";
  const badHome = "/" + "home" + "/";
  const badWt = "." + "worktrees";
  const badTmp = "/" + "tmp" + "/";
  const violations: string[] = [];

  for (const rel of s025Files) {
    const raw = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    const txt = raw.replace(/<!-- EINZBERN-SPEC:MANAGED-START -->[\s\S]*?<!-- EINZBERN-SPEC:MANAGED-END -->/g, "");
    if (txt.includes(badScheme) || txt.includes(badHome) || txt.includes(badWt) || txt.includes(badTmp)) {
      violations.push(rel);
    }
  }
  assert.equal(violations.length, 0);

  checks.push({
    id: "P3_n17a_n17b_and_portable_paths_verified",
    passed: true,
    details: { removedAtChecksCount: removedAtChecks.length, filesAudited: s025Files.length, violationsCount: violations.length },
  });
}

const summary = {
  allProbesCompleted: checks.every((c) => c.passed),
  checkCount: checks.length,
  checks,
};
fs.writeFileSync(outJsonPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ allProbesCompleted: summary.allProbesCompleted, checkCount: summary.checkCount }));
