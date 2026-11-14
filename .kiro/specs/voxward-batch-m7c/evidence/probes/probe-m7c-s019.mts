import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

const worktree = process.argv[2];
if (!worktree) {
  throw new Error("usage: tsx probe-m7c-s019.mts <worktree>");
}

const srv = (rel: string) => path.join(worktree, "apps/server", rel);
const srvRequire = createRequire(srv("package.json"));
const { eq } = srvRequire("drizzle-orm") as typeof import("drizzle-orm");

const { buildApp } = await import(srv("src/app.ts"));
const { createAccount } = await import(srv("src/auth/login.ts"));
const { grantMembership } = await import(srv("src/auth/members.ts"));
const { issueOutputToken } = await import(srv("src/auth/downstream-tokens.ts"));
const { createAuditLogPort } = await import(srv("src/db/audit-log.ts"));
const { createDataRequestPort } = await import(srv("src/db/data-request-store.ts"));
const { createDecisionStorePort } = await import(srv("src/db/decision-store.ts"));
const { ScoreExceptionStore, SubjectStore } = await import(srv("src/db/repository.ts"));
const { createScoringLedgerPort } = await import(srv("src/db/scoring-ledger.ts"));
const schema = await import(srv("src/db/schema/index.ts"));
const { createSubjectCleanupPort } = await import(srv("src/db/subject-cleanup.ts"));
const { createSubjectReadPort } = await import(srv("src/db/subject-read.ts"));
const { runShortTransaction } = await import(srv("src/db/transaction.ts"));
const { CERTIFICATE_SUMMARY } = await import(srv("src/modules/audit-store/index.ts"));
const { RETENTION_DAYS } = await import(srv("src/modules/audit-store/content-policy.ts"));
const {
  createDataRoutes,
  deletionTargets,
  executeRequest,
  preferenceMarkerOf,
  startDeletionRequest,
} = await import(srv("src/modules/data-lifecycle-service/index.ts"));
const { createDecisionService, createListAdministration } = await import(srv("src/modules/decision-service/index.ts"));
const { createCandidateStore } = await import(srv("src/modules/moderation-engine/candidates/store.ts"));
const { createNicknameVerdictCache } = await import(srv("src/modules/moderation-engine/nickname-cache/cache.ts"));
const { planRoute } = await import(srv("src/modules/moderation-engine/routing/truth-table.ts"));
const { createIdentityTracker } = await import(srv("src/modules/platform-source/youtube/identity.ts"));
const { buildRegistry } = await import(srv("src/modules/registry.ts"));
const { createScoringEngine, ScoringRefusedError } = await import(srv("src/modules/scoring-engine/index.ts"));
const { migratedDatabase, removeDirectory, scratchDirectory, T0 } = await import(srv("test/db/helpers.ts"));
const { decisionDeps, decisionService, moderator, seedOpenTask } = await import(srv("test/decision-service/fixtures.ts"));
const { actorFor, CHANNEL, OTHER_CHANNEL, openDataFixture, SUBJECT, TWIN } = await import(
  srv("test/data-lifecycle-service/fixtures.ts")
);

const PASSWORD = "synthetic-password-12345";
const NOW = new Date(T0);
const EXPIRES_FUTURE = "2026-12-20T00:00:00.000Z";
const EXPIRES_PAST = "2026-11-01T00:00:00.000Z";
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

function techLog(channelId: string, id: string, correlationId: string, subjectId: string | null, taskId: string | null, expiresAt = EXPIRES_FUTURE) {
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
// SECTION A: Real buildApp HTTP permissions, validation, default hub & Q35/Q29
// ============================================================================
{
  const dir = scratchDirectory("m7c-probe-a-");
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

    const ownerAcc = (await createAccount(database, { loginName: "owner1", displayName: "Owner", password: PASSWORD, now: NOW })).accountId;
    const adminAcc = (await createAccount(database, { loginName: "admin1", displayName: "Admin", password: PASSWORD, now: NOW })).accountId;
    const modAcc = (await createAccount(database, { loginName: "mod1", displayName: "Mod", password: PASSWORD, now: NOW })).accountId;
    const otherAdminAcc = (await createAccount(database, { loginName: "admin2", displayName: "OtherAdmin", password: PASSWORD, now: NOW })).accountId;
    let bearerToken = "";

    runShortTransaction(database, (tx: any) => {
      grantMembership(tx, { channelId: CHANNEL, accountId: ownerAcc, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CHANNEL, accountId: adminAcc, role: "DATA_ADMIN", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CHANNEL, accountId: modAcc, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: OTHER_CHANNEL, accountId: otherAdminAcc, role: "DATA_ADMIN", logAccess: false, now: NOW });
      bearerToken = issueOutputToken(tx, {
        channelId: CHANNEL,
        createdByAccountId: ownerAcc,
        now: NOW,
      }).token;
    });

    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-http-1", "corr-http-1", SUBJECT, null), [
      { id: "ev-http-1", kind: "MESSAGE_TEXT", payload: "synthetic viewer chat text", expiresAt: EXPIRES_FUTURE },
    ]);
    logs.insertChangeLog(changeRow(CHANNEL, "chg-http-1", "corr-http-1", "MANUAL_VERDICT", "synthetic verdict detail"));
    logs.insertChangeLog(changeRow(CHANNEL, "chg-http-2", `subject:${SUBJECT}`, "LIST_CHANGED", "synthetic list detail"));

    // Omit both invalidation and subjectCaches so buildApp uses its production default bus & NO_SUBJECT_CACHES.
    app = buildApp({ modules: buildRegistry(CONFIG), logger: false, database });

    async function signIn(loginName: string) {
      const res = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName, password: PASSWORD } });
      assert.equal(res.statusCode, 200);
      const body = res.json() as { csrfToken: string };
      return { cookie: String(res.headers["set-cookie"]).split(";")[0] ?? "", csrf: body.csrfToken };
    }

    const owner = await signIn("owner1");
    const admin = await signIn("admin1");
    const mod = await signIn("mod1");
    const otherAdmin = await signIn("admin2");

    const adminHeaders = { cookie: admin.cookie, "x-csrf-token": admin.csrf };
    const ownerHeaders = { cookie: owner.cookie, "x-csrf-token": owner.csrf };

    // A1: Validation on POST /channels/:id/data/requests
    const badDeleteNoMode = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests`,
      headers: adminHeaders,
      payload: { subjectRef: SUBJECT, kind: "DELETE", requestSource: "OPERATOR_INITIATED" },
    });
    const badResumeWithMode = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests`,
      headers: adminHeaders,
      payload: { subjectRef: SUBJECT, kind: "RESUME_SCORING", mode: "DELETE_DATA_ONLY", requestSource: "OPERATOR_INITIATED" },
    });
    const createAccess = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests`,
      headers: adminHeaders,
      payload: { subjectRef: SUBJECT, kind: "ACCESS", requestSource: "OPERATOR_INITIATED" },
    });
    const accessId = (createAccess.json() as { requestId: string }).requestId;
    await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${accessId}/verification`,
      headers: adminHeaders,
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    record("A1-request-validation", badDeleteNoMode.statusCode === 400 && badResumeWithMode.statusCode === 400 && createAccess.statusCode === 201, {
      deleteNoMode: badDeleteNoMode.statusCode,
      resumeWithMode: badResumeWithMode.statusCode,
      accessCreated: createAccess.statusCode,
    });

    // Create DELETE_AND_EXCEPT request (unverified initially)
    const createDel = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests`,
      headers: adminHeaders,
      payload: { subjectRef: SUBJECT, kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" },
    });
    assert.equal(createDel.statusCode, 201);
    const delId = (createDel.json() as { requestId: string }).requestId;

    // A2: Authorization matrix on POST .../execute
    const unauthExec = await app.inject({ method: "POST", url: `/channels/${CHANNEL}/data/requests/${delId}/execute` });
    const noCsrfExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${delId}/execute`,
      headers: { cookie: admin.cookie },
    });
    const bearerExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${delId}/execute`,
      headers: { authorization: `Bearer ${bearerToken}` },
    });
    const modExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${delId}/execute`,
      headers: { cookie: mod.cookie, "x-csrf-token": mod.csrf },
    });
    const crossChannelExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${delId}/execute`,
      headers: { cookie: otherAdmin.cookie, "x-csrf-token": otherAdmin.csrf },
    });
    record(
      "A2-execute-auth-matrix",
      unauthExec.statusCode === 401 &&
        noCsrfExec.statusCode === 403 &&
        bearerExec.statusCode === 403 &&
        modExec.statusCode === 403 &&
        crossChannelExec.statusCode === 403,
      {
        unauth: unauthExec.statusCode,
        noCsrf: noCsrfExec.statusCode,
        bearer: bearerExec.statusCode,
        moderator: modExec.statusCode,
        crossChannel: crossChannelExec.statusCode,
      }
    );

    // A3: Unverified DELETE -> 409 NOT_VERIFIED; verified ACCESS -> 409 NOT_EXECUTABLE; unknown -> 404
    const unverifiedExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${delId}/execute`,
      headers: adminHeaders,
    });
    const accessExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${accessId}/execute`,
      headers: adminHeaders,
    });
    const missingExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/missing-req/execute`,
      headers: adminHeaders,
    });
    record(
      "A3-execute-state-guards",
      unverifiedExec.statusCode === 409 &&
        unverifiedExec.json().error === "NOT_VERIFIED" &&
        accessExec.statusCode === 409 &&
        accessExec.json().error === "NOT_EXECUTABLE" &&
        missingExec.statusCode === 404,
      {
        unverified: { status: unverifiedExec.statusCode, body: unverifiedExec.json() },
        access: { status: accessExec.statusCode, body: accessExec.json() },
        missing: { status: missingExec.statusCode, body: missingExec.json() },
      }
    );

    // Warm up LogViewer cache via HTTP BEFORE deletion (Q35 + Q29)
    const techBefore = await app.inject({
      method: "GET",
      url: `/internal/channels/${CHANNEL}/logs/technical/log-http-1`,
      headers: { cookie: owner.cookie },
    });
    const chainBefore = await app.inject({
      method: "GET",
      url: `/internal/channels/${CHANNEL}/logs/chains/corr-http-1`,
      headers: { cookie: owner.cookie },
    });
    const subjChgBefore = await app.inject({
      method: "GET",
      url: `/internal/channels/${CHANNEL}/logs/change?correlationId=subject:${SUBJECT}`,
      headers: { cookie: owner.cookie },
    });
    assert.equal(techBefore.statusCode, 200);
    assert.equal(chainBefore.statusCode, 200);
    assert.equal(subjChgBefore.statusCode, 200);

    // Verify and execute DELETE_AND_EXCEPT
    const verRes = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${delId}/verification`,
      headers: adminHeaders,
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    assert.equal(verRes.statusCode, 200);
    const execRes = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${delId}/execute`,
      headers: adminHeaders,
    });
    const execBody = execRes.json() as any;

    // Immediately read LogViewer HTTP endpoints again: ViewerCache must have been invalidated via shared bus!
    const techAfter = await app.inject({
      method: "GET",
      url: `/internal/channels/${CHANNEL}/logs/technical/log-http-1`,
      headers: { cookie: owner.cookie },
    });
    const chainAfter = await app.inject({
      method: "GET",
      url: `/internal/channels/${CHANNEL}/logs/chains/corr-http-1`,
      headers: { cookie: owner.cookie },
    });
    const chainChgAfter = await app.inject({
      method: "GET",
      url: `/internal/channels/${CHANNEL}/logs/change?correlationId=corr-http-1`,
      headers: { cookie: owner.cookie },
    });
    const subjChgAfter = await app.inject({
      method: "GET",
      url: `/internal/channels/${CHANNEL}/logs/change?correlationId=subject:${SUBJECT}`,
      headers: { cookie: owner.cookie },
    });
    const subjChgItems = (subjChgAfter.json() as any).items ?? [];
    const chainAfterJson = chainAfter.json() as any;
    const chainChgItems = (chainChgAfter.json() as any).items ?? [];

    // Check CHANNEL_OWNER is also refused on data routes (403 FORBIDDEN — only DATA_ADMIN holds data.handle), while DATA_ADMIN succeeds on RESUME_SCORING
    const ownerDataForbidden = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests`,
      headers: ownerHeaders,
      payload: { subjectRef: SUBJECT, kind: "RESUME_SCORING", requestSource: "OPERATOR_INITIATED" },
    });
    const resumeCreate = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests`,
      headers: adminHeaders,
      payload: { subjectRef: SUBJECT, kind: "RESUME_SCORING", requestSource: "OPERATOR_INITIATED" },
    });
    const resumeId = (resumeCreate.json() as { requestId: string }).requestId;
    await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${resumeId}/verification`,
      headers: adminHeaders,
      payload: { verdict: "VERIFIED", method: "REQUEST_AUTHORIZATION" },
    });
    const resumeExec = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${resumeId}/execute`,
      headers: adminHeaders,
    });
    const resumeReplay = await app.inject({
      method: "POST",
      url: `/channels/${CHANNEL}/data/requests/${resumeId}/execute`,
      headers: adminHeaders,
    });

    record(
      "A4-http-execute-q35-q29-and-default-hub",
      execRes.statusCode === 200 &&
        execBody.execution === "COMPLETED" &&
        execBody.targets.length === 15 &&
        execBody.targets.every((i: any) => i.state === "DONE" && i.targetKind !== "CANDIDATE_CARD" && i.targetKind !== "CACHE") &&
        techAfter.statusCode === 404 &&
        Array.isArray(chainAfterJson.items) &&
        chainAfterJson.items.length === 0 &&
        chainChgItems.some((c: any) => c.id === "chg-http-1" && c.summary === CERTIFICATE_SUMMARY) &&
        subjChgItems.some((c: any) => c.id === "chg-http-2" && c.summary === CERTIFICATE_SUMMARY) &&
        ownerDataForbidden.statusCode === 403 &&
        resumeExec.statusCode === 200 &&
        resumeExec.json().outcome === "RESUMED" &&
        resumeReplay.statusCode === 409,
      {
        execStatus: execRes.statusCode,
        itemCountDefaultHub: execBody.targets.length,
        counts: execBody.counts,
        techAfterStatus: techAfter.statusCode,
        chainTechnicalCountAfter: chainAfterJson.items?.length,
        chainChangeSummaries: chainChgItems.map((c: any) => ({ id: c.id, summary: c.summary })),
        subjectChainSummaries: subjChgItems.map((c: any) => ({ id: c.id, kind: c.changeKind, summary: c.summary })),
        ownerDataForbidden: ownerDataForbidden.statusCode,
        resumeOutcome: resumeExec.json(),
        resumeReplayStatus: resumeReplay.statusCode,
      }
    );
  } finally {
    if (app) await app.close();
    database.close();
    removeDirectory(dir);
  }
}

// ============================================================================
// SECTION B: SUB-035 Atomicity, Zero Scoring Window, Late Callbacks, Exception
// ============================================================================
{
  const fixture = openDataFixture("m7c-probe-b-");
  try {
    const { database, deps, routes } = fixture;
    const admin = actorFor("DATA_ADMIN");
    // TWIN starts without exception in openDataFixture; SUBJECT starts with exception-1.
    // Seed an open pre-deletion task (generation 0) on TWIN before deletion starts.
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-2",
      subjectId: TWIN,
      eventId: "ev-twin-gen0",
      platformMessageRef: "msg-twin-gen0",
      taskId: "task-twin-gen0",
    });

    const createReq = routes.createRequest(admin, {
      subjectRef: TWIN,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqId = (createReq.body as { requestId: string }).requestId;
    routes.decideVerification(admin, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });

    // B1: Fault injection in startDeletion (duplicate target ID after ensureActive + bumpGeneration)
    const dupTargets = [
      { id: "dup-item-1", targetKind: "CHANGE_LOG" as const, targetRef: TWIN },
      { id: "dup-item-1", targetKind: "TECHNICAL_LOG" as const, targetRef: TWIN },
    ];
    let threw = false;
    try {
      deps.requests.startDeletion({
        requestId: reqId,
        channelId: CHANNEL,
        subjectId: TWIN,
        mode: "DELETE_AND_EXCEPT",
        at: T0,
        exceptionId: "exc-rollback-test",
        exceptionChange: changeRow(CHANNEL, "chg-exc-rb", `subject:${TWIN}`, "SCORE_EXCEPTION_CHANGED"),
        targets: dupTargets,
        startChange: changeRow(CHANNEL, "chg-start-rb", `data-request:${reqId}`, "DATA_REQUEST_CHANGED"),
      });
    } catch {
      threw = true;
    }
    const twinGenAfterRollback = database.orm.select().from(schema.subjects).where(eq(schema.subjects.id, TWIN)).get()?.processingGeneration;
    const twinExcAfterRollback = database.orm.select().from(schema.scoreExceptions).where(eq(schema.scoreExceptions.subjectId, TWIN)).all();
    const itemsAfterRollback = deps.requests.readItems(reqId);
    const stateAfterRollback = deps.requests.readRequest(CHANNEL, reqId)?.executionState;
    record(
      "B1-startDeletion-atomic-rollback",
      threw && twinGenAfterRollback === 0 && twinExcAfterRollback.length === 0 && itemsAfterRollback.length === 0 && stateAfterRollback === "PENDING",
      { threw, twinGenAfterRollback, excCount: twinExcAfterRollback.length, itemCount: itemsAfterRollback.length, stateAfterRollback }
    );

    // B2: Normal startDeletionRequest -> atomic commit & zero window before cleanup runs + idempotent repeat
    const start1 = startDeletionRequest(deps, admin, reqId);
    const genAfterStart = database.orm.select().from(schema.subjects).where(eq(schema.subjects.id, TWIN)).get()?.processingGeneration;
    const excAfterStart = database.orm.select().from(schema.scoreExceptions).where(eq(schema.scoreExceptions.subjectId, TWIN)).all();
    const start2 = startDeletionRequest(deps, admin, reqId);
    const genAfterRepeat = database.orm.select().from(schema.subjects).where(eq(schema.subjects.id, TWIN)).get()?.processingGeneration;
    const excAfterRepeat = database.orm.select().from(schema.scoreExceptions).where(eq(schema.scoreExceptions.subjectId, TWIN)).all();

    // Immediately attempt scoring BEFORE cleanup runs -> zero scoring window!
    const scoring = createScoringEngine({ ledger: createScoringLedgerPort(database), clock: () => NOW });
    let realtimeScoreErr = "";
    let identityScoreErr = "";
    let manualScoreErr = "";
    try {
      await scoring.applyVerdict(
        {
          contractVersion: "1",
          platform: "youtube",
          channelId: CHANNEL,
          platformMessageId: "msg-window-check",
          platformOrder: 2,
          receivedAt: T0,
          correlationId: "corr-window-check",
          body: "synthetic",
          sender: { contractVersion: "1", senderRef: "synthetic-key-2" },
        },
        { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] }
      );
    } catch (e: any) {
      realtimeScoreErr = e instanceof ScoringRefusedError ? e.reason : String(e);
    }
    try {
      await scoring.applyIdentityTransition({
        channelId: CHANNEL,
        subjectKey: "synthetic-key-2",
        nextKind: "PAID_MEMBER",
        sourceEventRef: "id-window-check",
        effectiveFrom: T0,
      });
    } catch (e: any) {
      identityScoreErr = e instanceof ScoringRefusedError ? e.reason : String(e);
    }
    try {
      await scoring.applyManualCorrection({
        channelId: CHANNEL,
        subjectKey: "synthetic-key-2",
        operationId: "op-window-check",
        operatorRef: "admin-1",
        delta: 5,
        reason: "synthetic",
      });
    } catch (e: any) {
      manualScoreErr = e instanceof ScoringRefusedError ? e.reason : String(e);
    }

    record(
      "B2-zero-scoring-window-and-idempotent-start",
      start1.status === 200 &&
        start2.status === 200 &&
        genAfterStart === 1 &&
        genAfterRepeat === 1 &&
        excAfterStart.length === 1 &&
        excAfterRepeat.length === 1 &&
        realtimeScoreErr === "EXCEPTION_ACTIVE" &&
        identityScoreErr === "EXCEPTION_ACTIVE" &&
        manualScoreErr === "EXCEPTION_ACTIVE",
      { genAfterStart, genAfterRepeat, excCount: excAfterRepeat.length, realtimeScoreErr, identityScoreErr, manualScoreErr }
    );

    // B3: Late gen-0 task callback discarded with STALE_GENERATION
    const decDeps = decisionDeps(database);
    const decisionSvc = decisionService(database);
    const modelOrigin = { contractVersion: "1" as const, kind: "SYSTEM" as const, source: "MODEL" as const };
    const lateCommit = await decisionSvc.commit(
      "task-twin-gen0",
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      modelOrigin
    );
    const verdictsForGen0 = database.orm.select().from(schema.verdicts).where(eq(schema.verdicts.eventId, "ev-twin-gen0")).all();
    record("B3-late-gen0-verdict-discarded", lateCommit.status === "conflict" && lateCommit.reason === "STALE_GENERATION" && verdictsForGen0.length === 0, {
      lateCommit,
      verdictsWritten: verdictsForGen0.length,
    });

    // B4: Exception routing truth table & post-exception generation-1 message still reviewed without scoring
    const routeNoise = planRoute({
      baseRoute: "PASS",
      exceptionMarked: true,
      paidText: false,
      whitelisted: true,
      noise: true,
      scoreReachesFastPass: true,
    });
    const routeBlock = planRoute({
      baseRoute: "BLOCK",
      exceptionMarked: true,
      paidText: false,
      whitelisted: true,
      noise: false,
      scoreReachesFastPass: true,
    });
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-2",
      subjectId: TWIN,
      eventId: "ev-twin-gen1",
      platformMessageRef: "msg-twin-gen1",
      taskId: "task-twin-gen1",
    });
    const gen1Commit = await decisionSvc.commit(
      "task-twin-gen1",
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      modelOrigin
    );
    const ledgerRowsTwin = database.orm.select().from(schema.scoreLedger).where(eq(schema.scoreLedger.subjectId, TWIN)).all();
    record(
      "B4-exception-new-message-reviewed-unscored",
      routeNoise.kind === "REVIEW" &&
        routeNoise.reason === "EXCEPTION" &&
        routeBlock.kind === "FINAL" &&
        routeBlock.reason === "BASE_BLOCK" &&
        gen1Commit.status === "committed" &&
        gen1Commit.scoring === "refused" &&
        gen1Commit.actualDelta === 0 &&
        ledgerRowsTwin.length === 0,
      { routeNoise, routeBlock, gen1CommitStatus: gen1Commit.status, scoring: (gen1Commit as any).scoring, ledgerRowsTwin: ledgerRowsTwin.length }
    );

    // B5: Minimal preference marker & non-resume operations cannot lift exception
    const marker = preferenceMarkerOf(TWIN, T0);
    const listAdmin = createListAdministration(decDeps);
    listAdmin.editSubjectList(moderator("mod-1", CHANNEL), { subjectKey: "synthetic-key-2", listKind: null });
    // DELETE_DATA_ONLY on already-excepted SUBJECT preserves SUBJECT's active exception
    const dataOnlyOnExcepted = routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_DATA_ONLY",
      requestSource: "OPERATOR_INITIATED",
    });
    const dataOnlyId = (dataOnlyOnExcepted.body as { requestId: string }).requestId;
    routes.decideVerification(admin, dataOnlyId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    const dataOnlyExec = executeRequest(deps, admin, dataOnlyId);
    const subjectExcStillActive = deps.subjects.readSubject(CHANNEL, SUBJECT)?.exception !== null;
    const twinExcStillActive = deps.subjects.readSubject(CHANNEL, TWIN)?.exception !== null;

    record(
      "B5-preference-marker-and-exception-persistence",
      Object.keys(marker).sort().join(",") === "createdAt,purpose,subjectId" &&
        marker.purpose === "SCORING_EXCEPTION_PREFERENCE" &&
        dataOnlyExec.status === 200 &&
        subjectExcStillActive &&
        twinExcStillActive,
      { marker, subjectExcStillActive, twinExcStillActive }
    );
  } finally {
    fixture.close();
  }
}

// ============================================================================
// SECTION C: SUB-036 18-surface cleanup, TWIN isolation, EXCEPTION_NOT_CONFIRMED
// ============================================================================
{
  const fixture = openDataFixture("m7c-probe-c-");
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-c-1",
      platformMessageRef: "msg-c-1",
      taskId: "task-c-1",
    });
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-2",
      subjectId: TWIN,
      eventId: "ev-c-2",
      platformMessageRef: "msg-c-2",
      taskId: "task-c-2",
    });
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-c-1", "corr-c-1", SUBJECT, null), [
      { id: "evd-1", kind: "MESSAGE_TEXT", payload: "synthetic text", expiresAt: EXPIRES_FUTURE },
      { id: "evd-2", kind: "TRANSLATION", payload: "synthetic trans", expiresAt: EXPIRES_FUTURE },
      { id: "evd-3", kind: "VALIDATED_JSON", payload: "{}", expiresAt: EXPIRES_FUTURE },
      { id: "evd-4", kind: "ITEM_ID_MAP", payload: "{\"i0\":\"ev-c-1\"}", expiresAt: EXPIRES_FUTURE },
    ]);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-c-taskonly", "corr-c-1", null, "task-c-1"), []);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-c-twin", "corr-c-2", TWIN, "task-c-2"), [
      { id: "evd-twin", kind: "MESSAGE_TEXT", payload: "twin text", expiresAt: EXPIRES_FUTURE },
    ]);
    logs.insertChangeLog(changeRow(CHANNEL, "chg-c-1", "corr-c-1", "MANUAL_VERDICT"));
    logs.insertChangeLog(changeRow(CHANNEL, "chg-c-subj", `subject:${SUBJECT}`, "LIST_CHANGED"));
    logs.insertChangeLog(changeRow(CHANNEL, "chg-c-twin", `subject:${TWIN}`, "LIST_CHANGED"));
    database.orm
      .insert(schema.scoreOutcomes)
      .values([
        { idempotencyKey: "out-c-1", subjectId: SUBJECT, outcome: "REFUSED", reasonCode: "EXCEPTION_ACTIVE", createdAt: T0 },
        { idempotencyKey: "out-c-2", subjectId: TWIN, outcome: "NO_EFFECT", reasonCode: "ZERO_DELTA", createdAt: T0 },
      ])
      .run();

    const candidates = createCandidateStore({ newId: () => `card-${Math.random()}`, now: () => NOW, rules: { publishConfirmedTerm: () => 1 } });
    candidates.propose({ channelId: CHANNEL, term: "subj-term", note: "subj-note", sourceCorrelationId: "corr-c-1", sourceTaskId: "task-c-1" });
    candidates.propose({ channelId: CHANNEL, term: "twin-term", note: null, sourceCorrelationId: "corr-c-2", sourceTaskId: "task-c-2" });

    const nicknames = createNicknameVerdictCache({ ttlMs: 60_000, maxEntries: 50, now: () => 0 });
    nicknames.store({ channelId: CHANNEL, senderRef: "synthetic-key-1" }, "d1", "v1", { scope: "nickname", hits: [], complete: true });
    nicknames.store({ channelId: CHANNEL, senderRef: "synthetic-key-2" }, "d2", "v1", { scope: "nickname", hits: [], complete: true });

    const identities = createIdentityTracker({ capacity: 10 });
    identities.observe({
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      observation: { kind: "MODERATOR", certain: true, evidence: "isChatModerator", subscription: "NOT_PROVIDED" },
      sourceEventRef: "msg-c-1",
      effectiveFrom: T0,
    });

    const hub = {
      names: ["CANDIDATE_CARD", "NICKNAME_VERDICT", "IDENTITY_TRACKER"],
      forgetSubject(name: string, channelId: string, key: string, corrIds: readonly string[]) {
        if (name === "CANDIDATE_CARD") return candidates.removeBySourceCorrelations(channelId, corrIds);
        if (name === "NICKNAME_VERDICT") return nicknames.forget({ channelId, senderRef: key });
        return identities.forget(key);
      },
    };

    let failLedgerOnce = true;
    const realCleanup = createSubjectCleanupPort(database);
    const deps = {
      ...fixture.deps,
      caches: hub,
      cleanup: {
        readCleanupFacts: (ch: string, s: string) => realCleanup.readCleanupFacts(ch, s),
        cleanSurface(input: any) {
          if (failLedgerOnce && input.targetKind === "SCORE_LEDGER") {
            failLedgerOnce = false;
            throw Object.assign(new Error("boom"), { code: "INJECTED_LEDGER_ERR" });
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

    // C1: Run 1 fails at SCORE_LEDGER -> PARTIAL_FAILED
    const run1 = executeRequest(deps, admin, reqId);
    // C3 check: Lift exception mid-flight via RESUME_SCORING, then run 2 finishes all 18 items -> MUST STILL BE PARTIAL_FAILED (EXCEPTION_NOT_CONFIRMED)!
    const resumeReq = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "RESUME_SCORING",
      requestSource: "OPERATOR_INITIATED",
    });
    const resumeId = (resumeReq.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, resumeId, { verdict: "VERIFIED", method: "REQUEST_AUTHORIZATION" });
    const liftedMidFlight = executeRequest(deps, admin, resumeId);

    const run2WithoutException = executeRequest(deps, admin, reqId);
    const itemsAfterRun2 = deps.requests.readItems(reqId);
    const all18Done = itemsAfterRun2.length === 18 && itemsAfterRun2.every((i: any) => i.itemState === "DONE");
    const lastChangeSummary = database.orm
      .select()
      .from(schema.changeLogs)
      .where(eq(schema.changeLogs.changeKind, "DATA_REQUEST_CHANGED"))
      .all()
      .map((r: any) => r.summary);

    record(
      "C1-C3-18-surfaces-twin-isolation-and-exception-not-confirmed",
      (run1.body as any).execution === "PARTIAL_FAILED" &&
        liftedMidFlight.status === 200 &&
        all18Done &&
        (run2WithoutException.body as any).execution === "PARTIAL_FAILED" &&
        lastChangeSummary.some((s: string) => s.includes("EXCEPTION_NOT_CONFIRMED")) &&
        candidates.listCards(CHANNEL).map((c: any) => c.term).join(",") === "twin-term" &&
        nicknames.lookup({ channelId: CHANNEL, senderRef: "synthetic-key-1" }, "d1", "v1") === undefined &&
        nicknames.lookup({ channelId: CHANNEL, senderRef: "synthetic-key-2" }, "d2", "v1") !== undefined &&
        database.orm.select().from(schema.scoreOutcomes).where(eq(schema.scoreOutcomes.subjectId, SUBJECT)).all().length === 0 &&
        database.orm.select().from(schema.scoreOutcomes).where(eq(schema.scoreOutcomes.subjectId, TWIN)).all().length === 1,
      {
        run1Execution: (run1.body as any).execution,
        all18Done,
        run2ExecutionWhenExceptionLifted: (run2WithoutException.body as any).execution,
        dataRequestChanges: lastChangeSummary,
        remainingCards: candidates.listCards(CHANNEL).map((c: any) => c.term),
      }
    );
  } finally {
    fixture.close();
  }
}

// ============================================================================
// SECTION D (E61): Empirical reproduction of SUB-036 defects R1, R2, R3 + R4
// ============================================================================

// R1: Technical logs already expired (7-day retention) before deletion request -> CANDIDATE_CARD missed, false COMPLETED!
{
  const fixture = openDataFixture("m7c-probe-r1-");
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-r1",
      platformMessageRef: "msg-r1",
      taskId: "task-r1",
    });
    // Event ev-r1 has correlationId "corr-ev-r1" in channel_events!
    // Technical log expired after 7 days (proposal §11.2: Technical Log 7-day retention; cascade deletes evidence):
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-r1-expired", "corr-ev-r1", SUBJECT, "task-r1", EXPIRES_PAST), [
      { id: "evd-r1", kind: "MESSAGE_TEXT", payload: "expired message text", expiresAt: EXPIRES_PAST },
    ]);
    database.orm.delete(schema.technicalLogs).where(eq(schema.technicalLogs.id, "log-r1-expired")).run();

    const candidates = createCandidateStore({ newId: () => "card-r1", now: () => NOW, rules: { publishConfirmedTerm: () => 1 } });
    candidates.propose({
      channelId: CHANNEL,
      term: "synthetic-viewer-phrase-r1",
      note: "synthetic-note-r1",
      sourceCorrelationId: "corr-ev-r1",
      sourceTaskId: "task-r1",
    });

    const hub = {
      names: ["CANDIDATE_CARD"],
      forgetSubject(_name: string, channelId: string, _key: string, corrIds: readonly string[]) {
        return candidates.removeBySourceCorrelations(channelId, corrIds);
      },
    };
    const deps = { ...fixture.deps, caches: hub };
    const factsObserved = deps.cleanup.readCleanupFacts(CHANNEL, SUBJECT);

    const req = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqId = (req.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    const execRes = executeRequest(deps, admin, reqId);
    const remainingCards = candidates.listCards(CHANNEL);

    record(
      "R1-bug-expired-techlog-leaves-candidate-card-on-completed",
      (execRes.body as any).execution === "COMPLETED" && remainingCards.length === 1,
      {
        expectedContract: "remainingCards.length === 0 when COMPLETED",
        factsObserved,
        execution: (execRes.body as any).execution,
        candidateItem: deps.requests.readItems(reqId).find((i: any) => i.targetKind === "CANDIDATE_CARD"),
        remainingCards: remainingCards.map((c: any) => ({ term: c.term, note: c.note, sourceCorrelationId: c.sourceCorrelationId })),
      }
    );
  } finally {
    fixture.close();
  }
}

// R2: PARTIAL_FAILED at step 4 (CANDIDATE_CARD) -> step 3 already deleted technical_logs -> resume marks COMPLETED while leaving CandidateCard!
{
  const fixture = openDataFixture("m7c-probe-r2-");
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-r2",
      platformMessageRef: "msg-r2",
      taskId: "task-r2",
    });
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-r2", "corr-ev-r2", SUBJECT, "task-r2", EXPIRES_FUTURE), [
      { id: "evd-r2", kind: "MESSAGE_TEXT", payload: "live message text", expiresAt: EXPIRES_FUTURE },
    ]);

    const candidates = createCandidateStore({ newId: () => "card-r2", now: () => NOW, rules: { publishConfirmedTerm: () => 1 } });
    candidates.propose({
      channelId: CHANNEL,
      term: "synthetic-viewer-phrase-r2",
      note: "synthetic-note-r2",
      sourceCorrelationId: "corr-ev-r2",
      sourceTaskId: "task-r2",
    });

    const fullHub = {
      names: ["CANDIDATE_CARD"],
      forgetSubject(_name: string, channelId: string, _key: string, corrIds: readonly string[]) {
        return candidates.removeBySourceCorrelations(channelId, corrIds);
      },
    };
    const emptyHub = { names: [] as readonly string[], forgetSubject: () => 0 };

    const req = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqId = (req.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });

    // Start registers CANDIDATE_CARD; run 1 encounters unregistered hub (or transient error on CANDIDATE_CARD) -> PARTIAL_FAILED after step 3 deleted technical_logs!
    startDeletionRequest({ ...fixture.deps, caches: fullHub }, admin, reqId);
    const run1 = executeRequest({ ...fixture.deps, caches: emptyHub }, admin, reqId);
    const factsBeforeResume = fixture.deps.cleanup.readCleanupFacts(CHANNEL, SUBJECT);
    // Run 2 resumes with fullHub registered:
    const run2 = executeRequest({ ...fixture.deps, caches: fullHub }, admin, reqId);
    const remainingCards = candidates.listCards(CHANNEL);

    record(
      "R2-bug-resume-after-step3-leaves-candidate-card-on-completed",
      (run1.body as any).execution === "PARTIAL_FAILED" &&
        (run2.body as any).execution === "COMPLETED" &&
        remainingCards.length === 1,
      {
        run1Execution: (run1.body as any).execution,
        factsBeforeResume,
        run2Execution: (run2.body as any).execution,
        candidateItemAfterResume: fixture.deps.requests.readItems(reqId).find((i: any) => i.targetKind === "CANDIDATE_CARD"),
        remainingCards: remainingCards.map((c: any) => ({ term: c.term, note: c.note, sourceCorrelationId: c.sourceCorrelationId })),
      }
    );
  } finally {
    fixture.close();
  }
}

// R3: PARTIAL_FAILED after step 10 (DELIVERY) + 1 normal post-exception message before retry -> permanent SQLITE_CONSTRAINT_FOREIGNKEY wedge!
{
  const fixture = openDataFixture("m7c-probe-r3-");
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-r3-old",
      platformMessageRef: "msg-r3-old",
      taskId: "task-r3-old",
    });

    const realCleanup = createSubjectCleanupPort(database);
    let failVerdictOnce = true;
    const depsRun1 = {
      ...fixture.deps,
      cleanup: {
        readCleanupFacts: (ch: string, s: string) => realCleanup.readCleanupFacts(ch, s),
        cleanSurface(input: any) {
          if (failVerdictOnce && input.targetKind === "VERDICT") {
            failVerdictOnce = false;
            throw Object.assign(new Error("transient db busy"), { code: "SQLITE_BUSY" });
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

    // Run 1: steps 1..10 (including SCORE_OUTCOME & DELIVERY) mark DONE; step 11 (VERDICT) fails -> PARTIAL_FAILED
    const run1 = executeRequest(depsRun1, admin, reqId);

    // Before admin retries, the excepted viewer sends 1 new chat message in the stream (proposal §11.4: new messages still reviewed & delivered, unscored):
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-r3-post",
      platformMessageRef: "msg-r3-post",
      taskId: "task-r3-post",
    });
    const decisionSvc = decisionService(database);
    const postCommit = await decisionSvc.commit(
      "task-r3-post",
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      { contractVersion: "1", kind: "SYSTEM", source: "MODEL" }
    );
    assert.equal(postCommit.status, "committed");

    // Admin retries executeRequest with clean realCleanup (0 injected faults!) twice:
    const retry1 = executeRequest(fixture.deps, admin, reqId);
    const retry2 = executeRequest(fixture.deps, admin, reqId);
    const verdictItem = fixture.deps.requests.readItems(reqId).find((i: any) => i.targetKind === "VERDICT");

    record(
      "R3-bug-post-exception-message-wedges-resume-with-fk-error",
      (run1.body as any).execution === "PARTIAL_FAILED" &&
        (retry1.body as any).execution === "PARTIAL_FAILED" &&
        (retry2.body as any).execution === "PARTIAL_FAILED" &&
        verdictItem?.itemState === "FAILED",
      {
        run1Execution: (run1.body as any).execution,
        retry1Execution: (retry1.body as any).execution,
        retry2Execution: (retry2.body as any).execution,
        verdictItem,
      }
    );
  } finally {
    fixture.close();
  }
}

// R4: Counterfactual verification (with event correlations included in readCleanupFacts & child FK sweeps before VERDICT/CHANNEL_EVENT)
{
  const fixture = openDataFixture("m7c-probe-r4-");
  try {
    const { database } = fixture;
    const admin = actorFor("DATA_ADMIN");
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-r4",
      platformMessageRef: "msg-r4",
      taskId: "task-r4",
    });
    const logs = createAuditLogPort(database);
    logs.insertTechnicalLog(techLog(CHANNEL, "log-r4", "corr-ev-r4", SUBJECT, "task-r4", EXPIRES_FUTURE), []);

    const candidates = createCandidateStore({ newId: () => "card-r4", now: () => NOW, rules: { publishConfirmedTerm: () => 1 } });
    candidates.propose({
      channelId: CHANNEL,
      term: "synthetic-viewer-phrase-r4",
      note: null,
      sourceCorrelationId: "corr-ev-r4",
      sourceTaskId: "task-r4",
    });

    const realCleanup = createSubjectCleanupPort(database);
    const fixedCleanup = {
      readCleanupFacts(channelId: string, subjectId: string) {
        const base = realCleanup.readCleanupFacts(channelId, subjectId);
        if (!base) return undefined;
        const evCorrs = database.orm
          .select({ correlationId: schema.channelEvents.correlationId })
          .from(schema.channelEvents)
          .where(eq(schema.channelEvents.subjectId, subjectId))
          .all()
          .map((r: any) => r.correlationId);
        return {
          platformSubjectKey: base.platformSubjectKey,
          correlationIds: [...new Set([...base.correlationIds, ...evCorrs])].sort(),
        };
      },
      cleanSurface(input: any) {
        if (input.targetKind === "VERDICT") {
          realCleanup.cleanSurface({ ...input, targetKind: "DELIVERY" });
        } else if (input.targetKind === "CHANNEL_EVENT") {
          logs.removeSubjectTechnicalRows(input.subjectId);
          realCleanup.cleanSurface({ ...input, targetKind: "SCORE_OUTCOME" });
          realCleanup.cleanSurface({ ...input, targetKind: "DELIVERY" });
          realCleanup.cleanSurface({ ...input, targetKind: "VERDICT" });
          realCleanup.cleanSurface({ ...input, targetKind: "TASK" });
        }
        return realCleanup.cleanSurface(input);
      },
    };

    const fullHub = {
      names: ["CANDIDATE_CARD"],
      forgetSubject(_name: string, channelId: string, _key: string, corrIds: readonly string[]) {
        return candidates.removeBySourceCorrelations(channelId, corrIds);
      },
    };

    let failVerdictOnce = true;
    const depsRun1 = {
      ...fixture.deps,
      caches: { names: [] as readonly string[], forgetSubject: () => 0 },
      cleanup: fixedCleanup,
    };
    const req = fixture.routes.createRequest(admin, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const reqId = (req.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(admin, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    startDeletionRequest({ ...fixture.deps, caches: fullHub, cleanup: fixedCleanup }, admin, reqId);

    // Run 1 fails at CANDIDATE_CARD after step 3 deleted technical_logs
    const run1 = executeRequest(depsRun1, admin, reqId);
    // Run 2 fails once at VERDICT after CANDIDATE_CARD & DELIVERY succeed
    const run2 = executeRequest(
      {
        ...fixture.deps,
        caches: fullHub,
        cleanup: {
          readCleanupFacts: fixedCleanup.readCleanupFacts,
          cleanSurface(input: any) {
            if (failVerdictOnce && input.targetKind === "VERDICT") {
              failVerdictOnce = false;
              throw Object.assign(new Error("busy"), { code: "SQLITE_BUSY" });
            }
            return fixedCleanup.cleanSurface(input);
          },
        },
      },
      admin,
      reqId
    );
    // New post-exception message arrives before Run 3
    seedOpenTask(database, {
      channelId: CHANNEL,
      subjectKey: "synthetic-key-1",
      subjectId: SUBJECT,
      eventId: "ev-r4-post",
      platformMessageRef: "msg-r4-post",
      taskId: "task-r4-post",
    });
    const decisionSvc = decisionService(database);
    await decisionSvc.commit(
      "task-r4-post",
      { contractVersion: "1", classification: "ALLOW_MEANINGFUL", downstream: "ALLOW", reasonCodes: ["CLEAN"], penaltyHits: [] },
      { contractVersion: "1", kind: "SYSTEM", source: "MODEL" }
    );

    // Run 3 completes cleanly AND card is gone!
    const run3 = executeRequest({ ...fixture.deps, caches: fullHub, cleanup: fixedCleanup }, admin, reqId);
    record(
      "R4-counterfactual-fix-cleans-card-and-resumes-cleanly",
      (run1.body as any).execution === "PARTIAL_FAILED" &&
        (run2.body as any).execution === "PARTIAL_FAILED" &&
        (run3.body as any).execution === "COMPLETED" &&
        candidates.listCards(CHANNEL).length === 0,
      {
        run1: (run1.body as any).execution,
        run2: (run2.body as any).execution,
        run3: (run3.body as any).execution,
        remainingCards: candidates.listCards(CHANNEL).length,
      }
    );
  } finally {
    fixture.close();
  }
}

console.log(JSON.stringify({ total: results.length, allPassed: results.every((r) => r.ok), results }, null, 2));
if (!results.every((r) => r.ok)) process.exit(1);
