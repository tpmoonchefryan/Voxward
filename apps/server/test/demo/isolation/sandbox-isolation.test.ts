import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { buildApp } from "../../../src/app.js";
import { createAccount } from "../../../src/auth/login.js";
import { grantMembership } from "../../../src/auth/members.js";
import { issueNativeGrant } from "../../../src/auth/output-grants.js";
import { createSession } from "../../../src/auth/session.js";
import { serverConfigSchema } from "../../../src/config/schema.js";
import { openDatabase, type VoxwardDatabase } from "../../../src/db/client.js";
import { runMigrations } from "../../../src/db/migrate.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { assertSandboxStartupSafe, SandboxGuardError } from "../../../src/demo/sandbox-guard.js";
import { SANDBOX_CHANNEL_ID } from "../../../src/demo/synthetic-source.js";
import { BLIVECHAT_CMD, BLIVECHAT_OUTPUT_PATH, BLIVECHAT_PROTOCOL_VERSION } from "../../../src/modules/output/index.js";
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

  it("dispatches a synthetic Super Chat through the app's published rules, SC settings, Dock and both output sockets", async () => {
    const database = setupDb(dirs);
    dbs.push(database);
    const app = buildApp({
      modules: buildRegistry(serverConfigSchema.parse({ adapters: "synthetic" })),
      logger: false, database, sandbox: { enabled: true, env: {} }, nativeOutput: { passIntervalMs: 20 },
    });
    const sockets: WebSocket[] = [];
    try {
      const now = new Date();
      const account = await createAccount(database, { loginName: "sc-test", displayName: "SC Test", password: "sc-test-password", now });
      const { session, credential } = runShortTransaction(database, (tx) => {
        grantMembership(tx, { channelId: SANDBOX_CHANNEL_ID, accountId: account.accountId, role: "CHANNEL_OWNER", logAccess: true, now });
        return {
          session: createSession(tx, { accountId: account.accountId, now }),
          credential: issueNativeGrant(tx, { channelId: SANDBOX_CHANNEL_ID, nowIso: now.toISOString() }).credential,
        };
      });
      const channel = `/channels/${SANDBOX_CHANNEL_ID}`;
      const headers = { cookie: `vw_session=${session.token}`, "x-csrf-token": session.csrfToken };
      const termSave = await app.inject({
        method: "PUT", url: `${channel}/term-entries`, headers,
        payload: { entries: [{ id: "ko-rule", listKind: "BLACKLIST", term: "감사합니다", categoryCode: "spam",
          matchKind: "NORMALIZED", enabled: true, language: "ja" }] },
      });
      expect(termSave.statusCode, termSave.body).toBe(200);
      const modelSave = await app.inject({
        method: "PUT", url: `${channel}/model-settings`, headers,
        payload: { realtimeModeration: null, review: null, scTranslation: { modelId: "synthetic-demo", reasoning: null },
          scTranslationEnabled: true, scLanguages: { sourceLanguage: "auto", targetLanguages: ["fr", "ja"] } },
      });
      expect(modelSave.statusCode, modelSave.body).toBe(200);
      const ingest = (language: string) => app.inject({
        method: "POST", url: "/sandbox-api/events", headers: { "x-demo-role": "DEMO_STREAMER" },
        payload: { subjectKey: "sc-viewer", text: "감사합니다", isPaid: true, language, amountDisplay: "€25.00" },
      });
      const review = await ingest("ja");
      expect(review.statusCode, review.body).toBe(200);
      expect(review.json().result.classification).toBe("PENDING_REVIEW");

      await app.listen({ host: "127.0.0.1", port: 0 });
      const port = (app.server.address() as AddressInfo).port;
      const nativeFrames: unknown[] = [];
      const bliveFrames: unknown[] = [];
      await Promise.all([
        { path: "/output/v1/room", protocol: "vw-output.v1", frames: nativeFrames },
        { path: BLIVECHAT_OUTPUT_PATH, protocol: BLIVECHAT_PROTOCOL_VERSION, frames: bliveFrames },
      ].map(({ path, protocol, frames }) => new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, [protocol, `vw-cred.${credential}`]);
        sockets.push(socket);
        socket.on("message", (message) => frames.push(JSON.parse(message.toString())));
        socket.once("open", () => {
          if (protocol === BLIVECHAT_PROTOCOL_VERSION) {
            socket.send(JSON.stringify({ cmd: BLIVECHAT_CMD.JOIN_ROOM, data: { roomId: SANDBOX_CHANNEL_ID } }));
            socket.send(JSON.stringify({ cmd: BLIVECHAT_CMD.HEARTBEAT }));
          }
          resolve();
        });
        socket.once("error", reject);
      })));
      await expect.poll(() => bliveFrames).toContainEqual(expect.objectContaining({ cmd: BLIVECHAT_CMD.HEARTBEAT_REPLY }));

      const accepted = await ingest("ko");
      expect(accepted.statusCode, accepted.body).toBe(200);
      expect(accepted.json().result.classification).toBe("ALLOW_MEANINGFUL");
      const dock = await app.inject({ url: `${channel}/dock`, headers });
      expect(dock.statusCode, dock.body).toBe(200);
      const primary = "[synthetic translation: fr]";
      expect(dock.json().feed.approvedSc).toEqual([expect.objectContaining({
        correlationId: accepted.json().result.correlationId,
        amountDisplay: "€25.00",
        payment: { amountMicros: 25_000_000, currency: "EUR" },
        sourceLanguage: "ko",
        translations: [
          expect.objectContaining({ targetLanguage: "fr", translatedText: primary }),
          expect.objectContaining({ targetLanguage: "ja", translatedText: "[synthetic translation: ja]" }),
        ],
      })]);
      await expect.poll(() => nativeFrames).toContainEqual(expect.objectContaining({
        type: "DELIVER", display: expect.objectContaining({ label: null, amountDisplay: "€25.00", translation: primary,
          payment: { amountMicros: 25_000_000, currency: "EUR" } }),
      }));
      await expect.poll(() => bliveFrames).toContainEqual(expect.objectContaining({
        cmd: BLIVECHAT_CMD.ADD_TEXT, data: expect.objectContaining({ translation: primary, authorName: "" }),
      }));

      const toggle = await app.inject({ method: "PUT", url: `${channel}/sc-translation`, headers, payload: { enabled: false } });
      expect(toggle.statusCode, toggle.body).toBe(200);
      const untranslated = await ingest("ko");
      expect(untranslated.json().result.classification).toBe("ALLOW_MEANINGFUL");
      const untranslatedDock = await app.inject({ url: `${channel}/dock`, headers });
      expect(untranslatedDock.json().feed.approvedSc).toContainEqual(expect.objectContaining({
        correlationId: untranslated.json().result.correlationId, translation: null,
      }));
    } finally {
      sockets.forEach((socket) => socket.terminate());
      await app.close();
    }
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

  it("enforces privacy.delete on /sandbox-api/scenarios and redacts snapshots by role capability (B16)", async () => {
    const db = setupDb(dirs);
    dbs.push(db);
    const app = buildApp({
      modules: buildRegistry(serverConfigSchema.parse({ adapters: "synthetic" })),
      logger: false,
      database: db,
      sandbox: { enabled: true, env: {} },
    });

    // Seed spam/toxicity, manual review, and approved stage output as DEMO_STREAMER
    await app.inject({
      method: "POST",
      url: "/sandbox-api/scenarios",
      headers: { "x-demo-role": "DEMO_STREAMER" },
      payload: { scenario: "spam-toxicity-block" },
    });
    await app.inject({
      method: "POST",
      url: "/sandbox-api/scenarios",
      headers: { "x-demo-role": "DEMO_STREAMER" },
      payload: { scenario: "manual-review" },
    });
    await app.inject({
      method: "POST",
      url: "/sandbox-api/scenarios",
      headers: { "x-demo-role": "DEMO_STREAMER" },
      payload: { scenario: "superchat-translation" },
    });

    // DEMO_MODERATOR, DEMO_STREAMER, DEMO_STAGE_VIEWER cannot run privacy-delete scenarios via /sandbox-api/scenarios
    for (const role of ["DEMO_MODERATOR", "DEMO_STREAMER", "DEMO_STAGE_VIEWER"] as const) {
      for (const scenario of ["privacy-delete", "privacy-delete-and-except"] as const) {
        const res = await app.inject({
          method: "POST",
          url: "/sandbox-api/scenarios",
          headers: { "x-demo-role": role },
          payload: { scenario, subjectKey: "demo-viewer-alice" },
        });
        expect(res.statusCode).toBe(403);
      }
    }

    // DEMO_STAGE_VIEWER gets zero reviewQueue, zero blockedItems/originalText, zero subjects, zero logs, but keeps approvedStage
    const stageStateRes = await app.inject({
      method: "GET",
      url: "/sandbox-api/state",
      headers: { "x-demo-role": "DEMO_STAGE_VIEWER" },
    });
    expect(stageStateRes.statusCode).toBe(200);
    const stageBody = stageStateRes.json() as {
      snapshot: {
        subjects: unknown[];
        reviewQueue: unknown[];
        blockedItems: unknown[];
        approvedStage: unknown[];
        changeLogs: unknown[];
        technicalLogs: unknown[];
        dataRequests: unknown[];
        cacheEntryCount: number;
      };
    };
    expect(stageBody.snapshot.reviewQueue).toEqual([]);
    expect(stageBody.snapshot.blockedItems).toEqual([]);
    expect(stageBody.snapshot.subjects).toEqual([]);
    expect(stageBody.snapshot.changeLogs).toEqual([]);
    expect(stageBody.snapshot.technicalLogs).toEqual([]);
    expect(stageBody.snapshot.dataRequests).toEqual([]);
    expect(stageBody.snapshot.cacheEntryCount).toBe(0);
    expect(stageBody.snapshot.approvedStage.length).toBeGreaterThan(0);

    // DEMO_PRIVACY_AUDITOR can run privacy-delete-and-except via /sandbox-api/scenarios, and sees redacted blockedItems (no originalText) & no reviewQueue
    const auditorScenarioRes = await app.inject({
      method: "POST",
      url: "/sandbox-api/scenarios",
      headers: { "x-demo-role": "DEMO_PRIVACY_AUDITOR" },
      payload: { scenario: "privacy-delete-and-except", subjectKey: "demo-viewer-alice" },
    });
    expect(auditorScenarioRes.statusCode).toBe(200);
    const auditorBody = auditorScenarioRes.json() as {
      snapshot: {
        reviewQueue: unknown[];
        blockedItems: { originalText: string | null }[];
        dataRequests: unknown[];
      };
    };
    expect(auditorBody.snapshot.reviewQueue).toEqual([]);
    for (const item of auditorBody.snapshot.blockedItems) {
      expect(item.originalText).toBeNull();
    }
    expect(auditorBody.snapshot.dataRequests.length).toBeGreaterThan(0);

    await app.close();
  });
});
