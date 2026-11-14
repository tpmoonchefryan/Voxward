import { createHash, randomUUID } from "node:crypto";
import { CONTRACT_VERSION, type SubjectCacheHub } from "@voxward/contracts";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";
import { createAccount } from "../../../src/auth/login.js";
import { grantMembership } from "../../../src/auth/members.js";
import type { ServerConfig } from "../../../src/config/schema.js";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { SubjectStore } from "../../../src/db/repository.js";
import {
  changeLogs,
  channelEvents,
  channels,
  credentialRefs,
  deliveries,
  deploymentSettings,
  listEntries,
  outputGrants,
  ruleTerms,
  ruleVersions,
  scoreExceptions,
  scoreLedger,
  scoreOutcomes,
  subjectIdentities,
  subjectNicknameChanges,
  subjectScores,
  subjects,
  tasks,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "../../../src/db/schema/index.js";
import { createTombstoneLedger } from "../../../src/db/tombstone-ledger.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { createAuditStore } from "../../../src/modules/audit-store/index.js";
import { createCandidateStore, type CandidateStore } from "../../../src/modules/moderation-engine/index.js";
import { buildRegistry } from "../../../src/modules/registry.js";
import { countRows, migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../../db/helpers.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const PASSWORD = "correct horse battery";
const NOW = new Date(T0);

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

interface Session {
  readonly cookie: string;
  readonly csrf: string;
}

describe("S028 Data Lifecycle: Full Storage-Surface Deletion Matrix (DELETE_DATA_ONLY & DELETE_AND_EXCEPT)", () => {
  let dbDir: string;
  let ledgerDir: string;
  let database: VoxwardDatabase;
  let candidateStore: CandidateStore;
  let extraCache: Map<string, string>;
  let app: FastifyInstance;
  let adminAccountId: string;
  let orderSeq = 1;

  async function signIn(loginName: string): Promise<Session> {
    const response = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName, password: PASSWORD } });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { csrfToken: string };
    return { cookie: String(response.headers["set-cookie"]).split(";")[0] ?? "", csrf: body.csrfToken };
  }

  function seedAllSurfaces(subjectId: string, suffix: string): { readonly logId: string; readonly correlationId: string } {
    const correlationId = `corr-${suffix}`;
    const eventId = `evt-${suffix}`;
    const taskId = `task-${suffix}`;
    const verdictId = `verdict-${suffix}`;
    const deliveryId = `deliv-${suffix}`;

    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjectId,
        channelId: "ch-1",
        platformSubjectKey: `plat-${suffix}`,
        createdAt: T0,
      });
      tx.insert(subjectIdentities)
        .values({
          id: `ident-${suffix}`,
          subjectId,
          identityKind: "PAID_MEMBER",
          sourceEventRef: `src-ident-${suffix}`,
          effectiveFrom: T0,
          effectiveTo: null,
          observedAt: T0,
        })
        .run();
      tx.insert(subjectNicknameChanges)
        .values({
          id: `nickchg-${suffix}`,
          subjectId,
          previousNicknameHash: sha256(`old-${suffix}`),
          nextNicknameHash: sha256(`new-${suffix}`),
          changedAt: T0,
        })
        .run();
      tx.insert(scoreLedger)
        .values({
          id: `ledger-${suffix}`,
          subjectId,
          idempotencyKey: `idem-ledger-${suffix}`,
          reasonCode: "RULE_PENALTY",
          requestedDelta: -5,
          actualDelta: -5,
          ruleVersion: 1,
          verdictRef: verdictId,
          correlationId,
          createdAt: T0,
        })
        .run();
      tx.insert(scoreOutcomes)
        .values({
          idempotencyKey: `idem-outcome-${suffix}`,
          subjectId,
          outcome: "NO_EFFECT",
          reasonCode: "COOLDOWN",
          createdAt: T0,
        })
        .run();
      tx.insert(channelEvents)
        .values({
          id: eventId,
          channelId: "ch-1",
          subjectId,
          platformMessageRef: `pmsg-${suffix}`,
          platformOrder: orderSeq++,
          receivedAt: T0,
          correlationId,
          eventVersion: 1,
          settlementState: "NONE",
          exceptionMarked: 0,
          createdAt: T0,
        })
        .run();
      tx.insert(tasks)
        .values({
          id: taskId,
          channelId: "ch-1",
          eventId,
          kind: "REALTIME_REVIEW",
          status: "DONE",
          eventVersion: 1,
          processingGeneration: 0,
          deadlineAt: T0,
          createdAt: T0,
          updatedAt: T0,
        })
        .run();
      tx.insert(verdicts)
        .values({
          id: verdictId,
          eventId,
          taskId,
          seq: 1,
          classification: "ALLOW_MEANINGFUL",
          downstream: "ALLOW",
          source: "MODEL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "model:synthetic",
        })
        .run();
      tx.insert(deliveries)
        .values({
          id: deliveryId,
          eventId,
          verdictId,
          outputGrantId: "grant-1",
          deliverySequence: 1,
          platformOrder: 1,
          validUntil: "2026-11-11T10:00:00.000Z",
          status: "SENT",
          attempts: 1,
          updatedAt: T0,
        })
        .run();
    });

    const audit = createAuditStore({
      port: createAuditLogPort(database),
      sanitize: (s) => s,
      newId: randomUUID,
      access: {
        channelsFor: () => ["ch-1"],
        capabilitiesFor: () => new Set(["logs.view", "logs.view_content"]),
      },
      clock: () => NOW,
    });
    const { logId } = audit.recordTechnical({
      contractVersion: CONTRACT_VERSION,
      kind: "TECHNICAL",
      channelId: "ch-1",
      correlationId,
      stage: "BASE_RULE",
      status: "OK",
      level: "INFO",
      subjectRef: subjectId,
      batchId: `batch-${suffix}`,
      taskId,
      attempt: 1,
      errorCode: null,
      providerRef: "synthetic",
      modelRef: "synthetic-model",
      ruleTemplateVersion: "v1",
      latencyMs: 12,
      data: { verdict: "ALLOW_MEANINGFUL" },
      evidence: [
        { kind: "MESSAGE_TEXT", payload: `secret-msg-${suffix}` },
        { kind: "TRANSLATION", payload: `secret-trans-${suffix}` },
        { kind: "VALIDATED_JSON", payload: JSON.stringify({ action: "ALLOW_MEANINGFUL", text: `secret-${suffix}` }) },
        { kind: "ITEM_ID_MAP", payload: JSON.stringify({ item0: eventId }) },
      ],
    });
    audit.recordChange({
      contractVersion: CONTRACT_VERSION,
      kind: "CHANGE",
      channelId: "ch-1",
      actor: { kind: "ACCOUNT", ref: adminAccountId },
      changeKind: "MANUAL_VERDICT",
      outcome: "SUCCEEDED",
      summary: `decision for ${subjectId}`,
      correlationId,
    });

    candidateStore.propose({
      channelId: "ch-1",
      term: `term-${suffix}`,
      note: null,
      sourceCorrelationId: correlationId,
      sourceTaskId: taskId,
    });
    extraCache.set(`plat-${suffix}`, `cached-${suffix}`);

    return { logId, correlationId };
  }

  async function executeDeletion(
    session: Session,
    subjectId: string,
    mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT",
  ): Promise<string> {
    const created = await app.inject({
      method: "POST",
      url: "/channels/ch-1/data/requests",
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
      payload: { subjectRef: subjectId, kind: "DELETE", mode, requestSource: "OPERATOR_INITIATED" },
    });
    expect(created.statusCode).toBe(201);
    const requestId = (created.json() as { requestId: string }).requestId;

    const verified = await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${requestId}/verification`,
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    expect(verified.statusCode).toBe(200);

    const executed = await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${requestId}/execute`,
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
    });
    expect(executed.statusCode).toBe(200);
    expect((executed.json() as { execution: string }).execution).toBe("COMPLETED");
    return requestId;
  }

  beforeEach(async () => {
    orderSeq = 1;
    dbDir = scratchDirectory("s028-matrix-");
    ledgerDir = scratchDirectory("s028-ledger-");
    database = migratedDatabase(dbDir);
    candidateStore = createCandidateStore({
      newId: randomUUID,
      now: () => NOW,
      rules: { publishConfirmedTerm: () => 1 },
    });
    extraCache = new Map();

    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({ id: "ch-1", platform: "youtube", platformChannelRef: "UC-1", displayName: "Channel 1", createdAt: T0, updatedAt: T0 })
        .run();
      tx.insert(deploymentSettings)
        .values({ key: "retention.default", valueJson: JSON.stringify({ days: 7 }), updatedAt: T0 })
        .run();
      tx.insert(credentialRefs)
        .values({
          id: "cred-1",
          channelId: "ch-1",
          purpose: "OUTPUT_GRANT",
          secretRef: "secretref:native-grant-1",
          createdAt: T0,
        })
        .run();
      tx.insert(outputGrants)
        .values({
          id: "grant-1",
          channelId: "ch-1",
          outputKind: "NATIVE_WS",
          credentialRefId: "cred-1",
          scope: "ROOM_READ_ONLY",
          createdAt: T0,
        })
        .run();
      tx.insert(ruleVersions)
        .values({
          id: "rv-1",
          channelId: "ch-1",
          version: 1,
          ruleJson: JSON.stringify({ version: 1 }),
          createdAt: T0,
          createdByRef: "acc-sys",
        })
        .run();
      tx.insert(ruleTerms)
        .values({
          id: "rt-1",
          channelId: "ch-1",
          term: "bad",
          matchKind: "EXACT",
          language: "en",
          groupCode: "BLOCK",
          createdAt: T0,
          createdByRef: "acc-sys",
        })
        .run();
      SubjectStore.create(tx, {
        id: "sub-list-anchor",
        channelId: "ch-1",
        platformSubjectKey: "plat-list-anchor",
        createdAt: T0,
      });
      tx.insert(listEntries)
        .values({
          id: "le-1",
          channelId: "ch-1",
          subjectId: "sub-list-anchor",
          listKind: "WHITELIST",
          createdAt: T0,
          createdByRef: "acc-sys",
        })
        .run();
    });

    const admin = await createAccount(database, { loginName: "dataadmin", displayName: "Data Admin", password: PASSWORD, now: NOW });
    adminAccountId = admin.accountId;
    runShortTransaction(database, (tx) => {
      grantMembership(tx, { channelId: "ch-1", accountId: adminAccountId, role: "DATA_ADMIN", logAccess: true, now: NOW });
    });

    const subjectCaches: SubjectCacheHub = {
      names: ["CANDIDATE_CARD", "SUBJECT_RUNTIME_CACHE"],
      forgetSubject(surface, channelId, platformSubjectKey, correlationIds) {
        if (surface === "CANDIDATE_CARD") {
          return candidateStore.removeBySourceCorrelations(channelId, correlationIds);
        }
        if (surface === "SUBJECT_RUNTIME_CACHE") {
          return extraCache.delete(platformSubjectKey) ? 1 : 0;
        }
        return 0;
      },
    };

    app = buildApp({
      modules: buildRegistry(config),
      logger: false,
      database,
      subjectCaches,
      candidateStore,
      tombstoneLedger: createTombstoneLedger(ledgerDir),
    });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    removeDirectory(dbDir);
    removeDirectory(ledgerDir);
  });

  it("clears all subject content surfaces and caches under DELETE_DATA_ONLY while preserving non-target and FK anchors", async () => {
    const target = seedAllSurfaces("sub-target", "t1");
    seedAllSurfaces("sub-other", "o1");
    const session = await signIn("dataadmin");

    const preRead = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/technical/${target.logId}`,
      headers: { cookie: session.cookie },
    });
    expect(preRead.statusCode).toBe(200);

    await executeDeletion(session, "sub-target", "DELETE_DATA_ONLY");

    expect(database.orm.select().from(subjectIdentities).where(eq(subjectIdentities.subjectId, "sub-target")).all()).toHaveLength(0);
    expect(database.orm.select().from(subjectNicknameChanges).where(eq(subjectNicknameChanges.subjectId, "sub-target")).all()).toHaveLength(0);
    expect(database.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, "sub-target")).all()).toHaveLength(0);
    expect(database.orm.select().from(scoreOutcomes).where(eq(scoreOutcomes.subjectId, "sub-target")).all()).toHaveLength(0);
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, "sub-target")).all()).toHaveLength(0);
    expect(database.orm.select().from(tasks).where(eq(tasks.eventId, "evt-t1")).all()).toHaveLength(0);
    expect(database.orm.select().from(verdicts).where(eq(verdicts.eventId, "evt-t1")).all()).toHaveLength(0);
    expect(database.orm.select().from(deliveries).where(eq(deliveries.eventId, "evt-t1")).all()).toHaveLength(0);
    expect(database.orm.select().from(technicalLogs).where(eq(technicalLogs.subjectId, "sub-target")).all()).toHaveLength(0);
    expect(database.orm.select().from(technicalLogEvidence).where(eq(technicalLogEvidence.logId, target.logId)).all()).toHaveLength(0);

    const targetSubject = database.orm.select().from(subjects).where(eq(subjects.id, "sub-target")).get();
    expect(targetSubject?.processingGeneration).toBe(1);
    const targetScore = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "sub-target")).get();
    expect(targetScore?.currentScore).toBe(0);
    expect(targetScore?.version).toBe(1);

    expect(countRows(database, "score_exceptions")).toBe(0);
    expect(countRows(database, "data_requests")).toBe(1);
    expect(countRows(database, "data_request_items")).toBe(17);

    const targetChanges = database.orm.select().from(changeLogs).where(eq(changeLogs.correlationId, target.correlationId)).all();
    expect(targetChanges).toHaveLength(1);
    expect(targetChanges[0]?.summary).toBe("DATA_REQUEST_CERTIFICATE");

    const postRead = await app.inject({
      method: "GET",
      url: `/internal/channels/ch-1/logs/technical/${target.logId}`,
      headers: { cookie: session.cookie },
    });
    expect(postRead.statusCode).toBe(404);
    expect(candidateStore.listCards("ch-1").map((c) => c.term)).toEqual(["term-o1"]);
    expect(extraCache.has("plat-t1")).toBe(false);
    expect(extraCache.has("plat-o1")).toBe(true);

    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, "sub-other")).all()).toHaveLength(1);
    expect(database.orm.select().from(technicalLogs).where(eq(technicalLogs.subjectId, "sub-other")).all()).toHaveLength(1);
    expect(countRows(database, "channels")).toBe(1);
    expect(countRows(database, "deployment_settings")).toBe(1);
    expect(countRows(database, "channel_members")).toBe(1);
    expect(countRows(database, "credential_refs")).toBe(1);
    expect(countRows(database, "output_grants")).toBe(1);
    expect(countRows(database, "auth_accounts")).toBe(1);
    expect(countRows(database, "auth_sessions")).toBe(1);
    expect(countRows(database, "auth_output_tokens")).toBe(0);
    expect(countRows(database, "rule_versions")).toBe(1);
    expect(countRows(database, "rule_terms")).toBe(1);
    expect(countRows(database, "list_entries")).toBe(1);
  });

  it("creates active score_exceptions under DELETE_AND_EXCEPT and lifts it on RESUME_SCORING", async () => {
    seedAllSurfaces("sub-except", "e1");
    const session = await signIn("dataadmin");

    const requestId = await executeDeletion(session, "sub-except", "DELETE_AND_EXCEPT");
    const exc = database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, "sub-except")).get();
    expect(exc).toBeDefined();
    expect(exc?.removedAt).toBeNull();
    expect(exc?.sourceRequestId).toBe(requestId);
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, "sub-except")).all()).toHaveLength(0);

    const resumeCreate = await app.inject({
      method: "POST",
      url: "/channels/ch-1/data/requests",
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
      payload: { subjectRef: "sub-except", kind: "RESUME_SCORING", requestSource: "OPERATOR_INITIATED" },
    });
    expect(resumeCreate.statusCode).toBe(201);
    const resumeId = (resumeCreate.json() as { requestId: string }).requestId;

    const resumeVerify = await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${resumeId}/verification`,
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    expect(resumeVerify.statusCode).toBe(200);

    const resumeExec = await app.inject({
      method: "POST",
      url: `/channels/ch-1/data/requests/${resumeId}/execute`,
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
    });
    expect(resumeExec.statusCode).toBe(200);
    expect((resumeExec.json() as { outcome: string }).outcome).toBe("RESUMED");

    const lifted = database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, "sub-except")).get();
    expect(lifted?.removedAt).not.toBeNull();
  });

  it("documents buildApp default NO_SUBJECT_CACHES behavior when subjectCaches is omitted (as-is without modifying src/)", async () => {
    await app.close();
    app = buildApp({ modules: buildRegistry(config), logger: false, database, candidateStore });
    seedAllSurfaces("sub-nocache", "nc1");
    const session = await signIn("dataadmin");

    await executeDeletion(session, "sub-nocache", "DELETE_DATA_ONLY");
    expect(candidateStore.listCards("ch-1").map((c) => c.term)).toEqual(["term-nc1"]);
  });
});
