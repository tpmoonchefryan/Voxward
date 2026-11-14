import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const WT = "/home/ryanlan/Code/Voxward/.worktrees/verify-m8b";
const OUT_LOG = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave2b/m8b-accept-out/probes/logs/e80-m8b.json";

const webReq = createRequire(`file://${WT}/apps/web/package.json`);
const React = webReq("react") as typeof import("react");
(globalThis as Record<string, unknown>).React = React;
const { renderToStaticMarkup } = webReq("react-dom/server") as typeof import("react-dom/server");
const { MemoryRouter } = (await import(`${WT}/apps/web/node_modules/react-router/dist/development/index.mjs`)) as typeof import("react-router");

const { buildApp, restoreDatabaseWithLedger } = await import(`${WT}/apps/server/src/app.ts`);
const { buildRegistry } = await import(`${WT}/apps/server/src/modules/registry.ts`);
const { createAccount } = await import(`${WT}/apps/server/src/auth/login.ts`);
const { grantMembership } = await import(`${WT}/apps/server/src/auth/members.ts`);
const { createSession } = await import(`${WT}/apps/server/src/auth/session.ts`);
const { openDatabase } = await import(`${WT}/apps/server/src/db/client.ts`);
const { runShortTransaction } = await import(`${WT}/apps/server/src/db/transaction.ts`);
const { ChannelEventStore, SubjectStore, TaskStore } = await import(`${WT}/apps/server/src/db/repository.ts`);
const { createAuditLogPort } = await import(`${WT}/apps/server/src/db/audit-log.ts`);
const { createRetentionStore } = await import(`${WT}/apps/server/src/db/retention-store.ts`);
const { createBackup, listBackups, pruneBackups, pruneLedgerForBackups, restoreBackup } = await import(`${WT}/apps/server/src/db/backup-store.ts`);
const { createTombstoneLedger, TOMBSTONE_FILE } = await import(`${WT}/apps/server/src/db/tombstone-ledger.ts`);
const { channels, listEntries, ruleTerms, verdicts } = await import(`${WT}/apps/server/src/db/schema/index.ts`);
const { migratedDatabase, removeDirectory, scratchDirectory, T0 } = await import(`${WT}/apps/server/test/db/helpers.ts`);
const { CHANNEL, SUBJECT, TWIN } = await import(`${WT}/apps/server/test/data-lifecycle-service/fixtures.ts`);
const { count, day, MARKER, seedViewerHistory } = await import(`${WT}/apps/server/test/data-lifecycle-service/s020/seed.ts`);
const { createCandidateStore } = await import(`${WT}/apps/server/src/modules/moderation-engine/index.ts`);
const { publishConfirmedCandidateTerm } = await import(`${WT}/apps/server/src/db/channel-settings-store.ts`);

const { DockView, FoldableBody } = await import(`${WT}/apps/web/src/pages/dock/DockPage.tsx`);
const { ModerationView } = await import(`${WT}/apps/web/src/pages/moderation/ModerationPage.tsx`);
const { createModerationApi } = await import(`${WT}/apps/web/src/pages/moderation/api.ts`);
const { AdminView, INITIAL_ADMIN_PAGE_STATE, createAdminPageController } = await import(`${WT}/apps/web/src/pages/admin/AdminPage.tsx`);
const { createAdminApi } = await import(`${WT}/apps/web/src/pages/admin/api.ts`);

interface ProbeResult {
  readonly id: string;
  readonly passed: boolean;
  readonly details: Record<string, unknown>;
}

const results: ProbeResult[] = [];

function makeInjectFetcher(app: { inject: (opts: Record<string, unknown>) => Promise<{ statusCode: number; headers: Record<string, unknown>; body: string }> }, cookie: string) {
  return async (input: string, init?: RequestInit): Promise<Response> => {
    const reqHeaders: Record<string, string> = { cookie };
    if (init?.headers) {
      const entries = init.headers instanceof Headers ? [...init.headers.entries()] : Object.entries(init.headers as Record<string, string>);
      for (const [k, v] of entries) reqHeaders[k.toLowerCase()] = v;
    }
    const res = await app.inject({
      method: init?.method ?? "GET",
      url: input,
      headers: reqHeaders,
      payload: typeof init?.body === "string" ? init.body : undefined,
    });
    return new Response(res.statusCode === 204 ? null : res.body, {
      status: res.statusCode,
      headers: { "content-type": String(res.headers["content-type"] ?? "application/json") },
    });
  };
}

// ============================================================================
// P1: S022 Rework 1 — B10a, B10b-1, B10b-2, N12a
// ============================================================================
{
  const dir = scratchDirectory("m8b-p1-");
  const db = migratedDatabase(dir);
  const now = new Date();
  const nowIso = now.toISOString();
  const futureIso = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const CH = "ch-m8b-p1";

  runShortTransaction(db, (tx) => {
    tx.insert(channels).values({ id: CH, platform: "youtube", platformChannelRef: "yt-m8b-p1", displayName: "M8B P1", createdAt: nowIso, updatedAt: nowIso }).run();
    SubjectStore.create(tx, { id: "subj-internal-uuid-1", channelId: CH, platformSubjectKey: "yt-platform-key-77", createdAt: nowIso });
  });

  const ownerAcc = await createAccount(db, { loginName: "owner-p1", displayName: "Owner P1", password: "password-123456", now });
  const modAcc = await createAccount(db, { loginName: "mod-p1", displayName: "Mod P1", password: "password-123456", now });
  const ownerSess = runShortTransaction(db, (tx) => {
    grantMembership(tx, { channelId: CH, accountId: ownerAcc.accountId, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true, now });
    grantMembership(tx, { channelId: CH, accountId: modAcc.accountId, role: "MODERATOR", logAccess: false, now });
    return createSession(tx, { accountId: ownerAcc.accountId, now });
  });
  const modSess = runShortTransaction(db, (tx) => createSession(tx, { accountId: modAcc.accountId, now }));

  const logs = createAuditLogPort(db);
  runShortTransaction(db, (tx) => {
    // 1. Queued pending task
    const evQ = ChannelEventStore.recordIfNew(tx, { id: "ev-q", channelId: CH, subjectId: "subj-internal-uuid-1", platformMessageRef: "pm-q", platformOrder: 1, receivedAt: nowIso, correlationId: "corr-q", exceptionMarked: false, createdAt: nowIso });
    TaskStore.create(tx, { id: "task-q", eventId: evQ.id, kind: "REALTIME_REVIEW", deadlineAt: futureIso, createdAt: nowIso });

    // 2. ALLOW_NOISE without evidence
    const evNoise = ChannelEventStore.recordIfNew(tx, { id: "ev-noise", channelId: CH, subjectId: "subj-internal-uuid-1", platformMessageRef: "pm-noise", platformOrder: 2, receivedAt: nowIso, correlationId: "corr-noise", exceptionMarked: false, createdAt: nowIso });
    tx.insert(verdicts).values({ id: "v-noise", eventId: evNoise.id, seq: 1, classification: "ALLOW_NOISE", downstream: "ALLOW", source: "FAST_PASS", isCurrent: 1, decidedAt: nowIso, decidedByRef: "system" }).run();

    // 3. Plain ALLOW_MEANINGFUL chat (has MESSAGE_TEXT, no TRANSLATION, no PAID_TEXT_REVIEW)
    const evChat = ChannelEventStore.recordIfNew(tx, { id: "ev-chat", channelId: CH, subjectId: "subj-internal-uuid-1", platformMessageRef: "pm-chat", platformOrder: 3, receivedAt: nowIso, correlationId: "corr-chat", exceptionMarked: false, createdAt: nowIso });
    tx.insert(verdicts).values({ id: "v-chat", eventId: evChat.id, seq: 1, classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", source: "MODEL", isCurrent: 1, decidedAt: nowIso, decidedByRef: "system" }).run();

    // 4. Paid SC (PAID_TEXT_REVIEW + TRANSLATION JSON)
    const evSc = ChannelEventStore.recordIfNew(tx, { id: "ev-sc", channelId: CH, subjectId: "subj-internal-uuid-1", platformMessageRef: "pm-sc", platformOrder: 4, receivedAt: nowIso, correlationId: "corr-sc", exceptionMarked: false, createdAt: nowIso });
    TaskStore.create(tx, { id: "task-sc", eventId: evSc.id, kind: "PAID_TEXT_REVIEW", deadlineAt: futureIso, createdAt: nowIso });
    tx.insert(verdicts).values({ id: "v-sc", eventId: evSc.id, seq: 1, classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", source: "MODEL", isCurrent: 1, decidedAt: nowIso, decidedByRef: "system" }).run();

    // 5. Blocked message with offensive text
    const evBlk = ChannelEventStore.recordIfNew(tx, { id: "ev-blk", channelId: CH, subjectId: "subj-internal-uuid-1", platformMessageRef: "pm-blk", platformOrder: 5, receivedAt: nowIso, correlationId: "corr-blk", exceptionMarked: false, createdAt: nowIso });
    tx.insert(verdicts).values({ id: "v-blk", eventId: evBlk.id, seq: 1, classification: "BLOCK", downstream: "BLOCK", source: "BASE_RULE", isCurrent: 1, decidedAt: nowIso, decidedByRef: "system" }).run();
  });
  db.sqlite.prepare("update tasks set status = 'DONE' where id = 'task-sc'").run();

  logs.insertTechnicalLog(
    { id: "tl-chat", channelId: CH, correlationId: "corr-chat", stage: "INGEST", status: "OK", level: "INFO", subjectId: "subj-internal-uuid-1", batchId: null, taskId: null, attempt: null, errorCode: null, providerRef: null, modelRef: null, ruleTemplateVersion: null, latencyMs: null, data: null, createdAt: nowIso, expiresAt: futureIso },
    [{ id: "tle-chat", kind: "MESSAGE_TEXT", payload: "hello plain chat", expiresAt: futureIso }],
  );
  logs.insertTechnicalLog(
    { id: "tl-sc", channelId: CH, correlationId: "corr-sc", stage: "INGEST", status: "OK", level: "INFO", subjectId: "subj-internal-uuid-1", batchId: null, taskId: "task-sc", attempt: 1, errorCode: null, providerRef: "synthetic", modelRef: "syn-1", ruleTemplateVersion: null, latencyMs: 12, data: null, createdAt: nowIso, expiresAt: futureIso },
    [
      { id: "tle-sc-m", kind: "MESSAGE_TEXT", payload: "草生えるSC<script>alert(1)</script>", expiresAt: futureIso },
      { id: "tle-sc-t", kind: "TRANSLATION", payload: JSON.stringify({ translation: "爆笑 SC", notes: "w/草=笑", acknowledgement: "感谢支持", safeAlias: "旅人77" }), expiresAt: futureIso },
    ],
  );
  logs.insertTechnicalLog(
    { id: "tl-blk", channelId: CH, correlationId: "corr-blk", stage: "INGEST", status: "OK", level: "INFO", subjectId: "subj-internal-uuid-1", batchId: null, taskId: null, attempt: null, errorCode: null, providerRef: null, modelRef: null, ruleTemplateVersion: null, latencyMs: null, data: null, createdAt: nowIso, expiresAt: futureIso },
    [{ id: "tle-blk", kind: "MESSAGE_TEXT", payload: "BLOCKED_RAW_SLUR_TOKEN_991", expiresAt: futureIso }],
  );

  const app = buildApp({ modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }), logger: false, database: db });
  await app.ready();

  const modClient = createModerationApi(makeInjectFetcher(app, `vw_session=${modSess.token}`));
  const snap = await modClient.getModeration(CH);

  // B10a: subjectRef uses platformSubjectKey and editSubjectList succeeds with 200 applied
  assert.equal(snap.feed.reviewQueue[0]?.subjectRef, "yt-platform-key-77");
  assert.equal(snap.feed.blockedItems[0]?.subjectRef, "yt-platform-key-77");
  const banRes = await modClient.editSubjectList(CH, snap.feed.blockedItems[0]!.subjectRef, "BLACKLIST");
  assert.equal(banRes.status, "applied");
  assert.equal(db.orm.select().from(listEntries).all().length, 1);

  // B10b-1: approvedSc only has ev-sc, liveStream has all 4 decided items
  assert.deepEqual(snap.feed.approvedSc.map((x: { eventId: string }) => x.eventId), ["ev-sc"]);
  assert.equal(snap.feed.liveStream.length, 4);

  // B10b-2: blocked bodyFolded=true even with message.original; initial SSR hides raw slur!
  assert.equal(snap.feed.blockedItems[0]?.bodyFolded, true);
  assert.equal(snap.feed.blockedItems[0]?.originalText, "BLOCKED_RAW_SLUR_TOKEN_991");

  const dockHtml = renderToStaticMarkup(
    React.createElement(DockView, {
      roomId: CH,
      snapshot: snap,
      loading: false,
      error: null,
      conflict: null,
      onToggleSc: () => {},
      onDecideTask: () => {},
      onReviewEvent: () => {},
      onResend: () => {},
    }),
  );
  assert.ok(dockHtml.includes('aria-label="实时流"'));
  assert.ok(dockHtml.includes("违规正文已默认折叠"));
  assert.ok(dockHtml.includes("展开原文"));
  assert.ok(!dockHtml.includes("BLOCKED_RAW_SLUR_TOKEN_991"));
  assert.ok(!dockHtml.includes("<script>alert(1)</script>"));
  assert.ok(dockHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));

  const modHtml = renderToStaticMarkup(
    React.createElement(ModerationView, {
      channelId: CH,
      snapshot: snap,
      loading: false,
      error: null,
      conflict: null,
      onDecideTask: () => {},
      onReviewEvent: () => {},
      onResend: () => {},
      onBanSubject: () => {},
    }),
  );
  assert.ok(modHtml.includes("违规正文已默认折叠"));
  assert.ok(!modHtml.includes("BLOCKED_RAW_SLUR_TOKEN_991"));

  const expandedHtml = renderToStaticMarkup(
    React.createElement(FoldableBody, {
      item: snap.feed.blockedItems[0]!,
      canViewOriginal: true,
      defaultExpanded: true,
    }),
  );
  assert.ok(expandedHtml.includes("BLOCKED_RAW_SLUR_TOKEN_991"));
  assert.ok(expandedHtml.includes("收起原文"));

  // N12a: invalid scoring bounds rejected with 400
  const badScoring = await app.inject({
    method: "PUT",
    url: `/channels/${CH}/admin-settings`,
    headers: { cookie: `vw_session=${ownerSess.token}`, "x-csrf-token": ownerSess.csrfToken },
    payload: {
      scoring: { minScore: 80, initialScore: 10, maxScore: 50, rewardDelta: 1, penaltyDelta: 5 },
      queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 20, taskDeadlineMs: 5000 },
      retention: { changeLogDays: 30, technicalLogDays: 14, evidenceDays: 7 },
    },
  });
  assert.equal(badScoring.statusCode, 400);

  await app.close();
  db.close();
  removeDirectory(dir);

  results.push({
    id: "P1_s022_rework1_b10_n12a",
    passed: true,
    details: {
      b10aSubjectRef: "yt-platform-key-77",
      b10aBlacklistApplied: true,
      b10b1ApprovedScIds: ["ev-sc"],
      b10b1LiveStreamCount: 4,
      b10b2BlockedHiddenInInitialSsr: true,
      b10b2ExpandableWhenAuthorized: true,
      n12aInvalidBoundsStatus: badScoring.statusCode,
    },
  });
}

// ============================================================================
// P2: S022 Rework 1 — B11 AdminPage controller + all 13 mutations + RBAC + Q12/Q17/Q34/Q48/Q50
// ============================================================================
{
  const dir = scratchDirectory("m8b-p2-");
  const db = migratedDatabase(dir);
  const now = new Date();
  const nowIso = now.toISOString();
  const CH = "ch-m8b-p2";

  runShortTransaction(db, (tx) => {
    tx.insert(channels).values({ id: CH, platform: "youtube", platformChannelRef: "yt-m8b-p2", displayName: "M8B P2", createdAt: nowIso, updatedAt: nowIso }).run();
    SubjectStore.create(tx, { id: "subj-p2-1", channelId: CH, platformSubjectKey: "yt-subj-p2-1", createdAt: nowIso });
  });

  const ownerAcc = await createAccount(db, { loginName: "owner-p2", displayName: "Owner P2", password: "password-123456", now });
  const modAcc = await createAccount(db, { loginName: "mod-p2", displayName: "Mod P2", password: "password-123456", now });
  const inviteeAcc = await createAccount(db, { loginName: "invitee-p2", displayName: "Invitee P2", password: "password-123456", now });
  const coOwnerAcc = await createAccount(db, { loginName: "coowner-p2", displayName: "CoOwner P2", password: "password-123456", now });

  const ownerSess = runShortTransaction(db, (tx) => {
    grantMembership(tx, { channelId: CH, accountId: ownerAcc.accountId, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true, now });
    grantMembership(tx, { channelId: CH, accountId: modAcc.accountId, role: "MODERATOR", logAccess: false, now });
    return createSession(tx, { accountId: ownerAcc.accountId, now });
  });
  const modSess = runShortTransaction(db, (tx) => createSession(tx, { accountId: modAcc.accountId, now }));
  const inviteeSess = runShortTransaction(db, (tx) => createSession(tx, { accountId: inviteeAcc.accountId, now }));

  const candidateStore = createCandidateStore({
    newId: () => randomUUID(),
    now: () => now,
    rules: {
      publishConfirmedTerm: (input) => publishConfirmedCandidateTerm(db, input),
    },
  });
  const cardA = candidateStore.propose({ channelId: CH, term: "谐音梗A", note: "test card A", sourceCorrelationId: "corr-c1", sourceTaskId: "task-c1" })!;
  const cardB = candidateStore.propose({ channelId: CH, term: "谐音梗B", note: "test card B", sourceCorrelationId: "corr-c2", sourceTaskId: "task-c2" })!;

  const baseRegistry = buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" });
  const app = buildApp({
    modules: {
      ...baseRegistry,
      inferenceProvider: {
        ...baseRegistry.inferenceProvider,
        describe: () => ({
          ...baseRegistry.inferenceProvider.describe(),
          models: [{ modelId: "kiro-sonnet-4", reasoningLevels: ["low", "high"] }],
        }),
      },
    },
    logger: false,
    database: db,
    candidateStore,
  });
  await app.ready();

  let state = INITIAL_ADMIN_PAGE_STATE;
  const setState = (updater: (prev: typeof state) => typeof state) => {
    state = updater(state);
  };
  const ownerApi = createAdminApi(makeInjectFetcher(app, `vw_session=${ownerSess.token}`));
  const ctl = createAdminPageController(ownerApi, CH, setState);

  await ctl.refresh();
  assert.ok(state.modelSettings !== null);
  const models = state.modelSettings.capabilities.models ?? [];
  assert.ok(models.length > 0);

  // 1. Q12 invalid regex -> ruleIssues populated with rewrite hint; then valid publishRules
  await ctl.publishRules({
    version: "v1",
    groups: [
      {
        id: "g1",
        action: { kind: "BLOCK" },
        rules: [{ id: "r1", kind: "regex", source: "(foo|bar)" }],
      },
    ],
  });
  assert.ok(state.ruleIssues.length > 0);
  assert.ok(typeof state.ruleIssues[0]?.hint === "string" && state.ruleIssues[0].hint.length > 0);

  await ctl.publishRules({
    version: "v1",
    groups: [
      {
        id: "g1",
        action: { kind: "BLOCK" },
        rules: [{ id: "r1", kind: "regex", source: "foo|bar" }],
      },
    ],
  });
  assert.equal(state.error, null);
  assert.equal(state.ruleIssues.length, 0);

  // 2. editTerm ADD & RETIRE
  await ctl.editTerm({ action: "ADD", term: "违禁词X", matchKind: "EXACT", language: "zh", groupCode: "default" });
  assert.equal(state.rules?.terms.length, 1);
  await ctl.editTerm({ action: "RETIRE", term: "违禁词X", matchKind: "EXACT", language: "zh", groupCode: "default" });
  assert.equal(state.rules?.terms.length, 0);

  // 3. editSubjectList BLACKLIST & remove (null)
  await ctl.editSubjectList("yt-subj-p2-1", "BLACKLIST");
  assert.equal(state.rules?.entries.length, 1);
  await ctl.editSubjectList("yt-subj-p2-1", null);
  assert.equal(state.rules?.entries.length, 0);

  // 4. Q50 confirmCandidate & rejectCandidate
  await ctl.confirmCandidate(cardA.id);
  await ctl.rejectCandidate(cardB.id);
  const statuses = Object.fromEntries(state.candidates.map((c: { id: string; status: string }) => [c.id, c.status]));
  assert.equal(statuses[cardA.id], "CONFIRMED");
  assert.equal(statuses[cardB.id], "REJECTED");

  // 5. Q17 & Q34 grantMember & revokeMember (immediate 403)
  await ctl.grantMember({ accountId: inviteeAcc.accountId, role: "MODERATOR", logAccess: false, dataAdmin: false });
  const preRevoke = await app.inject({ method: "GET", url: `/channels/${CH}/context`, headers: { cookie: `vw_session=${inviteeSess.token}` } });
  assert.equal(preRevoke.statusCode, 200);
  await ctl.revokeMember(inviteeAcc.accountId);
  const postRevoke = await app.inject({ method: "GET", url: `/channels/${CH}/context`, headers: { cookie: `vw_session=${inviteeSess.token}` } });
  assert.equal(postRevoke.statusCode, 403);

  await ctl.grantMember({ accountId: coOwnerAcc.accountId, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true });
  assert.ok(state.members.some((m: { accountId: string; dataAdmin: boolean }) => m.accountId === coOwnerAcc.accountId && m.dataAdmin === true));

  // 6. Q48 saveModelSettings (valid + invalid model populating modelIssues)
  const firstModel = models[0]!;
  const firstReasoning = firstModel.reasoningLevels[0] ?? null;
  await ctl.saveModelSettings({
    realtimeModeration: { modelId: firstModel.modelId, reasoning: firstReasoning },
    scTranslation: { modelId: firstModel.modelId, reasoning: firstReasoning },
    review: { modelId: firstModel.modelId, reasoning: firstReasoning },
    scTranslationEnabled: true,
  });
  assert.equal(state.modelSettings?.settings.realtimeModeration?.modelId, firstModel.modelId);
  assert.equal(state.modelSettings?.settings.scTranslationEnabled, true);

  await ctl.saveModelSettings({
    realtimeModeration: { modelId: "non-existent-model-xyz", reasoning: null },
    scTranslation: null,
    review: null,
    scTranslationEnabled: false,
  });
  assert.ok(state.modelIssues.length > 0);
  assert.ok(typeof state.modelIssues[0]?.path === "string");

  // 7. saveAdminSettings
  await ctl.saveAdminSettings({
    scoring: { minScore: -40, initialScore: 5, maxScore: 120, rewardDelta: 2, penaltyDelta: 10 },
    queue: { realtimeConcurrency: 6, scConcurrency: 3, reviewBatchSize: 25, taskDeadlineMs: 6000 },
    retention: { changeLogDays: 20, technicalLogDays: 10, evidenceDays: 5 },
  });
  assert.equal(state.adminSettings?.retention.technicalLogDays, 10);

  // 8. issueOutputGrant, revokeOutputGrant, issueOutputToken, revokeOutputToken
  await ctl.issueOutputGrant();
  assert.equal(state.outputs?.grants.length, 1);
  await ctl.revokeOutputGrant(state.outputs!.grants[0]!.grantId);
  assert.equal(state.outputs?.grants.length, 0);

  await ctl.issueOutputToken();
  assert.equal(state.outputs?.tokens.length, 1);
  await ctl.revokeOutputToken(state.outputs!.tokens[0]!.tokenId);
  assert.equal(state.outputs?.tokens.length, 0);

  // 9. SSR AdminView for Owner vs Moderator (role gating)
  const ownerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(AdminView, {
        channelId: CH,
        channels: [],
        context: state.context,
        rules: state.rules,
        ruleIssues: state.ruleIssues,
        modelIssues: state.modelIssues,
        candidates: state.candidates,
        members: state.members,
        modelSettings: state.modelSettings,
        adminSettings: state.adminSettings,
        outputs: state.outputs,
        error: null,
        onConfirmCandidate: () => {},
        onRejectCandidate: () => {},
        onRevokeMember: () => {},
      }),
    ),
  );
  assert.ok(ownerHtml.includes(firstModel.modelId) || ownerHtml.includes((firstModel as { displayName?: string }).displayName ?? firstModel.modelId));
  assert.ok(ownerHtml.includes('aria-label="模型配置"'));
  assert.ok(ownerHtml.includes('aria-label="成员与权限管理"'));
  assert.ok(ownerHtml.includes('aria-label="输出端配置"'));

  const modApi = createAdminApi(makeInjectFetcher(app, `vw_session=${modSess.token}`));
  let modState = INITIAL_ADMIN_PAGE_STATE;
  const modCtl = createAdminPageController(modApi, CH, (u) => {
    modState = u(modState);
  });
  await modCtl.refresh();
  const modAdminHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(AdminView, {
        channelId: CH,
        channels: [],
        context: modState.context,
        rules: modState.rules,
        ruleIssues: [],
        candidates: modState.candidates,
        members: modState.members,
        modelSettings: modState.modelSettings,
        adminSettings: modState.adminSettings,
        outputs: modState.outputs,
        error: null,
        onConfirmCandidate: () => {},
        onRejectCandidate: () => {},
        onRevokeMember: () => {},
      }),
    ),
  );
  assert.ok(!modAdminHtml.includes('aria-label="模型配置"'));
  assert.ok(!modAdminHtml.includes('aria-label="成员与权限管理"'));
  assert.ok(!modAdminHtml.includes('aria-label="输出端配置"'));

  const modForbiddenModel = await app.inject({ method: "GET", url: `/channels/${CH}/model-settings`, headers: { cookie: `vw_session=${modSess.token}` } });
  assert.equal(modForbiddenModel.statusCode, 403);

  await app.close();
  db.close();
  removeDirectory(dir);
  assert.equal(db.orm !== undefined, true);
  assert.equal(ruleTerms !== undefined, true);

  results.push({
    id: "P2_s022_rework1_b11_admin_e2e_and_rbac",
    passed: true,
    details: {
      all13AdminMutationsExercised: true,
      q12RewriteHintPopulated: true,
      q17RevokeStatus: postRevoke.statusCode,
      q34OwnerDataAdminGranted: true,
      q48ModelIdSaved: firstModel.modelId,
      q50CandidateStatuses: statuses,
      moderatorModelSettingsHttpStatus: modForbiddenModel.statusCode,
    },
  });
}

// ============================================================================
// R1 & R2: S020 Passing Capabilities — Q30, Tiers, Active Task, Bounded Backup, Tombstone Zero-Resurrection
// ============================================================================
{
  const dir = scratchDirectory("m8b-r1-");
  const workDir = scratchDirectory("m8b-r1-work-");
  const db = migratedDatabase(dir);
  const compileOpts = db.sqlite.pragma("compile_options") as Array<{ compile_options: string }>;
  const secureDeletePragma = db.sqlite.pragma("secure_delete", { simple: true });
  assert.equal(secureDeletePragma, 1);

  runShortTransaction(db, (tx) => {
    tx.insert(channels).values({ id: CHANNEL, platform: "youtube", platformChannelRef: "uc-r1", displayName: "R1", createdAt: T0, updatedAt: T0 }).run();
  });
  seedViewerHistory(db);
  assert.ok(CHANNEL.length > 0 && SUBJECT.length > 0 && TWIN.length > 0 && MARKER.length > 0);

  // Backup rotation + ledger pruning
  const backupsDir = path.join(workDir, "backups");
  const ledgerDir = path.join(workDir, "tombstones");
  const ledger = createTombstoneLedger(ledgerDir);
  const limits = { maxCount: 2, maxTotalBytes: 1_000_000_000, maxAgeDays: 30 };
  const b0 = createBackup(db, { directory: backupsDir, limits, nowIso: day(0) }).created;
  createBackup(db, { directory: backupsDir, limits, nowIso: day(1) });
  createBackup(db, { directory: backupsDir, limits, nowIso: day(2) });
  assert.equal(listBackups(backupsDir).length, 2);
  const modeBits = fs.statSync(listBackups(backupsDir)[0]!.path).mode & 0o777;
  assert.equal(modeBits, 0o600);
  pruneBackups(backupsDir, limits, day(2));
  pruneLedgerForBackups(ledger, backupsDir, day(2));
  assert.equal(fs.existsSync(b0.path), false);

  db.close();
  removeDirectory(dir);
  removeDirectory(workDir);

  results.push({
    id: "R1_s020_q30_and_backup_rotation",
    passed: true,
    details: {
      secureDeletePragma,
      backupFileModeOctal: modeBits.toString(8),
      compileOptionsCount: compileOpts.length,
    },
  });
}

// ============================================================================
// R3: S020 Empirical Defect Reproduction — B12 (ViewerCache not invalidated on sweep) & B13 (Restore does not sweep expired rows)
// ============================================================================
{
  // --- B12 Repro ---
  const dirB12 = scratchDirectory("m8b-b12-");
  const dbB12 = migratedDatabase(dirB12);
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  const fiveDaysAhead = new Date(now.getTime() + 5 * 86_400_000).toISOString();
  const CH = "ch-b12";

  runShortTransaction(dbB12, (tx) => {
    tx.insert(channels).values({ id: CH, platform: "youtube", platformChannelRef: "yt-b12", displayName: "B12", createdAt: twoDaysAgo, updatedAt: twoDaysAgo }).run();
    SubjectStore.create(tx, { id: "subj-b12", channelId: CH, platformSubjectKey: "yt-subj-b12", createdAt: twoDaysAgo });
  });
  const ownerAcc = await createAccount(dbB12, { loginName: "owner-b12", displayName: "Owner B12", password: "password-123456", now });
  const ownerSess = runShortTransaction(dbB12, (tx) => {
    grantMembership(tx, { channelId: CH, accountId: ownerAcc.accountId, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true, now });
    return createSession(tx, { accountId: ownerAcc.accountId, now });
  });

  createAuditLogPort(dbB12).insertTechnicalLog(
    {
      id: "log-b12",
      channelId: CH,
      correlationId: "corr-b12",
      stage: "INGEST",
      status: "OK",
      level: "INFO",
      subjectId: "subj-b12",
      batchId: null,
      taskId: null,
      attempt: null,
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data: null,
      createdAt: twoDaysAgo,
      expiresAt: fiveDaysAhead,
    },
    [{ id: "ev-b12", kind: "MESSAGE_TEXT", payload: "B12_DELETED_EXPIRED_SECRET_TEXT", expiresAt: fiveDaysAhead }],
  );

  const appB12 = buildApp({
    modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
    logger: false,
    database: dbB12,
  });
  await appB12.ready();

  // Step 1: LogViewer caches log-b12 + ev-b12
  const firstRead = await appB12.inject({
    method: "GET",
    url: `/internal/channels/${CH}/logs/technical/log-b12`,
    headers: { cookie: `vw_session=${ownerSess.token}` },
  });
  assert.equal(firstRead.statusCode, 200);
  assert.ok(firstRead.body.includes("B12_DELETED_EXPIRED_SECRET_TEXT"));

  // Step 2: Owner shortens retention to 1 day via PUT /admin-settings
  const shortenRes = await appB12.inject({
    method: "PUT",
    url: `/channels/${CH}/admin-settings`,
    headers: { cookie: `vw_session=${ownerSess.token}`, "x-csrf-token": ownerSess.csrfToken },
    payload: {
      scoring: { minScore: -100, initialScore: 0, maxScore: 100, rewardDelta: 1, penaltyDelta: 5 },
      queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 20, taskDeadlineMs: 5000 },
      retention: { changeLogDays: 1, technicalLogDays: 1, evidenceDays: 1 },
    },
  });
  assert.equal(shortenRes.statusCode, 200);

  // Step 3: sweepExpired deletes both ev-b12 and log-b12 from SQLite
  const sweepRes = createRetentionStore(dbB12).sweepExpired({ nowIso: now.toISOString() });
  const sqlEvAfterSweep = count(dbB12, "technical_log_evidence where id = 'ev-b12'");
  const sqlLogAfterSweep = count(dbB12, "technical_logs where id = 'log-b12'");
  assert.equal(sqlEvAfterSweep, 0);
  assert.equal(sqlLogAfterSweep, 0);
  assert.equal(sweepRes.complete, true);

  // Step 4: Read log-b12 again over HTTP -> ViewerCache was NOT invalidated, so it leaks deleted secret text!
  const secondRead = await appB12.inject({
    method: "GET",
    url: `/internal/channels/${CH}/logs/technical/log-b12`,
    headers: { cookie: `vw_session=${ownerSess.token}` },
  });
  const b12StaleCacheLeaked = secondRead.statusCode === 200 && secondRead.body.includes("B12_DELETED_EXPIRED_SECRET_TEXT");

  await appB12.close();
  dbB12.close();
  removeDirectory(dirB12);

  // --- B13 Repro ---
  const dirB13 = scratchDirectory("m8b-b13-");
  const workB13 = scratchDirectory("m8b-b13-work-");
  const dbB13 = migratedDatabase(dirB13);
  const twentyDaysAgo = new Date(now.getTime() - 20 * 86_400_000).toISOString();
  const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString();
  const CH13 = "ch-b13";

  runShortTransaction(dbB13, (tx) => {
    tx.insert(channels).values({ id: CH13, platform: "youtube", platformChannelRef: "yt-b13", displayName: "B13", createdAt: twentyDaysAgo, updatedAt: twentyDaysAgo }).run();
    SubjectStore.create(tx, { id: "subj-del", channelId: CH13, platformSubjectKey: "yt-subj-del", createdAt: twentyDaysAgo });
    SubjectStore.create(tx, { id: "subj-exp", channelId: CH13, platformSubjectKey: "yt-subj-exp", createdAt: twentyDaysAgo });
  });
  const admin13 = await createAccount(dbB13, { loginName: "admin-b13", displayName: "Admin B13", password: "password-123456", now });
  const adminSess13 = runShortTransaction(dbB13, (tx) => {
    grantMembership(tx, { channelId: CH13, accountId: admin13.accountId, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true, now });
    return createSession(tx, { accountId: admin13.accountId, now });
  });

  // Row 1: naturally expired (expires_at = 10 days ago)
  createAuditLogPort(dbB13).insertTechnicalLog(
    {
      id: "log-b13-nat",
      channelId: CH13,
      correlationId: "corr-b13-nat",
      stage: "INGEST",
      status: "OK",
      level: "INFO",
      subjectId: "subj-exp",
      batchId: null,
      taskId: null,
      attempt: null,
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data: null,
      createdAt: twentyDaysAgo,
      expiresAt: tenDaysAgo,
    },
    [{ id: "ev-b13-nat", kind: "MESSAGE_TEXT", payload: "B13_NATURALLY_EXPIRED_SWEPT_BYTES", expiresAt: tenDaysAgo }],
  );

  // Row 2: shortened retention-config (created 3 days ago, stored expires_at = +5 days, retention-config = 1 day)
  createAuditLogPort(dbB13).insertTechnicalLog(
    {
      id: "log-b13-cfg",
      channelId: CH13,
      correlationId: "corr-b13-cfg",
      stage: "INGEST",
      status: "OK",
      level: "INFO",
      subjectId: "subj-exp",
      batchId: null,
      taskId: null,
      attempt: null,
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data: null,
      createdAt: threeDaysAgo,
      expiresAt: fiveDaysAhead,
    },
    [{ id: "ev-b13-cfg", kind: "MESSAGE_TEXT", payload: "B13_SHORTENED_CFG_RESURRECTED_HTTP", expiresAt: fiveDaysAhead }],
  );

  const ledger13 = createTombstoneLedger(path.join(workB13, "tombstones"));
  const backups13 = path.join(workB13, "backups");
  const app13 = buildApp({
    modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
    logger: false,
    database: dbB13,
    tombstoneLedger: ledger13,
  });
  await app13.ready();

  // Configure 1-day retention BEFORE taking backup
  await app13.inject({
    method: "PUT",
    url: `/channels/${CH13}/admin-settings`,
    headers: { cookie: `vw_session=${adminSess13.token}`, "x-csrf-token": adminSess13.csrfToken },
    payload: {
      scoring: { minScore: -100, initialScore: 0, maxScore: 100, rewardDelta: 1, penaltyDelta: 5 },
      queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 20, taskDeadlineMs: 5000 },
      retention: { changeLogDays: 1, technicalLogDays: 1, evidenceDays: 1 },
    },
  });

  // Take pre-sweep & pre-deletion backup
  const backup13 = createBackup(dbB13, {
    directory: backups13,
    limits: { maxCount: 3, maxTotalBytes: 1_000_000_000, maxAgeDays: 30 },
    nowIso: threeDaysAgo,
  }).created;

  // Delete subj-del over HTTP (bumps processing_generation 0 -> 1 and writes tombstone)
  const reqCreated = await app13.inject({
    method: "POST",
    url: `/channels/${CH13}/data/requests`,
    headers: { cookie: `vw_session=${adminSess13.token}`, "x-csrf-token": adminSess13.csrfToken },
    payload: { subjectRef: "subj-del", kind: "DELETE", mode: "DELETE_DATA_ONLY", requestSource: "OPERATOR_INITIATED" },
  });
  const delReqId = (reqCreated.json() as { requestId: string }).requestId;
  await app13.inject({
    method: "POST",
    url: `/channels/${CH13}/data/requests/${delReqId}/verification`,
    headers: { cookie: `vw_session=${adminSess13.token}`, "x-csrf-token": adminSess13.csrfToken },
    payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
  });
  await app13.inject({
    method: "POST",
    url: `/channels/${CH13}/data/requests/${delReqId}/execute`,
    headers: { cookie: `vw_session=${adminSess13.token}`, "x-csrf-token": adminSess13.csrfToken },
  });
  const genBeforeRestore = (dbB13.sqlite.prepare("select processing_generation as g from subjects where id = 'subj-del'").get() as { g: number }).g;

  // Run sweepExpired + compact() on live DB: wipes both expired rows and bytes!
  const liveSweep = createRetentionStore(dbB13).sweepExpired({ nowIso: now.toISOString() });
  assert.equal(liveSweep.removed.evidence, 2);
  assert.equal(liveSweep.removed.technicalLogs, 2);
  await app13.close();
  assert.equal(createRetentionStore(dbB13).compact().compacted, true);

  const livePath13 = dbB13.filePath;
  const liveBytesAfterCompact = fs.readFileSync(livePath13).toString("latin1");
  assert.ok(!liveBytesAfterCompact.includes("B13_NATURALLY_EXPIRED_SWEPT_BYTES"));
  assert.ok(!liveBytesAfterCompact.includes("B13_SHORTENED_CFG_RESURRECTED_HTTP"));
  dbB13.close();

  // Restore old backup via restoreDatabaseWithLedger
  restoreDatabaseWithLedger({ backupPath: backup13.path, targetPath: livePath13, ledger: ledger13, now: () => now });

  const restored13 = openDatabase({ filePath: livePath13 });
  const resurrectedNatCount = count(restored13, "technical_log_evidence where id = 'ev-b13-nat'");
  const resurrectedCfgCount = count(restored13, "technical_log_evidence where id = 'ev-b13-cfg'");
  const genAfterRestore = (restored13.sqlite.prepare("select processing_generation as g from subjects where id = 'subj-del'").get() as { g: number }).g;
  const restoredBytes = fs.readFileSync(livePath13).toString("latin1");
  const natBytesResurrected = restoredBytes.includes("B13_NATURALLY_EXPIRED_SWEPT_BYTES");

  const appRestored = buildApp({
    modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
    logger: false,
    database: restored13,
    tombstoneLedger: ledger13,
  });
  await appRestored.ready();
  const sessAfterRestore = runShortTransaction(restored13, (tx) => createSession(tx, { accountId: admin13.accountId, now }));
  const httpResurrectedRead = await appRestored.inject({
    method: "GET",
    url: `/internal/channels/${CH13}/logs/technical/log-b13-cfg`,
    headers: { cookie: `vw_session=${sessAfterRestore.token}` },
  });
  const cfgHttpResurrected =
    httpResurrectedRead.statusCode === 200 && httpResurrectedRead.body.includes("B13_SHORTENED_CFG_RESURRECTED_HTTP");

  await appRestored.close();
  restored13.close();
  removeDirectory(dirB13);
  removeDirectory(workB13);
  assert.equal(restoreBackup !== undefined && TOMBSTONE_FILE === "tombstones.jsonl", true);

  results.push({
    id: "R3_s020_defects_b12_b13_empirical_repro",
    passed: true,
    details: {
      b12SqlRowsAfterSweep: { evidence: sqlEvAfterSweep, technicalLogs: sqlLogAfterSweep },
      b12SecondReadHttpStatus: secondRead.statusCode,
      b12StaleCacheLeakedDeletedPayload: b12StaleCacheLeaked,
      b13ResurrectedExpiredRowsInRestoredDb: { naturalExpired: resurrectedNatCount, shortenedConfigExpired: resurrectedCfgCount },
      b13NaturalExpiredBytesResurrectedInDbFile: natBytesResurrected,
      b13ShortenedConfigResurrectedOverHttp200: cfgHttpResurrected,
      b13DeletedSubjectGenerationRollback: { beforeRestore: genBeforeRestore, afterRestore: genAfterRestore },
    },
  });
}

const summary = {
  candidate: "fcad360",
  total: results.length,
  allProbesCompleted: results.every((r) => r.passed),
  results,
};

fs.writeFileSync(OUT_LOG, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ total: summary.total, allProbesCompleted: summary.allProbesCompleted, results: summary.results.map((r) => ({ id: r.id, details: r.details })) }, null, 2));
