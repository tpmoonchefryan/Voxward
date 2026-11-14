import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";
import { serverConfigSchema } from "../../../src/config/schema.js";
import { openDatabase, type VoxwardDatabase } from "../../../src/db/client.js";
import { runMigrations } from "../../../src/db/migrate.js";
import { assertSandboxStartupSafe, SandboxGuardError } from "../../../src/demo/sandbox-guard.js";
import { buildRegistry } from "../../../src/modules/registry.js";

function setupDb(dirs: string[]): VoxwardDatabase {
  const dir = mkdtempSync(join(tmpdir(), "voxward-sandbox-iso-"));
  dirs.push(dir);
  const db = openDatabase({ filePath: join(dir, "sandbox.sqlite3") });
  runMigrations(db);
  return db;
}

describe("VOXWARD-SUB-047: sandbox fail-closed isolation and limited demo roles", () => {
  const dbs: VoxwardDatabase[] = [];
  const dirs: string[] = [];

  afterEach(() => {
    while (dbs.length > 0) {
      dbs.pop()?.close();
    }
    while (dirs.length > 0) {
      const dir = dirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses sandbox startup when production OAuth secrets, real YouTube tokens, or non-sandbox DB paths are present", () => {
    expect(() =>
      assertSandboxStartupSafe(
        { enabled: true, env: { GOOGLE_CLIENT_SECRET: "real-secret" } },
        ":memory:",
      ),
    ).toThrowError(SandboxGuardError);

    expect(() =>
      assertSandboxStartupSafe(
        { enabled: true, env: { YOUTUBE_REFRESH_TOKEN: "1//real-token" } },
        ":memory:",
      ),
    ).toThrowError(SandboxGuardError);

    expect(() =>
      assertSandboxStartupSafe(
        { enabled: true, env: {} },
        "/var/lib/voxward/production.sqlite3",
      ),
    ).toThrowError(SandboxGuardError);

    expect(() =>
      assertSandboxStartupSafe(
        { enabled: true, env: {} },
        "data/voxward.sqlite3",
      ),
    ).toThrowError(SandboxGuardError);
  });

  it("does not expose /sandbox-api/* on default buildApp without sandbox opt-in", async () => {
    const db = setupDb(dirs);
    dbs.push(db);
    const app = buildApp({
      modules: buildRegistry(serverConfigSchema.parse({ adapters: "synthetic" })),
      logger: false,
      database: db,
    });

    const resState = await app.inject({ method: "GET", url: "/sandbox-api/state" });
    expect(resState.statusCode).toBe(404);

    const resScenario = await app.inject({
      method: "POST",
      url: "/sandbox-api/scenarios",
      payload: { scenario: "normal-scoring" },
    });
    expect(resScenario.statusCode).toBe(404);

    await app.close();
  });

  it("forbids CHANNEL_OWNER issuance, blocks demo tokens on production routes, and enforces limited demo capabilities", async () => {
    const db = setupDb(dirs);
    dbs.push(db);
    const app = buildApp({
      modules: buildRegistry(serverConfigSchema.parse({ adapters: "synthetic" })),
      logger: false,
      database: db,
      sandbox: { enabled: true, env: {} },
    });

    const ownerAttempt = await app.inject({
      method: "POST",
      url: "/sandbox-api/session",
      payload: { role: "CHANNEL_OWNER" },
    });
    expect(ownerAttempt.statusCode).toBe(403);

    const demoSessionRes = await app.inject({
      method: "POST",
      url: "/sandbox-api/session",
      payload: { role: "DEMO_STAGE_VIEWER" },
    });
    expect(demoSessionRes.statusCode).toBe(200);
    const sessionBody = demoSessionRes.json() as { token: string; role: string; syntheticOnly: boolean };
    expect(sessionBody.syntheticOnly).toBe(true);
    expect(sessionBody.role).toBe("DEMO_STAGE_VIEWER");

    // Demo token must be rejected on production routes
    const prodDock = await app.inject({
      method: "GET",
      url: "/channels/sandbox-ch-01/dock",
      headers: { authorization: `Bearer ${sessionBody.token}` },
    });
    expect(prodDock.statusCode).toBe(401);

    const prodData = await app.inject({
      method: "GET",
      url: "/channels/sandbox-ch-01/data/capabilities",
      headers: { cookie: `vw_session=${sessionBody.token}` },
    });
    expect(prodData.statusCode).toBe(401);

    const prodAuth = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: { cookie: `vw_session=${sessionBody.token}` },
    });
    expect(prodAuth.statusCode).toBe(401);

    // Limited demo role cannot invoke privileged sandbox actions
    const viewerPrivacy = await app.inject({
      method: "POST",
      url: "/sandbox-api/privacy",
      headers: { authorization: `Bearer ${sessionBody.token}` },
      payload: { mode: "DELETE_AND_EXCEPT", subjectKey: "demo-viewer-alice" },
    });
    expect(viewerPrivacy.statusCode).toBe(403);

    const viewerReset = await app.inject({
      method: "POST",
      url: "/sandbox-api/reset",
      headers: { "x-demo-role": "DEMO_STAGE_VIEWER" },
    });
    expect(viewerReset.statusCode).toBe(403);

    await app.close();
  });
});
