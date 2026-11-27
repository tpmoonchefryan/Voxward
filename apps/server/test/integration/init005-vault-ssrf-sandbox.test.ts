import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { CONTRACT_VERSION, validateModerationBatchResult, validateScBatchResult, validateScMultilingualBatchResult } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAnthropicCompatInferenceProvider } from "../../src/adapters/anthropic-compat/provider.js";
import { createOpenAiCompatInferenceProvider } from "../../src/adapters/openai-compat/provider.js";
import { buildApp } from "../../src/app.js";
import { channelPanelRoutes, migrateLegacyChannelAdapters } from "../../src/auth/channel-panel-routes.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import { createSession } from "../../src/auth/session.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import {
  appendIntegrationLog,
  readChannelAdapters,
  readIntegrationLogs,
  writeChannelAdapters,
} from "../../src/db/channel-settings-store.js";
import { channels, deploymentSettings } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { assertSandboxStartupSafe, SandboxGuardError } from "../../src/demo/sandbox-guard.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { assertSafeOutboundUrl, OutboundUrlError, safeOutboundFetch } from "../../src/security/outbound-url.js";
import { createPersistentCredentialVault, deriveVaultKey, isSecretRef } from "../../src/security/persistent-vault.js";
import { createSqliteVaultBackingStore } from "../../src/db/vault-store.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date();
const PASSWORD = "test-password-1234";
const CH1 = "ch-init005-1";

describe("INIT-005 Vault, Outbound SSRF, Sandbox & Prompt Contracts (STORY-055..058, 067)", () => {
  let dir: string;
  let db: VoxwardDatabase;
  let app: FastifyInstance | undefined;

  async function signIn(loginName: string, displayName: string) {
    const account = await createAccount(db, { loginName, displayName, password: PASSWORD, now: NOW });
    const session = runShortTransaction(db, (tx) => createSession(tx, { accountId: account.accountId, now: NOW }));
    return {
      accountId: account.accountId,
      cookie: `vw_session=${session.token}`,
      csrf: session.csrfToken,
    };
  }

  beforeEach(() => {
    dir = scratchDirectory("init005-");
    db = migratedDatabase(dir);
    runShortTransaction(db, (tx) => {
      tx.insert(channels)
        .values({ id: CH1, platform: "youtube", platformChannelRef: "yt-5", displayName: "Room Five", createdAt: T0, updatedAt: T0 })
        .run();
    });
  });

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
    db.close();
    removeDirectory(dir);
  });

  it("STORY-055: refuses implicit default Vault keys, rejects plaintext/client secretref writes without configured vault, and idempotently migrates legacy rows when configured", async () => {
    // 1) Legacy plaintext row in DB
    writeChannelAdapters(db, CH1, [
      {
        id: "adp-legacy-1",
        category: "AI_PROVIDER",
        driverId: "openai-compat",
        displayName: "Legacy OpenAI",
        enabled: true,
        config: { baseEndpoint: "https://api.example.test/v1", apiKey: "sk-legacy-plaintext-123456" },
        models: [],
        lastStatus: "saved",
        updatedAt: T0,
      },
    ]);

    const owner = await signIn("owner55", "Owner 55");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
    });

    // 2) Full buildApp WITHOUT vaultKey and WITHOUT VOXWARD_VAULT_KEY: must NOT derive a predictable key from DB path
    const prevEnvVaultKey = process.env.VOXWARD_VAULT_KEY;
    delete process.env.VOXWARD_VAULT_KEY;
    const unconfiguredApp = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
    });
    await unconfiguredApp.ready();
    try {
      const vaultStorePre = createSqliteVaultBackingStore(db);
      expect(vaultStorePre.list()).toHaveLength(0);
      const legacyAfterNoVaultBoot = readChannelAdapters(db, CH1);
      expect(legacyAfterNoVaultBoot[0]?.config.apiKey).toBe("sk-legacy-plaintext-123456");

      const writeWithoutVault = await unconfiguredApp.inject({
        method: "POST",
        url: `/channels/${CH1}/adapters`,
        headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
        payload: {
          category: "AI_PROVIDER",
          driverId: "openai-compat",
          displayName: "Must Refuse Without Vault",
          enabled: true,
          config: { baseEndpoint: "https://api.example.test/v1", apiKey: "sk-must-not-write" },
        },
      });
      expect(writeWithoutVault.statusCode).toBe(503);
      expect(writeWithoutVault.json()).toEqual({ error: "VAULT_UNAVAILABLE" });
      expect(vaultStorePre.list()).toHaveLength(0);
    } finally {
      await unconfiguredApp.close();
      if (prevEnvVaultKey !== undefined) process.env.VOXWARD_VAULT_KEY = prevEnvVaultKey;
    }

    // Short (< 16 chars) passphrase seed must also be rejected
    expect(() => deriveVaultKey("too-short")).toThrow(/16/);

    // 3) Full buildApp WITH explicit vaultKey migrates legacy plaintext row idempotently
    app = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
      vaultKey: deriveVaultKey("test-vault-seed-init005"),
    });
    await app.ready();

    // Client-supplied secretref: values are refused (prevents cross-adapter ref injection)
    const clientRefRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "openai-compat",
        displayName: "Forged Ref",
        enabled: true,
        config: { baseEndpoint: "https://api.example.test/v1", apiKey: "secretref:0000111122223333" },
      },
    });
    expect(clientRefRes.statusCode).toBe(400);
    expect(clientRefRes.json()).toEqual({ error: "INVALID_REQUEST" });

    // Stored record now holds secretref: + __secretBoundEndpoint, zero plaintext
    const storedAfterBoot = readChannelAdapters(db, CH1);
    expect(String(storedAfterBoot[0]?.config.apiKey)).toMatch(/^secretref:/);
    expect(JSON.stringify(storedAfterBoot)).not.toContain("sk-legacy-plaintext-123456");

    // Re-running migration is a strict no-op (same ref, zero new vault rows)
    const vaultStore = createSqliteVaultBackingStore(db);
    const vaultCountBefore = vaultStore.list().length;
    const vault = createPersistentCredentialVault({ key: deriveVaultKey("test-vault-seed-init005"), store: vaultStore });
    const migratedSecondPass = migrateLegacyChannelAdapters(db, {
      seal: (purpose, plaintext) => vault.put(purpose, plaintext).ref,
      reveal: (ref, purpose) => vault.reveal(ref, purpose),
      remove: (ref, purpose) => {
        vault.remove(ref, purpose);
      },
      isSecretRef,
    });
    expect(migratedSecondPass).toBe(0);
    expect(vaultStore.list().length).toBe(vaultCountBefore);

    // HTTP GET returns uniform constant "••••••" without exposing prefix/suffix characters
    const listRes = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie },
    });
    expect(listRes.statusCode).toBe(200);
    expect((listRes.json() as { adapters: Array<{ config: { apiKey: string } }> }).adapters[0]?.config.apiKey).toBe("••••••");
  });

  it("STORY-057: sanitizes custom URL path segments, query values, and legacy/new integration logs onto safe diagnostic fields", async () => {
    // Direct legacy row with embedded credentials in userinfo, CUSTOM URL PATH SEGMENT, arbitrary query param, and fragment
    runShortTransaction(db, (tx) => {
      tx.insert(deploymentSettings)
        .values({
          key: `channel:${CH1}:integration-logs`,
          valueJson: JSON.stringify([
            {
              id: "legacy-log-1",
              correlationId: "corr-legacy",
              adapterId: "adp-1",
              adapterName: "Custom Gateway",
              providerKind: "AI_PROVIDER",
              method: "GET",
              url: "https://user:topsecret@api.example.test/tenant-path-secret-9988/v1/models?key=AIzaSyDummySecretValue1234567890&customParam=PathQuerySecretVal#access_token=ya29.supersecretvalue12345",
              statusCode: 200,
              latencyMs: 12,
              requestHeaders: { authorization: "Bearer raw", "x-note": "Bearer sk-abc123456789012" },
              responseHeaders: {},
              rawRequestBody: "url=https://a:b@host.test/secret-hook-seg/cb?token=secret123",
              rawResponseBody: "token=sk-live9876543210987654",
              occurredAt: T0,
            },
          ]),
          updatedAt: T0,
        })
        .run();
    });

    const readSanitized = readIntegrationLogs(db, CH1);
    expect(readSanitized).toHaveLength(1);
    expect(readSanitized[0]?.url).toBe("https://api.example.test/[REDACTED]/v1/models?key=[REDACTED]&customParam=[REDACTED]");
    expect(readSanitized[0]?.url).not.toContain("topsecret");
    expect(readSanitized[0]?.url).not.toContain("tenant-path-secret-9988");
    expect(readSanitized[0]?.url).not.toContain("PathQuerySecretVal");
    expect(readSanitized[0]?.url).not.toContain("AIzaSyDummySecretValue");
    expect(readSanitized[0]?.url).not.toContain("ya29.supersecretvalue");
    expect(readSanitized[0]?.rawRequestBody).not.toContain("secret-hook-seg");
    expect(readSanitized[0]?.rawRequestBody).not.toContain("secret123");
    expect(readSanitized[0]?.rawResponseBody).not.toContain("sk-live9876543210987654");

    // Booting app migrates legacy integration logs in deployment_settings on disk and scrubs new adapter actions
    app = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
      vaultKey: deriveVaultKey("test-vault-seed-init005-57"),
      adapterActionFetch: async (input) => {
        const u = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        return new Response(`Upstream error for ${u}`, { status: 401 });
      },
    });
    await app.ready();

    const migratedRow = db.orm.select().from(deploymentSettings).all().find((r) => r.key === `channel:${CH1}:integration-logs`);
    expect(migratedRow?.valueJson).not.toContain("tenant-path-secret-9988");
    expect(migratedRow?.valueJson).not.toContain("PathQuerySecretVal");

    const owner = await signIn("owner57", "Owner 57");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
    });

    const createRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "openai-compat",
        displayName: "Gateway OpenAI",
        enabled: true,
        config: { baseEndpoint: "https://gateway.example.test/custom-secret-route-777/v1", apiKey: "sk-custom-path-key-1234" },
      },
    });
    expect(createRes.statusCode).toBe(201);
    const adpId = (createRes.json() as { adapter: { id: string } }).adapter.id;

    await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters/${adpId}/actions/fetch-models`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });

    const logsRes = await app.inject({
      method: "GET",
      url: `/internal/channels/${CH1}/logs/integration`,
      headers: { cookie: owner.cookie },
    });
    expect(logsRes.statusCode).toBe(200);
    const items = (logsRes.json() as { items: Array<{ id: string; url: string; statusCode: number; correlationId: string; rawResponseBody: string | null }> }).items;
    expect(items[0]?.url).toBe("https://gateway.example.test/[REDACTED]/v1/models");
    expect(items[0]?.statusCode).toBe(401);
    expect(items[0]?.correlationId).toBeTruthy();
    expect(JSON.stringify(items)).not.toContain("custom-secret-route-777");
  });

  it("STORY-058: blocks symlinked/traversal DB paths and expanded production credentials in sandbox startup", () => {
    const symDir = mkdtempSync(join(tmpdir(), "vw-sym-sandbox-"));
    try {
      const targetProd = join(symDir, "prod-real.sqlite3");
      writeFileSync(targetProd, "");
      const linkPath = join(symDir, "sandbox-link.sqlite3");
      symlinkSync(targetProd, linkPath);

      expect(() => assertSandboxStartupSafe({ enabled: true, env: {} }, linkPath)).toThrowError(SandboxGuardError);
      expect(() =>
        assertSandboxStartupSafe({ enabled: true, env: { OPENAI_API_KEY: "sk-real-key" } }, ":memory:"),
      ).toThrowError(SandboxGuardError);
      expect(() =>
        assertSandboxStartupSafe({ enabled: true, env: { BWS_ACCESS_TOKEN: "bws-real" } }, ":memory:"),
      ).toThrowError(SandboxGuardError);
      expect(() =>
        assertSandboxStartupSafe({ enabled: true, env: { VOXWARD_VAULT_KEY: "real-vault-key" } }, ":memory:"),
      ).toThrowError(SandboxGuardError);
    } finally {
      rmSync(symDir, { recursive: true, force: true });
    }
  });

  it("STORY-056: enforces adapter permissions, endpoint rebind protection, kiro-cli allowlist, and SSRF guards", async () => {
    const calls: string[] = [];
    const stubFetch: typeof fetch = async (input) => {
      calls.push(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    };

    app = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
      vaultKey: deriveVaultKey("test-vault-key-init005-s056"),
      adapterActionFetch: stubFetch,
    });
    await app.ready();

    const owner = await signIn("owner56", "Owner 56");
    const mod = await signIn("mod56", "Mod 56");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: mod.accountId, role: "MODERATOR", logAccess: false, now: NOW });
    });

    // Outbound SSRF check blocks private IPs, metadata, http, and DNS rebinding to internal IPs
    await expect(assertSafeOutboundUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrowError(OutboundUrlError);
    await expect(assertSafeOutboundUrl("https://127.0.0.1:8080/v1")).rejects.toThrowError(OutboundUrlError);
    await expect(
      assertSafeOutboundUrl("https://rebind.example.test/v1", {
        lookup: async () => [{ address: "10.0.0.5" }],
      }),
    ).rejects.toThrowError(OutboundUrlError);
    await expect(
      safeOutboundFetch("https://192.168.1.1/v1", { method: "GET" }, { fetchImpl: stubFetch }),
    ).rejects.toThrowError(OutboundUrlError);
    expect(calls).toHaveLength(0);

    // Moderator (no score.config) cannot create or probe AI_PROVIDER adapter
    const deniedCreate = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: mod.cookie, "x-csrf-token": mod.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "openai-compat",
        displayName: "Unauthorized",
        enabled: true,
        config: { baseEndpoint: "https://api.example.test/v1", apiKey: "sk-1234" },
      },
    });
    expect(deniedCreate.statusCode).toBe(403);

    // Private SSRF endpoint rejected at save time
    const ssrfSave = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "openai-compat",
        displayName: "SSRF Attempt",
        enabled: true,
        config: { baseEndpoint: "https://127.0.0.1/v1", apiKey: "sk-1234" },
      },
    });
    expect(ssrfSave.statusCode).toBe(400);

    // Valid AI adapter save -> changing baseEndpoint without re-supplying secret returns 400 CREDENTIAL_REBIND_REQUIRED
    const okSave = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "openai-compat",
        displayName: "Bound OpenAI",
        enabled: true,
        config: { baseEndpoint: "https://api.example.test/v1", apiKey: "sk-bound-secret-999" },
      },
    });
    expect(okSave.statusCode).toBe(201);
    const adpId = (okSave.json() as { adapter: { id: string } }).adapter.id;

    const rebindAttempt = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/adapters/${adpId}`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        displayName: "Bound OpenAI",
        enabled: true,
        config: { baseEndpoint: "https://evil.example.test/v1", apiKey: "••••••" },
      },
    });
    expect(rebindAttempt.statusCode).toBe(400);
    expect(rebindAttempt.json()).toEqual({ error: "CREDENTIAL_REBIND_REQUIRED" });

    // kiro-cli arbitrary command override rejected
    const kiroCreate = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "kiro-cli",
        displayName: "Evil Kiro",
        enabled: true,
        config: { command: "/bin/sh" },
      },
    });
    expect(kiroCreate.statusCode).toBe(201);
    const kiroId = (kiroCreate.json() as { adapter: { id: string } }).adapter.id;
    const kiroAction = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters/${kiroId}/actions/cli-self-check`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(kiroAction.statusCode).toBe(400);
    expect(kiroAction.json()).toMatchObject({ ok: false, summaryCode: "CLI_FAILED" });
  });

  it("STORY-067: aligns moderation & SC prompts with contracts, sends max_tokens, and parses <think>{}</think> responses", async () => {
    const capturedPrompts: string[] = [];
    const capturedBodies: Array<Record<string, unknown>> = [];
    let mode: "moderation" | "sc-v1" | "sc-v2" = "moderation";

    const stubFetch: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      capturedBodies.push(body);
      const msgs = body.messages as Array<{ content: string }>;
      capturedPrompts.push(msgs[0]!.content);

      const jsonBody =
        mode === "moderation"
          ? { items: [{ itemId: "i0", verdict: "BLOCK", reasonCodes: ["PHONETIC_EVASION"] }] }
          : mode === "sc-v1"
            ? {
                items: [
                  {
                    itemId: "i0",
                    verdict: "ALLOW_MEANINGFUL",
                    reasonCodes: ["NONE"],
                    translatedText: "谢谢打赏！",
                    slangNote: "",
                    replyCue: "感谢支持",
                  },
                ],
              }
            : {
                items: [
                  {
                    itemId: "i0",
                    verdict: "ALLOW_MEANINGFUL",
                    reasonCodes: ["NONE"],
                    sourceLanguage: "en",
                    translations: [{ language: "ja", translatedText: "ありがとう！", slangNote: "", replyCue: "お礼する" }],
                  },
                ],
              };

      // Simulate DeepSeek/Qwen unstripped <think>{fake}</think> prefix before actual JSON
      const content = `<think>Considering {"braces": true} before answering</think>\n${JSON.stringify(jsonBody)}`;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content } }],
          content: [{ type: "text", text: content }],
          usage: { prompt_tokens: 10, completion_tokens: 20, input_tokens: 10, output_tokens: 20 },
        }),
        { status: 200 },
      );
    };

    const oai = createOpenAiCompatInferenceProvider({
      baseUrl: "https://api.example.test/v1",
      apiKey: "sk-1234",
      model: "deepseek-r1",
      maxTokens: 1500,
      fetchImpl: stubFetch,
      validateOutput: async (output) => {
        const res = validateModerationBatchResult(output);
        return res.ok ? { ok: true, items: res.value.items } : { ok: false, errors: res.issues };
      },
    });
    const modRes = await oai.infer({
      contractVersion: CONTRACT_VERSION,
      batchId: "b-think-1",
      items: [{ correlationId: "c1", text: "evasion sample" }],
    });
    expect(modRes.items[0]?.reasonCodes).toEqual(["PHONETIC_EVASION"]);
    expect(capturedBodies[0]?.max_tokens).toBe(1500);
    expect(capturedPrompts[0]).toContain("PHONETIC_EVASION");
    expect(capturedPrompts[0]).toContain("OTHER_POLICY");

    mode = "sc-v1";
    const sc1 = await oai.inferScBatch({ items: [{ itemId: "i0", text: "Thanks!" }] }, { batchId: "sc1", modelId: "deepseek-r1" });
    expect(validateScBatchResult(sc1).ok).toBe(true);
    expect(capturedPrompts[1]).toContain("translatedText");
    expect(capturedPrompts[1]).not.toContain("acknowledgement");

    const ant = createAnthropicCompatInferenceProvider({
      baseUrl: "https://api.example.test/claude",
      apiKey: "sk-ant-1234",
      model: "claude-3-7-sonnet",
      maxTokens: 900,
      fetchImpl: stubFetch,
    });
    mode = "sc-v2";
    const sc2 = await ant.inferScBatch(
      { items: [{ itemId: "i0", text: "Thanks!" }], targetLanguages: ["ja"] },
      { batchId: "sc2", modelId: "claude-3-7-sonnet" },
    );
    expect(validateScMultilingualBatchResult(sc2).ok).toBe(true);
    expect(capturedBodies[2]?.max_tokens).toBe(900);
  });
});
