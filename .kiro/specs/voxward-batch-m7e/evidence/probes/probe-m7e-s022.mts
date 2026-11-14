import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const worktree = process.argv[2];
if (!worktree) {
  throw new Error("usage: tsx probe-m7e-s022.mts <worktree>");
}

const srv = (rel: string) => path.join(worktree, "apps/server", rel);
const web = (rel: string) => path.join(worktree, "apps/web", rel);
const ReactMod = await import(web("node_modules/react/index.js"));
const React = (ReactMod.default ?? ReactMod) as typeof import("react");
(globalThis as any).React = React;
const { renderToStaticMarkup } = (await import(web("node_modules/react-dom/server.node.js"))) as typeof import("react-dom/server");
const { MemoryRouter } = (await import(web("node_modules/react-router/dist/development/index.mjs"))) as typeof import("react-router");
const srvRequire = createRequire(srv("package.json"));
const { eq } = srvRequire("drizzle-orm") as typeof import("drizzle-orm");

const { buildApp } = await import(srv("src/app.ts"));
const { createAccount } = await import(srv("src/auth/login.ts"));
const { grantMembership } = await import(srv("src/auth/members.ts"));
const { issueOutputToken } = await import(srv("src/auth/downstream-tokens.ts"));
const { publishConfirmedCandidateTerm, writeChannelSetting } = await import(srv("src/db/channel-settings-store.ts"));
const { ChannelEventStore, SubjectStore, TaskStore } = await import(srv("src/db/repository.ts"));
const schema = await import(srv("src/db/schema/index.ts"));
const { runShortTransaction } = await import(srv("src/db/transaction.ts"));
const { createCandidateStore } = await import(srv("src/modules/moderation-engine/candidates/store.ts"));
const { buildRegistry } = await import(srv("src/modules/registry.ts"));
const { migratedDatabase, removeDirectory, scratchDirectory, T0 } = await import(srv("test/db/helpers.ts"));

const { UntrustedText } = await import(web("src/components/untrusted-text/UntrustedText.tsx"));
const { createDockApi, DockApiFailure } = await import(web("src/pages/dock/api.ts"));
const { DockView } = await import(web("src/pages/dock/DockPage.tsx"));
const { createModerationApi } = await import(web("src/pages/moderation/api.ts"));
const { ModerationView } = await import(web("src/pages/moderation/ModerationPage.tsx"));
const { createAdminApi } = await import(web("src/pages/admin/api.ts"));
const { AdminView } = await import(web("src/pages/admin/AdminPage.tsx"));

const PASSWORD = "synthetic-password-12345";
const NOW = new Date("2026-11-14T08:00:00.000Z");
const CH1 = "room-m7e-1";
const CH2 = "room-m7e-2";

interface CheckRecord {
  readonly id: string;
  readonly ok: boolean;
  readonly detail: unknown;
}

const results: CheckRecord[] = [];
function record(id: string, ok: boolean, detail: unknown): void {
  results.push({ id, ok, detail });
}

// ============================================================================
// P1: Q15 UntrustedText <bdi> isolation, control-char stripping, no HTML/link execution
// ============================================================================
{
  const payload = "Hello \u202E<script>alert(1)</script>\u202C \u200B\u200D\uFEFF {{tpl}} https://example.test/x\u0000\u0007";
  const html = renderToStaticMarkup(React.createElement(UntrustedText, { text: payload }));
  const hasBdi = html.includes("<bdi>") && html.includes("</bdi>");
  const escapedScript = html.includes("&lt;script&gt;alert(1)&lt;/script&gt;") && !html.includes("<script>");
  const noAnchor = !html.includes("<a ");
  const strippedControls = !html.includes("\u0000") && !html.includes("\u0007");
  const preservedBidiZeroWidth = html.includes("\u202E") && html.includes("\u200B") && html.includes("\uFEFF");
  record("P1-q15-untrusted-text-bdi-and-escaping", hasBdi && escapedScript && noAnchor && strippedControls && preservedBidiZeroWidth, {
    html,
  });
}

// ============================================================================
// P2..P4 + Defect Reproductions D1..D3 on Live Loopback HTTP Server
// ============================================================================
{
  const dir = scratchDirectory("m7e-s022-live-");
  const db = migratedDatabase(dir);
  let app: ReturnType<typeof buildApp> | undefined;
  try {
    runShortTransaction(db, (tx: any) => {
      tx.insert(schema.channels)
        .values([
          { id: CH1, platform: "youtube", platformChannelRef: "yt-m7e-1", displayName: "Room <One>", createdAt: T0, updatedAt: T0 },
          { id: CH2, platform: "youtube", platformChannelRef: "yt-m7e-2", displayName: "Room Two", createdAt: T0, updatedAt: T0 },
        ])
        .run();
      // Real distinct internal subject UUID vs derived platformSubjectKey
      SubjectStore.create(tx, { id: "sub-uuid-viewer-1", channelId: CH1, platformSubjectKey: "derived-yt-key-1", createdAt: T0 });
      SubjectStore.create(tx, { id: "sub-uuid-viewer-2", channelId: CH1, platformSubjectKey: "derived-yt-key-2", createdAt: T0 });
    });

    // P2a: Verify SQLite CHECK constraint ck_channel_members_data_admin rejects 2 and -1
    let checkConstraintRejected = false;
    try {
      db.sqlite
        .prepare(
          `INSERT INTO channel_members (id, channel_id, account_ref, role, log_access, data_admin, granted_at)
           VALUES ('bad-cm', ?, 'acc-x', 'MODERATOR', 0, 2, ?)`,
        )
        .run(CH1, T0);
    } catch (err: any) {
      checkConstraintRejected = String(err?.message ?? err).includes("ck_channel_members_data_admin");
    }

    const baseRegistry = buildRegistry({
      adapters: "synthetic",
      host: "127.0.0.1",
      port: 3000,
      databaseFile: ":memory:",
    });
    // Report realistic adapter model capabilities so Q48 selection & UI rendering can be tested end-to-end
    const modules = {
      ...baseRegistry,
      inferenceProvider: {
        ...baseRegistry.inferenceProvider,
        describe: () => ({
          contractVersion: "1" as const,
          providerName: "kiro-cli-synthetic",
          supportsCancel: true,
          models: [
            { modelId: "claude-sonnet-4", reasoningLevels: ["low", "medium", "high"] },
            { modelId: "nova-lite", reasoningLevels: [] },
          ],
        }),
      },
    };

    let cardSeq = 0;
    const candidates = createCandidateStore({
      newId: () => `cand-m7e-${++cardSeq}`,
      now: () => NOW,
      rules: {
        publishConfirmedTerm: (input: any) => publishConfirmedCandidateTerm(db, input),
      },
    });

    app = buildApp({ modules, logger: false, database: db, candidateStore: candidates });
    const baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

    const ownerAcc = (await createAccount(db, { loginName: "owner1", displayName: "Owner 1", password: PASSWORD, now: NOW })).accountId;
    const mod1Acc = (await createAccount(db, { loginName: "mod1", displayName: "Mod 1", password: PASSWORD, now: NOW })).accountId;
    const mod2Acc = (await createAccount(db, { loginName: "mod2", displayName: "Mod 2", password: PASSWORD, now: NOW })).accountId;
    const dataAdminAcc = (await createAccount(db, { loginName: "da1", displayName: "DataAdmin 1", password: PASSWORD, now: NOW })).accountId;
    let bearerToken = "";

    runShortTransaction(db, (tx: any) => {
      grantMembership(tx, { channelId: CH1, accountId: ownerAcc, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: mod1Acc, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: mod2Acc, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: dataAdminAcc, role: "DATA_ADMIN", logAccess: false, now: NOW });
      bearerToken = issueOutputToken(tx, { channelId: CH1, createdByAccountId: ownerAcc, now: NOW }).token;
    });

    async function signInSession(loginName: string) {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ loginName, password: PASSWORD }),
      });
      assert.equal(res.status, 200);
      const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
      const body = (await res.json()) as { csrfToken: string };
      const authedFetch = (input: string, init?: RequestInit) => {
        const headers = new Headers(init?.headers ?? {});
        headers.set("cookie", cookie);
        return fetch(`${baseUrl}${input}`, { ...init, headers });
      };
      return { cookie, csrf: body.csrfToken, authedFetch };
    }

    const owner = await signInSession("owner1");
    const mod1 = await signInSession("mod1");
    const mod2 = await signInSession("mod2");
    const da = await signInSession("da1");

    const ownerAdminApi = createAdminApi(owner.authedFetch);
    const mod1DockApi = createDockApi(mod1.authedFetch);
    const mod2ModApi = createModerationApi(mod2.authedFetch);

    // P2b: Q34 via POST /channels/:id/members — owner initially dataHandle=false, then grants self dataAdmin=true via HTTP
    const capBefore = await owner.authedFetch(`/channels/${CH1}/data/capabilities`);
    const beforeJson = (await capBefore.json()) as { dataHandle: boolean };
    const grantSelfDa = await ownerAdminApi.grantMember(CH1, {
      accountId: ownerAcc,
      role: "CHANNEL_OWNER",
      logAccess: true,
      dataAdmin: true,
    });
    const capAfter = await owner.authedFetch(`/channels/${CH1}/data/capabilities`);
    const afterJson = (await capAfter.json()) as { dataHandle: boolean };
    record(
      "P2-q34-migration-check-constraint-and-owner-data-admin-grant",
      checkConstraintRejected && beforeJson.dataHandle === false && grantSelfDa.dataAdmin === true && afterJson.dataHandle === true,
      { checkConstraintRejected, beforeJson, grantSelfDa, afterJson },
    );

    // P3: RBAC matrix across unauth, missing CSRF, bearer, DATA_ADMIN, MODERATOR, cross-channel CH2
    const unauthDock = (await fetch(`${baseUrl}/channels/${CH1}/dock`)).status;
    const bearerDock = (await fetch(`${baseUrl}/channels/${CH1}/dock`, { headers: { authorization: `Bearer ${bearerToken}` } })).status;
    const noCsrfToggle = (
      await owner.authedFetch(`/channels/${CH1}/sc-translation`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      })
    ).status;
    const daDock = (await da.authedFetch(`/channels/${CH1}/dock`)).status;
    const modModelGet = (await mod1.authedFetch(`/channels/${CH1}/model-settings`)).status;
    const ownerCrossCh2 = (await owner.authedFetch(`/channels/${CH2}/context`)).status;
    record(
      "P3-rbac-csrf-bearer-and-cross-channel-isolation",
      unauthDock === 401 &&
        bearerDock === 403 &&
        noCsrfToggle === 403 &&
        daDock === 403 &&
        modModelGet === 403 &&
        ownerCrossCh2 === 403,
      { unauthDock, bearerDock, noCsrfToggle, daDock, modModelGet, ownerCrossCh2 },
    );

    // P4: Backend Q48 model settings save/refuse, Q12 regex hints, Q50 candidate confirm/reject, multi-mod 409, Q17 immediate revocation
    const modelSaveOk = await ownerAdminApi.saveModelSettings(CH1, {
      realtimeModeration: { modelId: "claude-sonnet-4", reasoning: "low" },
      scTranslation: { modelId: "claude-sonnet-4", reasoning: "medium" },
      review: { modelId: "claude-sonnet-4", reasoning: "high" },
      scTranslationEnabled: true,
    });
    let modelUnsupportedStatus = 0;
    try {
      await ownerAdminApi.saveModelSettings(CH1, {
        realtimeModeration: { modelId: "unknown-model", reasoning: null },
        scTranslation: null,
        review: null,
        scTranslationEnabled: true,
      });
    } catch (err: any) {
      modelUnsupportedStatus = err.status;
    }

    let q12Hint: string | undefined;
    try {
      await ownerAdminApi.publishRules(CH1, {
        version: "v1",
        groups: [{ id: "g1", action: { kind: "BLOCK" }, rules: [{ id: "r1", kind: "regex", source: "(spam|scam)" }] }],
      });
    } catch (err: any) {
      q12Hint = err.issues?.[0]?.hint;
    }

    const c1 = candidates.propose({ channelId: CH1, term: "cand-confirm", note: "n1", sourceCorrelationId: "cc1", sourceTaskId: "ct1" });
    const c2 = candidates.propose({ channelId: CH1, term: "cand-reject", note: "n2", sourceCorrelationId: "cc2", sourceTaskId: "ct2" });
    const confirmed = await ownerAdminApi.confirmCandidate(CH1, c1!.id);
    const rejected = await ownerAdminApi.rejectCandidate(CH1, c2!.id);

    // Seed open task for multi-mod race
    runShortTransaction(db, (tx: any) => {
      ChannelEventStore.recordIfNew(tx, {
        id: "ev-race-1",
        channelId: CH1,
        subjectId: "sub-uuid-viewer-1",
        platformMessageRef: "yt-msg-race-1",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-race-1",
        exceptionMarked: false,
        createdAt: T0,
      });
      TaskStore.create(tx, {
        id: "task-race-1",
        eventId: "ev-race-1",
        kind: "REALTIME_REVIEW",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        createdAt: T0,
      });
    });
    const mod1Decide = await mod1DockApi.decideTask(CH1, "task-race-1", "ALLOW_NOISE");
    const mod2Decide = await mod2ModApi.decideTask(CH1, "task-race-1", "BLOCK");

    record(
      "P4-backend-q48-q12-q50-and-multimod-409",
      modelSaveOk.settings.realtimeModeration?.modelId === "claude-sonnet-4" &&
        modelUnsupportedStatus === 422 &&
        Boolean(q12Hint) &&
        confirmed.card.status === "CONFIRMED" &&
        rejected.card.status === "REJECTED" &&
        mod1Decide.conflict === false &&
        mod2Decide.conflict === true,
      {
        savedModel: modelSaveOk.settings.realtimeModeration,
        modelUnsupportedStatus,
        q12Hint,
        confirmedStatus: confirmed.card.status,
        rejectedStatus: rejected.card.status,
        mod1Decide,
        mod2Decide,
      },
    );

    // ========================================================================
    // DEFECT REPRODUCTION D1 (Blocker B10a):
    // ModerationPage "加入频道黑名单" passes item.subjectRef (subjects.id = "sub-uuid-viewer-1")
    // into POST /channels/:id/lists/subjects, which queries platform_subject_key ("derived-yt-key-1") -> 404 SUBJECT_NOT_FOUND!
    // ========================================================================
    const modSnapshot = await mod2ModApi.getModeration(CH1);
    const raceItem = modSnapshot.feed.liveStream.find((i: any) => i.eventId === "ev-race-1");
    assert.ok(raceItem, "expected ev-race-1 in liveStream");
    let banErrorStatus = 0;
    let banRawBody: unknown = null;
    try {
      await mod2ModApi.editSubjectList(CH1, raceItem.subjectRef, "BLACKLIST");
    } catch (err: any) {
      if (err instanceof DockApiFailure) banErrorStatus = err.status;
    }
    const directBanRes = await mod2.authedFetch(`/channels/${CH1}/lists/subjects`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": mod2.csrf },
      body: JSON.stringify({ subjectKey: raceItem.subjectRef, listKind: "BLACKLIST" }),
    });
    banRawBody = await directBanRes.json();
    const listCountAfterBanClick = db.orm.select().from(schema.listEntries).where(eq(schema.listEntries.channelId, CH1)).all().length;

    record(
      "D1-defect-b10a-moderation-ban-button-passes-uuid-causing-404",
      raceItem.subjectRef === "sub-uuid-viewer-1" &&
        banErrorStatus === 404 &&
        directBanRes.status === 404 &&
        (banRawBody as any)?.reason === "SUBJECT_NOT_FOUND" &&
        listCountAfterBanClick === 0,
      {
        itemSubjectRef: raceItem.subjectRef,
        actualPlatformSubjectKey: "derived-yt-key-1",
        banErrorStatus,
        banRawBody,
        listCountAfterBanClick,
      },
    );

    // ========================================================================
    // DEFECT REPRODUCTION D2 (Blocker B10b):
    // 1) ev-race-1 was decided ALLOW_NOISE with NO technical_log_evidence -> evEvidence is undefined ->
    //    `evEvidence?.translationJson !== null` evaluates `undefined !== null === true`, misclassifying ALLOW_NOISE chat as approvedSc!
    // 2) Seed blocked message ev-blocked-1 with offensive text -> real MODERATOR /dock returns bodyFolded=false and DockView renders raw text open by default AND omits liveStream!
    // ========================================================================
    runShortTransaction(db, (tx: any) => {
      ChannelEventStore.recordIfNew(tx, {
        id: "ev-blocked-1",
        channelId: CH1,
        subjectId: "sub-uuid-viewer-2",
        platformMessageRef: "yt-msg-blk-1",
        platformOrder: 2,
        receivedAt: T0,
        correlationId: "corr-blk-1",
        exceptionMarked: false,
        createdAt: T0,
      });
      tx.insert(schema.verdicts)
        .values({
          id: "v-blk-1",
          eventId: "ev-blocked-1",
          seq: 1,
          classification: "BLOCK",
          downstream: "BLOCK",
          source: "BASE_RULE",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system:BASE_RULE",
        })
        .run();
      tx.insert(schema.technicalLogs)
        .values({
          id: "tl-blk-1",
          channelId: CH1,
          sequence: 1,
          correlationId: "corr-blk-1",
          stage: "ROUTE",
          status: "OK",
          createdAt: T0,
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
      tx.insert(schema.technicalLogEvidence)
        .values({
          id: "tle-blk-1",
          logId: "tl-blk-1",
          evidenceKind: "MESSAGE_TEXT",
          payload: "RAW_OFFENSIVE_BLOCKED_BODY_VISIBLE_BY_DEFAULT",
          payloadBytes: Buffer.byteLength("RAW_OFFENSIVE_BLOCKED_BODY_VISIBLE_BY_DEFAULT", "utf8"),
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
    });
    writeChannelSetting(db, CH1, "connection-fault", {
      platformFault: { code: "YT_STREAM_LOST", message: "upstream disconnected" },
      modelFault: null,
    });

    const dockRealMod = await mod1DockApi.getDock(CH1);
    const noiseEventInApprovedSc = dockRealMod.feed.approvedSc.some((s: any) => s.eventId === "ev-race-1");
    const dockHtml = renderToStaticMarkup(
      React.createElement(DockView, {
        roomId: CH1,
        snapshot: dockRealMod,
        loading: false,
        error: null,
        conflict: null,
        onToggleSc: () => {},
        onDecideTask: () => {},
        onReviewEvent: () => {},
        onResend: () => {},
      }),
    );
    const blockedRawExposedByDefault = dockHtml.includes("RAW_OFFENSIVE_BLOCKED_BODY_VISIBLE_BY_DEFAULT");
    const dockRendersLiveStreamSection = dockHtml.includes("实时流");

    // Q17 immediate revocation check on mod2
    await ownerAdminApi.revokeMember(CH1, mod2Acc);
    let postRevokeStatus = 0;
    try {
      await mod2ModApi.getModeration(CH1);
    } catch (err: any) {
      postRevokeStatus = err.status;
    }

    record(
      "D2-defect-b10b-approvedsc-pollution-missing-dock-livestream-and-unfolded-blocked-body",
      noiseEventInApprovedSc === true &&
        blockedRawExposedByDefault === true &&
        dockRendersLiveStreamSection === false &&
        postRevokeStatus === 403,
      {
        noiseEventInApprovedSc,
        approvedScEventIds: dockRealMod.feed.approvedSc.map((s: any) => s.eventId),
        blockedItemBodyFoldedForRealMod: dockRealMod.feed.blockedItems[0]?.bodyFolded,
        blockedRawExposedByDefault,
        dockRendersLiveStreamSection,
        q17PostRevokeStatus: postRevokeStatus,
      },
    );

    // ========================================================================
    // DEFECT REPRODUCTION D3 (Blocker B11):
    // AdminPage / AdminView omits real model options & selection values and leaves 9/12 AdminApi mutations unwired
    // ========================================================================
    const ownerCtx = await ownerAdminApi.getContext(CH1);
    const ownerRules = await ownerAdminApi.getRules(CH1);
    const ownerCands = await ownerAdminApi.listCandidates(CH1);
    const ownerMembers = await ownerAdminApi.listMembers(CH1);
    const ownerModels = await ownerAdminApi.getModelSettings(CH1);
    const ownerAdminSettings = await ownerAdminApi.getAdminSettings(CH1);
    const ownerOutputs = await ownerAdminApi.getOutputs(CH1);

    const adminHtml = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AdminView, {
          channelId: CH1,
          channels: [],
          context: ownerCtx,
          rules: ownerRules,
          ruleIssues: [],
          candidates: ownerCands,
          members: ownerMembers,
          modelSettings: ownerModels,
          adminSettings: ownerAdminSettings,
          outputs: ownerOutputs,
          error: null,
          onConfirmCandidate: () => {},
          onRejectCandidate: () => {},
          onRevokeMember: () => {},
        }),
      ),
    );

    const adminSource = fs.readFileSync(web("src/pages/admin/AdminPage.tsx"), "utf8");
    const unwiredMutations = [
      "publishRules",
      "editSubjectList",
      "editTerm",
      "grantMember",
      "saveModelSettings",
      "saveAdminSettings",
      "issueOutputGrant",
      "revokeOutputGrant",
      "issueOutputToken",
      "revokeOutputToken",
    ].filter((m) => !adminSource.includes(m));

    const rendersSavedOrAvailableModelIds =
      adminHtml.includes("claude-sonnet-4") || adminHtml.includes("nova-lite");
    const hasFormInputsOrSelects =
      adminHtml.includes("<input") || adminHtml.includes("<select") || adminHtml.includes("<textarea");

    record(
      "D3-defect-b11-admin-page-omits-model-params-and-leaves-10-mutations-unwired",
      rendersSavedOrAvailableModelIds === false &&
        hasFormInputsOrSelects === false &&
        unwiredMutations.length === 10,
      {
        backendSavedRealtimeModel: ownerModels.settings.realtimeModeration,
        backendCapabilityModels: ownerModels.capabilities.models,
        rendersSavedOrAvailableModelIds,
        hasFormInputsOrSelects,
        unwiredMutationsCount: unwiredMutations.length,
        unwiredMutations,
      },
    );
  } finally {
    if (app) await app.close();
    db.close();
    removeDirectory(dir);
  }
}

console.log(JSON.stringify({ total: results.length, allPassed: results.every((r) => r.ok), results }, null, 2));
if (!results.every((r) => r.ok)) process.exit(1);
