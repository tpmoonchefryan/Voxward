import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAnthropicCompatInferenceProvider } from "../../src/adapters/anthropic-compat/provider.js";
import { createOpenAiCompatInferenceProvider } from "../../src/adapters/openai-compat/provider.js";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import { createSession } from "../../src/auth/session.js";
import { loadConfig } from "../../src/config/load.js";
import { createAuditLogPort } from "../../src/db/audit-log.js";
import { createPersistentCandidateStore } from "../../src/db/candidate-store.js";
import { readDockAndModerationFeed } from "../../src/db/channel-panel-read.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { ChannelEventStore, SubjectStore, TaskStore } from "../../src/db/repository.js";
import { channels, deploymentSettings, verdicts } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { createReviewRunner } from "../../src/modules/moderation-engine/review/runner.js";
import type { ReviewCandidate, ReviewStorePort } from "../../src/modules/moderation-engine/review/ports.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { createTaskCoordinator } from "../../src/modules/task-coordinator/index.js";
import { deriveVaultKey } from "../../src/security/persistent-vault.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const CH = "ch-p1-1";
const NOW = new Date();
const PASSWORD = "p1-test-password-999";

describe("EPIC-014 (VW3-R-004..007): production wiring, vault sealing, RBAC enforcement & persistence", () => {
  let dir: string;
  let db: VoxwardDatabase;
  let app: FastifyInstance | undefined;

  async function signIn(loginName: string, displayName: string) {
    const account = await createAccount(db, { loginName, displayName, password: PASSWORD, now: NOW });
    const session = runShortTransaction(db, (tx) => createSession(tx, { accountId: account.accountId, now: NOW }));
    return { accountId: account.accountId, cookie: `vw_session=${session.token}`, csrf: session.csrfToken };
  }

  beforeEach(() => {
    dir = scratchDirectory("p1-runtime-");
    db = migratedDatabase(dir);
    runShortTransaction(db, (tx) => {
      tx.insert(channels)
        .values({ id: CH, platform: "youtube", platformChannelRef: "yt-p1", displayName: "P1 Room", createdAt: T0, updatedAt: T0 })
        .run();
      SubjectStore.create(tx, { id: "sub-p1", channelId: CH, platformSubjectKey: "yt-u-p1", createdAt: T0 });
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

  it("VW3-R-004: accepts VOXWARD_ADAPTERS=production and wires all 6 core modules without MODULE_NOT_IMPLEMENTED", async () => {
    const cfg = loadConfig({
      env: { VOXWARD_ADAPTERS: "production", VOXWARD_DATABASE_FILE: ":memory:" },
      readFile: () => "",
    });
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;

    const registry = buildRegistry(cfg.config, {}, { database: db });
    expect(registry.inferenceProvider.describe().providerName).toBe("kiro-cli");

    const event: ChannelEvent = {
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: CH,
      platformMessageId: "pm-1",
      platformOrder: 1,
      correlationId: "corr-mod-1",
      receivedAt: T0,
      sender: { contractVersion: CONTRACT_VERSION, senderRef: "yt-u-p1" },
      body: "hello world",
    };
    const modRes = await registry.moderationEngine.moderate(event);
    expect(["FAST_PASS", "REVIEW", "BLOCK"]).toContain(modRes.route);

    const scoreRes = await registry.scoringEngine.applyVerdict(event, {
      contractVersion: CONTRACT_VERSION,
      classification: "ALLOW_MEANINGFUL",
      downstream: "ALLOW",
      penaltyHits: [],
    });
    expect(scoreRes.contractVersion).toBe(CONTRACT_VERSION);

    const batch = await registry.platformSource.fetchAfter(null, 10);
    expect(batch.events).toEqual([]);

    await expect(
      registry.dataLifecycleService.requestDeletion({
        contractVersion: CONTRACT_VERSION,
        subjectRef: "sub-p1",
        requestedAt: T0,
      }),
    ).resolves.toBeUndefined();
  });

  it("VW3-R-004: openai-compat and anthropic-compat adapters support custom endpoints, moderation JSON, and SC translation", async () => {
    const calls: Array<{ url: string; headers: Record<string, string> }> = [];
    const stubFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url, headers });
      if (url.endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: "test-model-1" }] }), { status: 200 });
      }
      if (url.endsWith("/chat/completions")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    items: [{ itemId: "i0", verdict: "ALLOW_MEANINGFUL", reasonCodes: [] }],
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/v1/messages")) {
        return new Response(
          JSON.stringify({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  items: [{ itemId: "i0", verdict: "BLOCK", reasonCodes: ["HARASSMENT"] }],
                }),
              },
            ],
            usage: { input_tokens: 12, output_tokens: 6 },
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    };

    const openai = createOpenAiCompatInferenceProvider({
      baseUrl: "https://custom-openai.example/v1/",
      apiKey: "sk-test-openai",
      model: "test-model-1",
      fetchImpl: stubFetch,
    });
    const probeOai = await openai.fetchModels();
    expect(probeOai.ok).toBe(true);
    const oaiRes = await openai.infer({
      contractVersion: CONTRACT_VERSION,
      batchId: "b-oai-1",
      items: [{ correlationId: "c1", text: "nice stream" }],
    });
    expect(oaiRes.items[0]?.classification).toBe("ALLOW_MEANINGFUL");

    const anthropic = createAnthropicCompatInferenceProvider({
      baseUrl: "https://thirdparty-anthropic.example/claude",
      apiKey: "sk-ant-test",
      model: "claude-sonnet-4",
      fetchImpl: stubFetch,
    });
    const antRes = await anthropic.infer({
      contractVersion: CONTRACT_VERSION,
      batchId: "b-ant-1",
      items: [{ correlationId: "c2", text: "bad spam" }],
    });
    expect(antRes.items[0]?.classification).toBe("BLOCK");
    expect(calls.some((c) => c.url === "https://thirdparty-anthropic.example/claude/v1/messages")).toBe(true);
  });

  it("VW3-R-005: seals adapter secrets in CredentialVault (no plaintext in deployment_settings) and propagates real action errors", async () => {
    const failingFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ error: "invalid_api_key" }), { status: 401 });
    app = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
      vaultKey: deriveVaultKey("test-vault-key-p1-s005"),
      adapterActionFetch: failingFetch,
    });
    await app.ready();

    const owner = await signIn("p1-owner", "Owner");
    runShortTransaction(db, (tx) => grantMembership(tx, { channelId: CH, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW }));

    const createRes = await app.inject({
      method: "POST",
      url: `/channels/${CH}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "anthropic-compat",
        displayName: "RightCode Claude",
        enabled: true,
        config: { baseEndpoint: "https://rightcode.example", apiKey: "sk-ant-raw-plaintext-9999" },
      },
    });
    expect(createRes.statusCode).toBe(201);
    const adapterId = (createRes.json() as { adapter: { id: string } }).adapter.id;

    // Verify ZERO plaintext secret exists anywhere in deployment_settings!
    const allSettings = db.orm.select().from(deploymentSettings).all();
    const rawDump = JSON.stringify(allSettings);
    expect(rawDump).not.toContain("sk-ant-raw-plaintext-9999");
    expect(rawDump).toContain("secretref:");

    // Action propagates real HTTP 401 -> 502 CONNECTION_FAILED (not hardcoded 200 / latencyMs 42)
    const probeRes = await app.inject({
      method: "POST",
      url: `/channels/${CH}/adapters/${adapterId}/actions/test-connection`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(probeRes.statusCode).toBe(502);
    expect((probeRes.json() as { ok: boolean; summaryCode: string }).ok).toBe(false);
    expect((probeRes.json() as { summaryCode: string }).summaryCode).toBe("CONNECTION_FAILED");
  });

  it("VW3-R-006: enforces tri-state RBAC DENY + user disable session revocation and includeOriginal masking", async () => {
    app = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
    });
    await app.ready();

    const owner = await signIn("rbac-owner", "Owner");
    const mod = await signIn("rbac-mod", "Mod");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CH, accountId: mod.accountId, role: "MODERATOR", logAccess: true, now: NOW });
    });

    // Moderator initially can read logs & dock
    const preLogs = await app.inject({
      method: "GET",
      url: `/internal/channels/${CH}/logs/integration`,
      headers: { cookie: mod.cookie },
    });
    expect(preLogs.statusCode).toBe(200);

    // Owner creates a role with DENY on logs.view and assigns it to moderator
    const roleRes = await app.inject({
      method: "POST",
      url: `/channels/${CH}/rbac/roles`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { id: "role-deny-logs", name: "Deny Logs", permissions: { "logs.view": "DENY" } },
    });
    expect(roleRes.statusCode).toBe(201);

    const assignRes = await app.inject({
      method: "POST",
      url: `/channels/${CH}/rbac/users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        accountId: mod.accountId,
        displayName: "Mod",
        loginName: "rbac-mod",
        enabled: true,
        roleIds: ["role-moderator", "role-auditor", "role-deny-logs"],
      },
    });
    expect(assignRes.statusCode).toBe(201);

    // Moderator is now immediately blocked from logs.view (DENY > GRANT)
    const deniedLogs = await app.inject({
      method: "GET",
      url: `/internal/channels/${CH}/logs/integration`,
      headers: { cookie: mod.cookie },
    });
    expect(deniedLogs.statusCode).toBe(403);

    // Disabling StoredRbacUser blocks CH immediately (403) without revoking global auth_sessions (VOXWARD-STORY-051)
    const disableRes = await app.inject({
      method: "POST",
      url: `/channels/${CH}/rbac/users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        accountId: mod.accountId,
        displayName: "Mod",
        loginName: "rbac-mod",
        enabled: false,
        roleIds: ["role-moderator"],
      },
    });
    expect(disableRes.statusCode).toBe(201);

    const blockedReq = await app.inject({
      method: "GET",
      url: `/channels/${CH}/dock`,
      headers: { cookie: mod.cookie },
    });
    expect(blockedReq.statusCode).toBe(403);

    const stillAuthedChannels = await app.inject({
      method: "GET",
      url: "/auth/channels",
      headers: { cookie: mod.cookie },
    });
    expect(stillAuthedChannels.statusCode).toBe(200);
    expect((stillAuthedChannels.json() as { channels: unknown[] }).channels).toEqual([]);

    // includeOriginal=false masks originalText in reviewQueue, approvedSc, and ALLOW liveStream entries
    runShortTransaction(db, (tx) => {
      const ev = ChannelEventStore.recordIfNew(tx, {
        id: "ev-sc-1",
        channelId: CH,
        subjectId: "sub-p1",
        platformMessageRef: "pm-sc-1",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-sc-1",
        exceptionMarked: false,
        createdAt: T0,
      });
      TaskStore.create(tx, {
        id: "task-sc-1",
        eventId: ev.id,
        kind: "PAID_TEXT_REVIEW",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-sc-1",
          eventId: ev.id,
          taskId: "task-sc-1",
          seq: 1,
          classification: "ALLOW_MEANINGFUL",
          downstream: "ALLOW",
          source: "MODEL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system",
        })
        .run();

      const chatEv = ChannelEventStore.recordIfNew(tx, {
        id: "ev-chat-1",
        channelId: CH,
        subjectId: "sub-p1",
        platformMessageRef: "pm-chat-1",
        platformOrder: 2,
        receivedAt: T0,
        correlationId: "corr-chat-1",
        exceptionMarked: false,
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-chat-1",
          eventId: chatEv.id,
          taskId: null,
          seq: 1,
          classification: "ALLOW_MEANINGFUL",
          downstream: "ALLOW",
          source: "MODEL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system",
        })
        .run();
    });
    const auditPort = createAuditLogPort(db);
    auditPort.insertTechnicalLog(
      {
        id: "log-sc-1",
        channelId: CH,
        correlationId: "corr-sc-1",
        batchId: null,
        taskId: "task-sc-1",
        attempt: 1,
        stage: "MODEL_CALL",
        status: "OK",
        level: "INFO",
        errorCode: null,
        providerRef: null,
        modelRef: null,
        ruleTemplateVersion: null,
        latencyMs: 10,
        subjectId: "sub-p1",
        data: null,
        createdAt: T0,
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      [{ id: "evid-sc-1", kind: "MESSAGE_TEXT", payload: "secret viewer text", expiresAt: "2099-01-01T00:00:00.000Z" }],
    );
    auditPort.insertTechnicalLog(
      {
        id: "log-chat-1",
        channelId: CH,
        correlationId: "corr-chat-1",
        batchId: null,
        taskId: null,
        attempt: 1,
        stage: "MODEL_CALL",
        status: "OK",
        level: "INFO",
        errorCode: null,
        providerRef: null,
        modelRef: null,
        ruleTemplateVersion: null,
        latencyMs: 10,
        subjectId: "sub-p1",
        data: null,
        createdAt: T0,
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      [{ id: "evid-chat-1", kind: "MESSAGE_TEXT", payload: "allow chat original text", expiresAt: "2099-01-01T00:00:00.000Z" }],
    );

    const masked = readDockAndModerationFeed(db, CH, { includeOriginal: false, nowIso: T0 });
    expect(masked.reviewQueue[0]?.originalText).toBeNull();
    expect(masked.approvedSc[0]?.originalText).toBeNull();
    expect(masked.liveStream.every((item) => item.originalText === null)).toBe(true);

    const unmasked = readDockAndModerationFeed(db, CH, { includeOriginal: true, nowIso: T0 });
    expect(unmasked.reviewQueue[0]?.originalText).toBe("secret viewer text");
    expect(unmasked.approvedSc[0]?.originalText).toBe("secret viewer text");
    expect(unmasked.liveStream.find((item) => item.eventId === "ev-chat-1")?.originalText).toBe("allow chat original text");
  });

  it("VW3-R-007: persists candidateStore across instances and recovers cross-instance ReviewRunner tasks (Q57 R7)", async () => {
    let seq = 0;
    const storeA = createPersistentCandidateStore(db, {
      newId: () => `cand-${++seq}`,
      now: () => NOW,
      rules: { publishConfirmedTerm: () => 2 },
    });
    const proposed = storeA.propose({
      channelId: CH,
      term: "badphrase",
      note: "from review",
      sourceCorrelationId: "corr-cand-1",
      sourceTaskId: "task-cand-1",
    });
    expect(proposed).not.toBeNull();

    // A second store instance over the same SQLite database sees the persisted card!
    const storeB = createPersistentCandidateStore(db, {
      newId: () => `cand-${++seq}`,
      now: () => NOW,
      rules: { publishConfirmedTerm: () => 2 },
    });
    expect(storeB.listCards(CH).map((c) => c.term)).toEqual(["badphrase"]);
    expect(storeB.removeBySourceCorrelations(CH, ["corr-cand-1"])).toBe(1);
    expect(storeA.listCards(CH)).toEqual([]);

    // Cross-instance ReviewRunner: runnerA enqueues, runnerB runs the batch and settles via readCandidateByCorrelation
    const event: ChannelEvent = {
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: CH,
      platformMessageId: "pm-rev-1",
      platformOrder: 2,
      correlationId: "corr-rev-1",
      receivedAt: T0,
      sender: { contractVersion: CONTRACT_VERSION, senderRef: "yt-u-p1" },
      body: "hello review",
    };
    const candidate: ReviewCandidate = {
      eventId: "ev-rev-1",
      event,
      settlementState: "UNSETTLED_FAST_PASS",
      settlementDeadlineAt: "2099-01-01T00:00:00.000Z",
      evidenceExpiresAt: "2099-01-01T00:00:00.000Z",
      exceptionMarked: false,
      deletionInProgress: false,
      manuallyDecided: false,
    };
    let settled = false;
    const sharedStore: ReviewStorePort = {
      listOpenCandidates: () => (settled ? [] : [candidate]),
      readCandidate: (id) => (id === candidate.eventId ? candidate : undefined),
      readCandidateByCorrelation: (corr) => (corr === event.correlationId ? candidate : undefined),
      markExpired: () => undefined,
      commitSettlement: () => {
        settled = true;
        return { status: "SETTLED" };
      },
      markScoring: () => undefined,
      listPendingScoring: () => [],
    };
    let clockMs = Date.parse(T0);
    const coordinator = createTaskCoordinator({
      facts: {
        readFacts: () => ({ eventVersion: 1, processingGeneration: 0, deleted: false }),
        commitIfCurrent: (_k, _e, apply) => {
          apply();
          return { status: "committed" };
        },
      },
      concurrency: { current: () => 2 },
      clock: () => new Date(clockMs),
    });
    const commonDeps = {
      store: sharedStore,
      coordinator,
      model: {
        reviewBatch: async () => ({
          items: [{ itemId: "i0", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], candidateTerms: [] }],
        }),
      },
      scoring: {
        applyVerdict: async () => ({
          contractVersion: "1" as const,
          subjectRef: "yt-u-p1",
          idempotencyKey: "k1",
          delta: 1,
        }),
      },
      reviewQueue: { append: () => undefined },
      candidates: { propose: () => undefined },
      now: () => new Date(clockMs),
      newId: () => "id-1",
      newNonce: () => "nonce-1",
    };

    const runnerA = createReviewRunner(commonDeps);
    const runnerB = createReviewRunner(commonDeps);
    const cycle = await runnerA.runCycle({ channelId: CH, streamEnded: true });
    expect(cycle.enqueued).toBe(1);

    // Advance clock past micro-batch wait window so runnerB takes the batch.
    clockMs += 60_000;

    // runnerB has an empty local `entries` Map, yet recovers & settles the task instead of leaving it RUNNING!
    const batch = await runnerB.runBatch();
    expect(batch).not.toBeNull();
    expect(batch?.items).toHaveLength(1);
    expect(batch?.items[0]?.status).toBe("SETTLED");

    // Also verify an unresolvable cross-instance task reports TASK_ORPHANED_EVENT instead of hanging RUNNING.
    const orphanEvent: ChannelEvent = {
      ...event,
      platformMessageId: "pm-rev-orphan",
      platformOrder: 3,
      correlationId: "corr-rev-orphan",
    };
    const orphanRef = await coordinator.enqueueInLane("BACKGROUND", orphanEvent, "2099-01-01T00:00:00.000Z");
    clockMs += 60_000;
    const orphanBatch = await runnerB.runBatch();
    expect(orphanBatch?.items).toEqual([
      { status: "FAILED", taskId: orphanRef.taskId, eventId: null, errorCode: "TASK_ORPHANED_EVENT" },
    ]);
    expect(await coordinator.statusOf(orphanRef.taskId)).not.toBe("RUNNING");
  });
});
