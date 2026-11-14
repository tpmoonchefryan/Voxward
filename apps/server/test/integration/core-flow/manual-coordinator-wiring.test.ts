import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTRACT_VERSION,
  REVIEW_CAPABILITY,
  createVerdict,
  type ChannelEvent,
  type DecisionActor,
  type SubjectCacheHub,
} from "@voxward/contracts";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";
import { createAccount } from "../../../src/auth/login.js";
import { grantMembership } from "../../../src/auth/members.js";
import type { ServerConfig } from "../../../src/config/schema.js";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createDecisionStorePort } from "../../../src/db/decision-store.js";
import { createApprovedContentPort } from "../../../src/db/output-store.js";
import { SubjectStore } from "../../../src/db/repository.js";
import {
  channelEvents,
  channels,
  scoreExceptions,
  scoreLedger,
  subjectScores,
  tasks,
  technicalLogEvidence,
  technicalLogs,
} from "../../../src/db/schema/index.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { RETENTION_DAYS } from "../../../src/modules/audit-store/content-policy.js";
import { createDecisionService } from "../../../src/modules/decision-service/index.js";
import { createCandidateStore } from "../../../src/modules/moderation-engine/index.js";
import { buildRegistry } from "../../../src/modules/registry.js";
import { createScoringEngine, createScoringPlanner } from "../../../src/modules/scoring-engine/index.js";
import { createTaskCoordinator } from "../../../src/modules/task-coordinator/index.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";

const FIXTURE_PATH = join(
  fileURLToPath(new URL("../../../../../tests/integration/core-flow/fixtures/manual-coordinator-wiring.json", import.meta.url)),
);

interface ManualWiringFixture {
  readonly channelId: string;
  readonly baseTimeIso: string;
  readonly manualOverturn: {
    readonly eventId: string;
    readonly taskId: string;
    readonly platformMessageId: string;
    readonly subjectKey: string;
    readonly correlationId: string;
    readonly operatorRef: string;
  };
  readonly exceptionZeroWindow: {
    readonly subjectKey: string;
    readonly eventId: string;
    readonly platformMessageId: string;
    readonly correlationId: string;
  };
  readonly coordinatorLanes: {
    readonly paidMessageId: string;
    readonly realtimeMessageId: string;
    readonly backgroundMessageId: string;
    readonly unknownTaskId: string;
  };
  readonly translationPayloadExample: {
    readonly text: string;
    readonly translatedText: string;
  };
}

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as ManualWiringFixture;
const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };

describe("S026 Core Flow: Manual Overturn, Exception Zero-Window, Coordinator & Composition Root Findings (Q49, Q55, Q57, N7/N12b, N13)", () => {
  let dbDir: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    dbDir = scratchDirectory("s026-manual-");
    database = migratedDatabase(dbDir);
    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({
          id: fixture.channelId,
          platform: "youtube",
          platformChannelRef: "UC-S026-MANUAL",
          displayName: "S026 Manual Channel",
          createdAt: fixture.baseTimeIso,
          updatedAt: fixture.baseTimeIso,
        })
        .run();
    });
  });

  afterEach(() => {
    database.close();
    removeDirectory(dbDir);
  });

  it("handles manual overturn concurrency conflict, reverses earlier score, and enforces idempotency (Q49, Q55)", async () => {
    const decisionStore = createDecisionStorePort(database, {
      planner: createScoringPlanner({ enabled: true }),
      changeLogExpiresAt: (occurredAt) =>
        new Date(Date.parse(occurredAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString(),
    });
    const decisions = createDecisionService({
      store: decisionStore,
      newId: () => `id-${Math.random().toString(36).slice(2, 10)}`,
      now: () => new Date(fixture.baseTimeIso),
      limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
    });

    const subjectId = "sub-man-1";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjectId,
        channelId: fixture.channelId,
        platformSubjectKey: fixture.manualOverturn.subjectKey,
        createdAt: fixture.baseTimeIso,
      });
      tx.insert(channelEvents)
        .values({
          id: fixture.manualOverturn.eventId,
          channelId: fixture.channelId,
          platformMessageRef: fixture.manualOverturn.platformMessageId,
          platformOrder: 1,
          receivedAt: fixture.baseTimeIso,
          correlationId: fixture.manualOverturn.correlationId,
          subjectId,
          eventVersion: 1,
          createdAt: fixture.baseTimeIso,
        })
        .run();
      tx.insert(tasks)
        .values({
          id: fixture.manualOverturn.taskId,
          channelId: fixture.channelId,
          eventId: fixture.manualOverturn.eventId,
          eventVersion: 1,
          processingGeneration: 0,
          kind: "REALTIME_REVIEW",
          status: "RUNNING",
          deadlineAt: "2026-11-14T10:25:00.000Z",
          createdAt: fixture.baseTimeIso,
          updatedAt: fixture.baseTimeIso,
        })
        .run();
    });

    const actor: DecisionActor = {
      contractVersion: CONTRACT_VERSION,
      accountRef: fixture.manualOverturn.operatorRef,
      channelId: fixture.channelId,
      capabilities: new Set([REVIEW_CAPABILITY]),
    };

    const first = await decisions.commit(fixture.manualOverturn.taskId, createVerdict("ALLOW_MEANINGFUL"), {
      kind: "SYSTEM",
      source: "MODEL",
    });
    expect(first.status).toBe("committed");

    const lateConflict = await decisions.commit(fixture.manualOverturn.taskId, createVerdict("BLOCK"), {
      kind: "HUMAN",
      actor,
    });
    expect(lateConflict.status).toBe("conflict");

    const overturned = await decisions.overturn({
      eventId: fixture.manualOverturn.eventId,
      operationId: "op-overturn-1",
      verdict: createVerdict("BLOCK", [{ code: "MANUAL_BLOCK", points: 10 }]),
      actor,
    });
    expect(overturned.status).toBe("overturned");

    const duplicate = await decisions.overturn({
      eventId: fixture.manualOverturn.eventId,
      operationId: "op-overturn-1",
      verdict: createVerdict("BLOCK", [{ code: "MANUAL_BLOCK", points: 10 }]),
      actor,
    });
    expect(duplicate.status).toBe("duplicate");

    const scoreRow = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, subjectId)).get();
    expect(scoreRow?.currentScore).toBeLessThanOrEqual(0);
    const ledgerRows = database.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, subjectId)).all();
    expect(ledgerRows.length).toBeGreaterThanOrEqual(2);
  });

  it("refuses scoring during active scoring exception window and leaves score at 0 (Q55)", async () => {
    const subjectId = "sub-exc-1";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjectId,
        channelId: fixture.channelId,
        platformSubjectKey: fixture.exceptionZeroWindow.subjectKey,
        createdAt: fixture.baseTimeIso,
      });
      tx.insert(scoreExceptions)
        .values({
          id: "exc-1",
          channelId: fixture.channelId,
          subjectId,
          sourceRequestId: null,
          purposeCode: "SCORING_EXCEPTION_PREFERENCE",
          createdAt: fixture.baseTimeIso,
          removedAt: null,
        })
        .run();
    });

    const scoring = createScoringEngine({
      ledger: createScoringLedgerPort(database),
      clock: () => new Date(fixture.baseTimeIso),
    });

    const event: ChannelEvent = {
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: fixture.channelId,
      platformMessageId: fixture.exceptionZeroWindow.platformMessageId,
      platformOrder: 1,
      receivedAt: fixture.baseTimeIso,
      correlationId: fixture.exceptionZeroWindow.correlationId,
      body: "blocked content",
      sender: { contractVersion: CONTRACT_VERSION, senderRef: fixture.exceptionZeroWindow.subjectKey },
    };

    await expect(
      scoring.applyVerdict(event, createVerdict("BLOCK", [{ code: "RULE_BLOCK", points: 20 }])),
    ).rejects.toThrow("EXCEPTION_ACTIVE");

    const scoreRow = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, subjectId)).get();
    expect(scoreRow?.currentScore).toBe(0);
  });

  it("enforces TaskCoordinator lane priority, micro-batching, and unknown task convergence (Q57)", async () => {
    const coordinator = createTaskCoordinator({
      facts: {
        readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
        commitIfCurrent: (_key, _expected, apply) => {
          apply();
          return { status: "committed" };
        },
      },
      concurrency: { current: () => 2 },
      clock: () => new Date(fixture.baseTimeIso),
      limits: { maxBatchItems: 1 },
    });

    const deadline = new Date(Date.parse(fixture.baseTimeIso) + 30_000).toISOString();
    const mkEvent = (id: string, order: number): ChannelEvent => ({
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: fixture.channelId,
      platformMessageId: id,
      platformOrder: order,
      receivedAt: fixture.baseTimeIso,
      correlationId: `corr-${id}`,
      body: `msg-${id}`,
      sender: { contractVersion: CONTRACT_VERSION, senderRef: "sender-q57" },
    });

    await coordinator.enqueueInLane("BACKGROUND", mkEvent(fixture.coordinatorLanes.backgroundMessageId, 1), deadline);
    await coordinator.enqueueInLane("REALTIME", mkEvent(fixture.coordinatorLanes.realtimeMessageId, 2), deadline);
    await coordinator.enqueueInLane("PAID", mkEvent(fixture.coordinatorLanes.paidMessageId, 3), deadline);

    const b1 = await coordinator.takeBatch();
    expect(b1?.lane).toBe("PAID");
    await coordinator.finishBatch(b1!.batchId);

    const b2 = await coordinator.takeBatch();
    expect(b2?.lane).toBe("REALTIME");
    await coordinator.finishBatch(b2!.batchId);

    const b3 = await coordinator.takeBatch();
    expect(b3?.lane).toBe("BACKGROUND");
    await coordinator.finishBatch(b3!.batchId);

    await expect(coordinator.statusOf(fixture.coordinatorLanes.unknownTaskId)).rejects.toThrow("TASK_NOT_FOUND");
    await expect(coordinator.reportFailure(fixture.coordinatorLanes.unknownTaskId, "UNKNOWN_ERR")).resolves.toEqual({
      status: "ignored",
      reason: "UNKNOWN_TASK",
    });
  });

  it("records composition root gaps as-is without modifying src/: N7/N12b NO_SUBJECT_CACHES & N13 raw JSON translation", async () => {
    // 1) N7 / N12b: buildApp without subjectCaches uses NO_SUBJECT_CACHES, leaving an external CandidateStore untouched.
    const admin = (
      await createAccount(database, {
        loginName: "s026-admin",
        displayName: "Admin",
        password: "correct horse battery",
        now: new Date(fixture.baseTimeIso),
      })
    ).accountId;
    runShortTransaction(database, (tx) => {
      grantMembership(tx, {
        channelId: fixture.channelId,
        accountId: admin,
        role: "DATA_ADMIN",
        logAccess: false,
        now: new Date(fixture.baseTimeIso),
      });
    });

    const unlinkedCandidates = createCandidateStore({
      newId: () => "cand-n7-1",
      now: () => new Date(fixture.baseTimeIso),
      rules: { publishConfirmedTerm: () => 1 },
    });
    unlinkedCandidates.propose({
      channelId: fixture.channelId,
      term: "s026term",
      note: null,
      sourceCorrelationId: "corr-n7-1",
      sourceTaskId: "task-n7-1",
    });

    const appWithoutHub = buildApp({
      modules: buildRegistry(config),
      logger: false,
      database,
      candidateStore: unlinkedCandidates,
    });
    const loginRes = await appWithoutHub.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "s026-admin", password: "correct horse battery" },
    });
    const { csrfToken } = loginRes.json() as { csrfToken: string };
    const cookie = String(loginRes.headers["set-cookie"]).split(";")[0] ?? "";
    const headers = { cookie, "x-csrf-token": csrfToken };

    const subjId = "sub-n7-1";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjId,
        channelId: fixture.channelId,
        platformSubjectKey: "key-n7-1",
        createdAt: fixture.baseTimeIso,
      });
      tx.insert(technicalLogs)
        .values({
          id: "tlog-n7-1",
          channelId: fixture.channelId,
          sequence: 1,
          correlationId: "corr-n7-1",
          subjectId: subjId,
          stage: "COMMIT",
          status: "OK",
          level: "INFO",
          createdAt: fixture.baseTimeIso,
          expiresAt: "2026-12-14T10:20:00.000Z",
        })
        .run();
    });

    const reqRes = await appWithoutHub.inject({
      method: "POST",
      url: `/channels/${fixture.channelId}/data/requests`,
      headers,
      payload: { subjectRef: subjId, kind: "DELETE", mode: "DELETE_DATA_ONLY", requestSource: "OPERATOR_INITIATED" },
    });
    const reqId = (reqRes.json() as { requestId: string }).requestId;
    await appWithoutHub.inject({
      method: "POST",
      url: `/channels/${fixture.channelId}/data/requests/${reqId}/verification`,
      headers,
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    const execRes = await appWithoutHub.inject({
      method: "POST",
      url: `/channels/${fixture.channelId}/data/requests/${reqId}/execute`,
      headers,
    });
    expect(execRes.statusCode).toBe(200);
    // N7/N12b observation: default NO_SUBJECT_CACHES leaves unlinkedCandidates intact.
    expect(unlinkedCandidates.listCards(fixture.channelId)).toHaveLength(1);
    await appWithoutHub.close();

    // Contrast: when SubjectCacheHub is explicitly injected, forgetSubject removes the candidate card.
    const explicitHub: SubjectCacheHub = {
      names: ["candidate-store"],
      forgetSubject: (_name, ch, _sub, correlations) => unlinkedCandidates.removeBySourceCorrelations(ch, correlations),
    };
    expect(explicitHub.forgetSubject("candidate-store", fixture.channelId, subjId, ["corr-n7-1"])).toBe(1);
    expect(unlinkedCandidates.listCards(fixture.channelId)).toHaveLength(0);

    // 2) N13: createApprovedContentPort returns raw TRANSLATION payload string verbatim (including JSON string).
    const rawTranslationJson = JSON.stringify(fixture.translationPayloadExample);
    runShortTransaction(database, (tx) => {
      tx.insert(technicalLogs)
        .values({
          id: "tlog-n13-1",
          channelId: fixture.channelId,
          sequence: 2,
          correlationId: "corr-n13-1",
          subjectId: subjId,
          stage: "DELIVER",
          status: "OK",
          level: "INFO",
          createdAt: fixture.baseTimeIso,
          expiresAt: "2026-12-14T10:20:00.000Z",
        })
        .run();
      tx.insert(technicalLogEvidence)
        .values([
          {
            id: "ev-n13-text",
            logId: "tlog-n13-1",
            evidenceKind: "MESSAGE_TEXT",
            payload: fixture.translationPayloadExample.text,
            payloadBytes: Buffer.byteLength(fixture.translationPayloadExample.text, "utf8"),
            expiresAt: "2026-12-14T10:20:00.000Z",
          },
          {
            id: "ev-n13-trans",
            logId: "tlog-n13-1",
            evidenceKind: "TRANSLATION",
            payload: rawTranslationJson,
            payloadBytes: Buffer.byteLength(rawTranslationJson, "utf8"),
            expiresAt: "2026-12-14T10:20:00.000Z",
          },
        ])
        .run();
    });

    const contentPort = createApprovedContentPort(database);
    const approved = contentPort.readApproved({
      channelId: fixture.channelId,
      correlationId: "corr-n13-1",
      nowIso: fixture.baseTimeIso,
    });
    expect(approved?.text).toBe(fixture.translationPayloadExample.text);
    expect(approved?.translation).toBe(rawTranslationJson);
  });
});
