import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

const worktree = process.argv[2];
if (!worktree) {
  throw new Error("usage: tsx probe-m7e-s019-fix1.mts <worktree>");
}

const srv = (rel: string) => path.join(worktree, "apps/server", rel);
const srvRequire = createRequire(srv("package.json"));
const { eq } = srvRequire("drizzle-orm") as typeof import("drizzle-orm");

const { buildApp } = await import(srv("src/app.ts"));
const { createAccount } = await import(srv("src/auth/login.ts"));
const { grantMembership } = await import(srv("src/auth/members.ts"));
const { issueOutputToken } = await import(srv("src/auth/downstream-tokens.ts"));
const { createAuditLogPort } = await import(srv("src/db/audit-log.ts"));
const { SubjectStore } = await import(srv("src/db/repository.ts"));
const schema = await import(srv("src/db/schema/index.ts"));
const { createSubjectCleanupPort } = await import(srv("src/db/subject-cleanup.ts"));
const { runShortTransaction } = await import(srv("src/db/transaction.ts"));
const { CERTIFICATE_SUMMARY } = await import(srv("src/modules/audit-store/index.ts"));
const {
  deletionTargets,
  executeRequest,
  preferenceMarkerOf,
  startDeletionRequest,
} = await import(srv("src/modules/data-lifecycle-service/index.ts"));
const { createCandidateStore } = await import(srv("src/modules/moderation-engine/candidates/store.ts"));
const { createNicknameVerdictCache } = await import(srv("src/modules/moderation-engine/nickname-cache/cache.ts"));
const { createIdentityTracker } = await import(srv("src/modules/platform-source/youtube/identity.ts"));
const { buildRegistry } = await import(srv("src/modules/registry.ts"));
const { createScoringEngine, ScoringRefusedError } = await import(srv("src/modules/scoring-engine/index.ts"));
const { createScoringLedgerPort } = await import(srv("src/db/scoring-ledger.ts"));
const { migratedDatabase, removeDirectory, scratchDirectory, T0 } = await import(srv("test/db/helpers.ts"));
const { decisionService, seedOpenTask } = await import(srv("test/decision-service/fixtures.ts"));
const { actorFor, CHANNEL, OTHER_CHANNEL, openDataFixture, SUBJECT, TWIN } = await import(
  srv("test/data-lifecycle-service/fixtures.ts")
);

const PASSWORD = "synthetic-password-12345";
const NOW = new Date(T0);
const EXPIRES_FUTURE = "2026-12-20T00:00:00.000Z";
const CONFIG = {
  host: "127.0.0.1",
  port: 3000,
  adapters: "synthetic" as const,
  databaseFile: "data/voxward.sqlite3",
};

interface CheckRecord {
  readonly id: string;
  readonly ok: boolean;
  readonly detail: unknown;
}

const results: CheckRecord[] = [];
function record(id: string, ok: boolean, detail: unknown): void {
  results.push({ id, ok, detail });
}

function techLog(
  channelId: string,
  id: string,
  correlationId: string,
  subjectId: string | null,
  taskId: string | null,
  expiresAt = EXPIRES_FUTURE,
) {
  return {
    id,
    channelId,
    correlationId,
    batchId: null,
    taskId,
    attempt: null,
    stage: "ROUTE" as const,
    status: "OK" as const,
    level: "INFO" as const,
    errorCode: null,
    providerRef: null,
    modelRef: null,
    ruleTemplateVersion: null,
    latencyMs: null,
    subjectId,
    data: null,
    createdAt: T0,
    expiresAt,
  };
}

function changeRow(channelId: string, id: string, correlationId: string, changeKind: string, summary = "synthetic raw summary") {
  return {
    id,
    channelId,
    occurredAt: T0,
    actorKind: "SYSTEM" as const,
    actorRef: "synthetic-actor",
    changeKind,
    summary,
    outcome: "SUCCEEDED" as const,
    correlationId,
    expiresAt: EXPIRES_FUTURE,
  };
}

// ============================================================================
// F1: Live loopback HTTP server RBAC (including Q34 owner dataAdmin), Q29, Q35, N10
// ============================================================================
{
  const dir = scratchDirectory("m7e-s019-f1-");
  const database = migratedDatabase(dir);
  let app: ReturnType<typeof buildApp> | undefined;
  try {
    runShortTransaction(database, (tx: any) => {
      for (const ch of [CHANNEL, OTHER_CHANNEL]) {
        tx.insert(schema.channels)
          .values({ id: ch, platform: "youtube", platformChannelRef: `UC-${ch}`, displayName: ch, createdAt: T0, updatedAt: T0 })
          .run();
      }
      SubjectStore.create(tx, { id: SUBJECT, channelId: CHANNEL, platformSubjectKey: "synthetic-key-1", createdAt: T0 });
      SubjectStore.create(tx, { id: TWIN, channelId: CHANNEL, platformSubjectKey: "synthetic-key-2", createdAt: T0 });
    });

    const ownerPlainAcc = (await createAccount(database, { loginName: "ownerPlain", displayName: "OwnerPlain", password: PASSWORD, now: NOW })).accountId;
    const ownerDualAcc = (await createAccount(database, { loginName: "ownerDual", displayName: "OwnerDual", password: PASSWORD, now: NOW })).accountId;
    const adminAcc = (await createAccount(database, { loginName: "admin1", displayName: "Admin", password: PASSWORD, now: NOW })).accountId;
    const modAcc = (await createAccount(database, { loginName: "mod1", displayName: "Mod", password: PASSWORD, now: NOW })).accountId;
    const otherAdminAcc = (await createAccount(database, { loginName: "admin2", displayName: "OtherAdmin", password: PASSWORD, now: NOW })).accountId;
    let bearerToken = "";

    runShortTransaction(database, (tx: any) => {
      grantMembership(tx, { channelId: CHANNEL, accountId: ownerPlainAcc, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: false, now: NOW });
      grantMembership(tx, { channelId: CHANNEL, accountId: ownerDualAcc, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true, now: NOW });
      grantMembership(tx, { channelId: CHANNEL, accountId: adminAcc, role: "DATA_ADMIN", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CHANNEL, accountId: modAcc, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: OTHER_CHANNEL, accountId: otherAdminAcc, role: "DATA_ADMIN", logAccess: false, now: NOW });
      bearerToken = issueOutputToken(tx, { channelId: CHANNEL, createdByAccountId: ownerPlainAcc, now: NOW }).token;
    });

    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-f1", "corr-f1", SUBJECT, null), [
      { id: "ev-f1", kind: "MESSAGE_TEXT", payload: "synthetic viewer chat text", expiresAt: EXPIRES_FUTURE },
    ]);
    logs.insertChangeLog(changeRow(CHANNEL, "chg-f1-corr", "corr-f1", "MANUAL_VERDICT", "synthetic verdict detail"));
    logs.insertChangeLog(changeRow(CHANNEL, "chg-f1-subj", `subject:${SUBJECT}`, "LIST_CHANGED", "synthetic list detail"));

    const nicknameCache = createNicknameVerdictCache({ ttlMs: 3_600_000, maxEntries: 100, now: () => Date.now() });
    const identityTracker = createIdentityTracker({ capacity: 100 });
    const candidates = createCandidateStore({ newId: () => "card-f1", now: () => NOW, rules: { publishConfirmedTerm: () => 1 } });
    const subjectCaches = {
      names: ["CANDIDATE_CARD", "NICKNAME_CHECK", "IDENTITY_TRACKER"] as readonly string[],
      forgetSubject(name: string, ch: string, key: string, corrs: readonly string[]) {
        if (name === "CANDIDATE_CARD") return candidates.removeBySourceCorrelations(ch, corrs);
        if (name === "NICKNAME_CHECK") return nicknameCache.forget({ channelId: ch, subjectKey: key });
        if (name === "IDENTITY_TRACKER") return identityTracker.forget(key);
        return 0;
      },
    };

    app = buildApp({ modules: buildRegistry(CONFIG), logger: false, database, subjectCaches, candidateStore: candidates });
    const baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

    async function loginHttp(loginName: string) {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ loginName, password: PASSWORD }),
      });
      assert.equal(res.status, 200);
      const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
      const body = (await res.json()) as { csrfToken: string };
      return { cookie, csrf: body.csrfToken };
    }

    const ownerPlain = await loginHttp("ownerPlain");
    const ownerDual = await loginHttp("ownerDual");
    const admin = await loginHttp("admin1");
    const mod = await loginHttp("mod1");
    const otherAdmin = await loginHttp("admin2");

    // Warm LogViewer cache via HTTP before deletion
    const preTech = await fetch(`${baseUrl}/internal/channels/${CHANNEL}/logs/technical/log-f1`, {
      headers: { cookie: ownerPlain.cookie },
    });
    assert.equal(preTech.status, 200);

    // Owner without dataAdmin gets 403; MODERATOR gets 403; cross-channel gets 403; bearer gets 403; Owner WITH dataAdmin gets 201!
    const ownerPlainRes = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: ownerPlain.cookie, "x-csrf-token": ownerPlain.csrf },
      body: JSON.stringify({ subjectRef: SUBJECT, kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" }),
    });
    const modRes = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: mod.cookie, "x-csrf-token": mod.csrf },
      body: JSON.stringify({ subjectRef: SUBJECT, kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" }),
    });
    const crossRes = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: otherAdmin.cookie, "x-csrf-token": otherAdmin.csrf },
      body: JSON.stringify({ subjectRef: SUBJECT, kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" }),
    });
    const bearerRes = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify({ subjectRef: SUBJECT, kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" }),
    });
    const ownerDualCreate = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: ownerDual.cookie, "x-csrf-token": ownerDual.csrf },
      body: JSON.stringify({ subjectRef: SUBJECT, kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" }),
    });
    assert.equal(ownerDualCreate.status, 201);
    const { requestId } = (await ownerDualCreate.json()) as { requestId: string };

    const verifyRes = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests/${requestId}/verification`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: ownerDual.cookie, "x-csrf-token": ownerDual.csrf },
      body: JSON.stringify({ verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" }),
    });
    assert.equal(verifyRes.status, 200);

    const execRes = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests/${requestId}/execute`, {
      method: "POST",
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
    });
    const execBody = (await execRes.json()) as any;

    // Q35 + Q29 + N10: check LogViewer immediately after deletion
    const postTech = await fetch(`${baseUrl}/internal/channels/${CHANNEL}/logs/technical/log-f1`, {
      headers: { cookie: ownerPlain.cookie },
    });
    const postSubjChg = await fetch(`${baseUrl}/internal/channels/${CHANNEL}/logs/change?correlationId=subject:${SUBJECT}`, {
      headers: { cookie: ownerPlain.cookie },
    });
    const postSubjItems = ((await postSubjChg.json()) as any).items as Array<{ changeKind: string; summary: string }>;
    const allCertified = postSubjItems.length >= 2 && postSubjItems.every((i) => i.summary === CERTIFICATE_SUMMARY);
    const hasScoreExcCertified = postSubjItems.some((i) => i.changeKind === "SCORE_EXCEPTION_CHANGED" && i.summary === CERTIFICATE_SUMMARY);

    // Repeat execute is idempotent 200 COMPLETED
    const repeatExec = await fetch(`${baseUrl}/channels/${CHANNEL}/data/requests/${requestId}/execute`, {
      method: "POST",
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
    });
    const repeatBody = (await repeatExec.json()) as any;

    record(
      "F1-http-rbac-q34-q29-q35-n10-and-18-surfaces",
      ownerPlainRes.status === 403 &&
        modRes.status === 403 &&
        crossRes.status === 403 &&
        bearerRes.status === 403 &&
        execRes.status === 200 &&
        execBody.execution === "COMPLETED" &&
        execBody.targets.length === deletionTargets(SUBJECT, subjectCaches.names).length &&
        postTech.status === 404 &&
        allCertified &&
        hasScoreExcCertified &&
        repeatExec.status === 200 &&
        repeatBody.execution === "COMPLETED",
      {
        ownerPlainStatus: ownerPlainRes.status,
        modStatus: modRes.status,
        crossStatus: crossRes.status,
        bearerStatus: bearerRes.status,
        ownerDualCreateStatus: ownerDualCreate.status,
        execution: execBody.execution,
        targetCount: execBody.targets.length,
        postTechStatus: postTech.status,
        postSubjItems,
        repeatExecution: repeatBody.execution,
      },
    );
  } finally {
    if (app) await app.close();
    database.close();
    removeDirectory(dir);
  }
}

// ============================================================================
// F2: B8 Recheck — CandidateCard cleared when correlationId exists ONLY in channel_events
//     (Case A: technical_logs already expired/absent; Case B: CANDIDATE_CARD fails on Run 1 after step 3 deleted technical_logs, then resumes on Run 2)
// ============================================================================
{
  const fixture = openDataFixture("m7e-s019-b8-");
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");

    // Case A: event exists, NO technical_logs row at all (simulating 14d technical_logs TTL expiry)
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-b8-a",
      platformMessageRef: "msg-b8-a",
      taskId: "task-b8-a",
    });
    // TWIN card in same channel must survive
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-2",
      subjectId: TWIN,
      eventId: "ev-b8-twin",
      platformMessageRef: "msg-b8-twin",
      taskId: "task-b8-twin",
    });

    let seq = 0;
    const candidates = createCandidateStore({ newId: () => `card-b8-${++seq}`, now: () => NOW, rules: { publishConfirmedTerm: () => 1 } });
    candidates.propose({
      channelId: CHANNEL,
      term: "subject-only-in-channel-events",
      note: null,
      sourceCorrelationId: "corr-ev-b8-a",
      sourceTaskId: "task-b8-a",
    });
    candidates.propose({
      channelId: CHANNEL,
      term: "twin-must-survive",
      note: null,
      sourceCorrelationId: "corr-ev-b8-twin",
      sourceTaskId: "task-b8-twin",
    });

    const fullHub = {
      names: ["CANDIDATE_CARD", "SUBJ_CACHE"] as readonly string[],
      forgetSubject(name: string, ch: string, _key: string, corrs: readonly string[]) {
        if (name === "CANDIDATE_CARD") return candidates.removeBySourceCorrelations(ch, corrs);
        return 0;
      },
    };

    const reqA = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_DATA_ONLY",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqAId = (reqA.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, reqAId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    const execA = executeRequest({ ...fixture.deps, caches: fullHub }, admin, reqAId);
    const afterACards = candidates.listCards(CHANNEL).map((c: any) => c.term);

    // Case B: step 3 TECHNICAL_LOG deletes technical_logs on Run 1, step 4 CANDIDATE_CARD fails (unregistered), then Run 2 resumes with fullHub
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-b8-b",
      platformMessageRef: "msg-b8-b",
      taskId: "task-b8-b",
    });
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-b8-b", "corr-ev-b8-b", SUBJECT, "task-b8-b"), []);
    candidates.propose({
      channelId: CHANNEL,
      term: "subject-resume-after-techlog-deleted",
      note: null,
      sourceCorrelationId: "corr-ev-b8-b",
      sourceTaskId: "task-b8-b",
    });

    const reqB = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqBId = (reqB.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, reqBId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    startDeletionRequest({ ...fixture.deps, caches: fullHub }, admin, reqBId);

    const run1 = executeRequest(
      { ...fixture.deps, caches: { names: [] as readonly string[], forgetSubject: () => 0 } },
      admin,
      reqBId,
    );
    const run2 = executeRequest({ ...fixture.deps, caches: fullHub }, admin, reqBId);
    const afterBCards = candidates.listCards(CHANNEL).map((c: any) => c.term);

    record(
      "F2-b8-closed-candidate-cards-cleared-from-channel-events-correlations",
      (execA.body as any).execution === "COMPLETED" &&
        afterACards.length === 1 &&
        afterACards[0] === "twin-must-survive" &&
        (run1.body as any).execution === "PARTIAL_FAILED" &&
        (run2.body as any).execution === "COMPLETED" &&
        afterBCards.length === 1 &&
        afterBCards[0] === "twin-must-survive",
      {
        execA: (execA.body as any).execution,
        afterACards,
        run1: (run1.body as any).execution,
        run2: (run2.body as any).execution,
        afterBCards,
      },
    );
  } finally {
    fixture.close();
  }
}

// ============================================================================
// F3: B9 Recheck — PARTIAL_FAILED on VERDICT, TASK, and CHANNEL_EVENT + new post-exception message
//     (with deliveries, verdicts, tasks, technical_logs, technical_log_evidence) -> clean COMPLETED resume & TWIN intact
// ============================================================================
for (const failTarget of ["VERDICT", "TASK", "CHANNEL_EVENT"] as const) {
  const fixture = openDataFixture(`m7e-s019-b9-${failTarget.toLowerCase()}-`);
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");
    const logs = createAuditLogPort(database);
    const decisionSvc = decisionService(database);

    // Seed pre-deletion pipeline chain for SUBJECT and TWIN
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: `ev-pre-${failTarget}`,
      platformMessageRef: `msg-pre-${failTarget}`,
      taskId: `task-pre-${failTarget}`,
    });
    await decisionSvc.commit(
      `task-pre-${failTarget}`,
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      { contractVersion: "1", kind: "SYSTEM", source: "MODEL" },
    );
    logs.insertTechnicalLog(techLog(CHANNEL, `log-pre-${failTarget}`, `corr-ev-pre-${failTarget}`, SUBJECT, `task-pre-${failTarget}`), [
      { id: `tle-pre-${failTarget}`, kind: "MESSAGE_TEXT", payload: "pre message", expiresAt: EXPIRES_FUTURE },
    ]);

    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-2",
      subjectId: TWIN,
      eventId: `ev-twin-${failTarget}`,
      platformMessageRef: `msg-twin-${failTarget}`,
      taskId: `task-twin-${failTarget}`,
    });
    await decisionSvc.commit(
      `task-twin-${failTarget}`,
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      { contractVersion: "1", kind: "SYSTEM", source: "MODEL" },
    );

    const realCleanup = createSubjectCleanupPort(database);
    let failOnce = true;
    const flakyDeps = {
      ...fixture.deps,
      cleanup: {
        readCleanupFacts: realCleanup.readCleanupFacts,
        cleanSurface(input: any) {
          if (failOnce && input.targetKind === failTarget) {
            failOnce = false;
            throw Object.assign(new Error("simulated transient busy"), { code: "SQLITE_BUSY" });
          }
          return realCleanup.cleanSurface(input);
        },
      },
    };

    const req = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqId = (req.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });

    // Run 1 stops at failTarget (after DELIVERY is already DONE!)
    const run1 = executeRequest(flakyDeps, admin, reqId);
    assert.equal((run1.body as any).execution, "PARTIAL_FAILED");

    // While PARTIAL_FAILED, excepted viewer sends a new chat message (reviewed & delivered unscored, plus technical_logs referencing taskId!)
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: `ev-post-${failTarget}`,
      platformMessageRef: `msg-post-${failTarget}`,
      taskId: `task-post-${failTarget}`,
    });
    const postCommit = await decisionSvc.commit(
      `task-post-${failTarget}`,
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      { contractVersion: "1", kind: "SYSTEM", source: "MODEL" },
    );
    logs.insertTechnicalLog(techLog(CHANNEL, `log-post-${failTarget}`, `corr-ev-post-${failTarget}`, SUBJECT, `task-post-${failTarget}`), [
      { id: `tle-post-${failTarget}`, kind: "MESSAGE_TEXT", payload: "post exception message", expiresAt: EXPIRES_FUTURE },
    ]);

    // Resume on real fixture.deps: must sweep child rows without FK error and reach COMPLETED!
    const resume = executeRequest(fixture.deps, admin, reqId);
    const subjEventsLeft = database.orm
      .select()
      .from(schema.channelEvents)
      .where(eq(schema.channelEvents.subjectId, SUBJECT))
      .all().length;
    const subjTechLeft = database.orm
      .select()
      .from(schema.technicalLogs)
      .where(eq(schema.technicalLogs.subjectId, SUBJECT))
      .all().length;
    const twinEventsLeft = database.orm
      .select()
      .from(schema.channelEvents)
      .where(eq(schema.channelEvents.subjectId, TWIN))
      .all().length;

    record(
      `F3-b9-closed-resume-from-${failTarget.toLowerCase()}`,
      postCommit.status === "committed" &&
        postCommit.scoring === "refused" &&
        (resume.body as any).execution === "COMPLETED" &&
        subjEventsLeft === 0 &&
        subjTechLeft === 0 &&
        twinEventsLeft === 1,
      {
        failTarget,
        postCommitScoring: postCommit.scoring,
        resumeExecution: (resume.body as any).execution,
        subjEventsLeft,
        subjTechLeft,
        twinEventsLeft,
      },
    );
  } finally {
    fixture.close();
  }
}

// ============================================================================
// F4: Preference marker minimalism, ScoringRefusedError, stale generation, and RESUME_SCORING
// ============================================================================
{
  const fixture = openDataFixture("m7e-s019-f4-");
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");

    // Seed stale task BEFORE deletion
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-stale",
      platformMessageRef: "msg-stale",
      taskId: "task-stale",
    });

    const req = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqId = (req.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    startDeletionRequest(fixture.deps, admin, reqId);

    // Late task commit right after startDeletionRequest (zero scoring window!) must be rejected as STALE_GENERATION
    const decisionSvc = decisionService(database);
    const lateGen0Commit = await decisionSvc.commit(
      "task-stale",
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      { contractVersion: "1", kind: "SYSTEM", source: "MODEL" },
    );

    const exec = executeRequest(fixture.deps, admin, reqId);
    const afterCleanupCommit = await decisionSvc.commit(
      "task-stale",
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      { contractVersion: "1", kind: "SYSTEM", source: "MODEL" },
    );

    // Direct scoring engine call must throw ScoringRefusedError with reason "EXCEPTION_ACTIVE"
    const engine = createScoringEngine({ ledger: createScoringLedgerPort(database) });
    let refusedReason: string | null = null;
    try {
      await engine.applyManualCorrection({
        channelId: CHANNEL,
        subjectKey: "synthetic-key-1",
        operationId: "op-after-del",
        operatorRef: "admin-1",
        delta: 5,
        reason: "synthetic",
      });
    } catch (err) {
      if (err instanceof ScoringRefusedError) refusedReason = err.reason;
    }

    const marker = preferenceMarkerOf({
      channelId: CHANNEL,
      subjectId: SUBJECT,
      requestId: reqId,
      createdAt: T0,
    });
    const markerKeys = Object.keys(marker).sort();

    // Lift exception via RESUME_SCORING
    const resumeReq = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "RESUME_SCORING",
      requestSource: "VIEWER_REQUEST",
    });
    const resumeId = (resumeReq.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, resumeId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    const resumeExec = executeRequest(fixture.deps, admin, resumeId);
    const afterResumeSubj = fixture.deps.subjects.readSubject(CHANNEL, SUBJECT);

    record(
      "F4-stale-generation-scoring-guard-marker-and-resume",
      (exec.body as any).execution === "COMPLETED" &&
        lateGen0Commit.status === "conflict" &&
        lateGen0Commit.reason === "STALE_GENERATION" &&
        afterCleanupCommit.status === "conflict" &&
        afterCleanupCommit.reason === "TASK_NOT_FOUND" &&
        refusedReason === "EXCEPTION_ACTIVE" &&
        JSON.stringify(markerKeys) === JSON.stringify(["createdAt", "purpose", "subjectId"]) &&
        resumeExec.status === 200 &&
        afterResumeSubj?.exception === null,
      {
        lateGen0Commit,
        afterCleanupCommit,
        refusedReason,
        markerKeys,
        resumeStatus: resumeExec.status,
        exceptionAfterResume: afterResumeSubj?.exception,
      },
    );
  } finally {
    fixture.close();
  }
}

console.log(JSON.stringify({ total: results.length, allPassed: results.every((r) => r.ok), results }, null, 2));
if (!results.every((r) => r.ok)) process.exit(1);
