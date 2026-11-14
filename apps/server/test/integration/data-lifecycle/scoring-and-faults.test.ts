import { randomUUID } from "node:crypto";
import { CONTRACT_VERSION, REVIEW_CAPABILITY, createVerdict, type ChannelEvent, type DecisionActor, type SubjectCacheHub } from "@voxward/contracts";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createDataRequestPort } from "../../../src/db/data-request-store.js";
import { createDecisionStorePort } from "../../../src/db/decision-store.js";
import { SubjectStore } from "../../../src/db/repository.js";
import {
  channelEvents,
  channels,
  dataRequestItems,
  dataRequests,
  scoreExceptions,
  scoreOutcomes,
  subjectScores,
  subjects,
  tasks,
} from "../../../src/db/schema/index.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import { createSubjectCleanupPort } from "../../../src/db/subject-cleanup.js";
import { createSubjectReadPort } from "../../../src/db/subject-read.js";
import { createTombstoneLedger, ledgerRecorder } from "../../../src/db/tombstone-ledger.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { RETENTION_DAYS as AUDIT_RETENTION_DAYS } from "../../../src/modules/audit-store/content-policy.js";
import { createInvalidationBus } from "../../../src/modules/audit-store/index.js";
import {
  createDataRoutes,
  preferenceMarkerOf,
  PREFERENCE_PURPOSE,
  type DataActor,
  type DataDeps,
} from "../../../src/modules/data-lifecycle-service/index.js";
import { createDecisionService } from "../../../src/modules/decision-service/index.js";
import { createScoringEngine, createScoringPlanner } from "../../../src/modules/scoring-engine/index.js";
import { countRows, migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../../db/helpers.js";

const NOW = new Date(T0);

describe("S028 Data Lifecycle: All Scoring Entries, Preference Marker Minimization & Fault Injection", () => {
  let dbDir: string;
  let ledgerDir: string;
  let database: VoxwardDatabase;
  let orderSeq = 1;

  const adminActor: DataActor = {
    accountId: "acc-admin",
    channelId: "ch-1",
    capabilities: new Set(["data.handle"]),
  };

  beforeEach(() => {
    orderSeq = 1;
    dbDir = scratchDirectory("s028-score-");
    ledgerDir = scratchDirectory("s028-score-ledger-");
    database = migratedDatabase(dbDir);
    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({
          id: "ch-1",
          platform: "youtube",
          platformChannelRef: "UC-SECRET-CHANNEL-REF",
          displayName: "Secret Display Channel",
          createdAt: T0,
          updatedAt: T0,
        })
        .run();
    });
  });

  afterEach(() => {
    database.close();
    removeDirectory(dbDir);
    removeDirectory(ledgerDir);
  });

  function makeDataDeps(overrides?: Partial<DataDeps>): DataDeps {
    const bus = createInvalidationBus();
    return {
      requests: createDataRequestPort(database),
      subjects: createSubjectReadPort(database),
      cleanup: createSubjectCleanupPort(database),
      logs: createAuditLogPort(database),
      caches: { names: ["RUNTIME_CACHE"], forgetSubject: () => 0 },
      publishInvalidation: (e) => bus.publish(e),
      tombstones: ledgerRecorder(createTombstoneLedger(ledgerDir)),
      certificateSummary: "已按数据删除请求完成内容清理",
      now: () => NOW,
      newId: randomUUID,
      retentionDays: AUDIT_RETENTION_DAYS,
      ...overrides,
    };
  }

  function runDataDeletion(deps: DataDeps, subjectId: string, mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT") {
    const routes = createDataRoutes(deps);
    const created = routes.createRequest(adminActor, {
      subjectRef: subjectId,
      kind: "DELETE",
      mode,
      requestSource: "OPERATOR_INITIATED",
    });
    expect(created.status).toBe(201);
    const reqId = (created.body as { requestId: string }).requestId;
    const verified = routes.decideVerification(adminActor, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    expect(verified.status).toBe(200);
    return { reqId, exec: routes.execute(adminActor, reqId), routes };
  }

  it("enforces DELETE_AND_EXCEPT across automatic, manual, and delayed scoring entries and checks minimal preference marker", async () => {
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: "sub-exc",
        channelId: "ch-1",
        platformSubjectKey: "plat-exc-raw-key",
        createdAt: T0,
      });
      tx.insert(channelEvents)
        .values({
          id: "evt-exc-1",
          channelId: "ch-1",
          subjectId: "sub-exc",
          platformMessageRef: "pmsg-exc-1",
          platformOrder: orderSeq++,
          receivedAt: T0,
          correlationId: "corr-exc-1",
          createdAt: T0,
        })
        .run();
      tx.insert(tasks)
        .values({
          id: "task-exc-1",
          channelId: "ch-1",
          eventId: "evt-exc-1",
          kind: "REALTIME_REVIEW",
          status: "PENDING_REVIEW",
          eventVersion: 1,
          processingGeneration: 0,
          deadlineAt: T0,
          createdAt: T0,
          updatedAt: T0,
        })
        .run();
    });

    const deps = makeDataDeps();
    const { reqId, exec } = runDataDeletion(deps, "sub-exc", "DELETE_AND_EXCEPT");
    expect(exec.status).toBe(200);
    expect((exec.body as { execution: string }).execution).toBe("COMPLETED");

    const marker = preferenceMarkerOf("sub-exc", T0);
    expect(Object.keys(marker).sort()).toEqual(["createdAt", "purpose", "subjectId"]);
    expect(marker.purpose).toBe(PREFERENCE_PURPOSE);
    const excRow = database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, "sub-exc")).get();
    expect(excRow).toBeDefined();
    expect(excRow?.sourceRequestId).toBe(reqId);
    const serializedExc = JSON.stringify(excRow);
    expect(serializedExc).not.toContain("Secret Display Channel");
    expect(serializedExc).not.toContain("UC-SECRET-CHANNEL-REF");
    expect(serializedExc).not.toContain("plat-exc-raw-key");

    const scoring = createScoringEngine({ ledger: createScoringLedgerPort(database) });
    const autoEvent: ChannelEvent = {
      contractVersion: CONTRACT_VERSION,
      channelId: "ch-1",
      platform: "youtube",
      platformMessageId: "pmsg-auto-after",
      platformOrder: 99,
      correlationId: "corr-auto-after",
      receivedAt: T0,
      sender: { contractVersion: CONTRACT_VERSION, senderRef: "plat-exc-raw-key" },
      body: "bad message",
    };
    await expect(scoring.applyVerdict(autoEvent, createVerdict("BLOCK"))).rejects.toThrow("scoring refused: EXCEPTION_ACTIVE");
    expect(countRows(database, "score_ledger")).toBe(0);
    const outcomes = database.orm.select().from(scoreOutcomes).where(eq(scoreOutcomes.subjectId, "sub-exc")).all();
    expect(outcomes.some((o) => o.outcome === "REFUSED" && o.reasonCode === "EXCEPTION_ACTIVE")).toBe(true);

    runShortTransaction(database, (tx) => {
      tx.insert(channelEvents)
        .values({
          id: "evt-exc-2",
          channelId: "ch-1",
          subjectId: "sub-exc",
          platformMessageRef: "pmsg-exc-2",
          platformOrder: orderSeq++,
          receivedAt: T0,
          correlationId: "corr-exc-2",
          createdAt: T0,
        })
        .run();
      tx.insert(tasks)
        .values({
          id: "task-exc-2",
          channelId: "ch-1",
          eventId: "evt-exc-2",
          kind: "REALTIME_REVIEW",
          status: "PENDING_REVIEW",
          eventVersion: 1,
          processingGeneration: 1,
          deadlineAt: T0,
          createdAt: T0,
          updatedAt: T0,
        })
        .run();
    });
    const decisions = createDecisionService({
      store: createDecisionStorePort(database, {
        planner: createScoringPlanner({ enabled: true }),
        changeLogExpiresAt: (at) => new Date(Date.parse(at) + AUDIT_RETENTION_DAYS.metadata * 86_400_000).toISOString(),
      }),
      newId: randomUUID,
      now: () => NOW,
      limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
    });
    const modActor: DecisionActor = {
      contractVersion: CONTRACT_VERSION,
      accountRef: "acc-mod",
      channelId: "ch-1",
      capabilities: new Set([REVIEW_CAPABILITY]),
    };
    const manualRes = await decisions.commit("task-exc-2", createVerdict("BLOCK"), {
      kind: "HUMAN",
      actor: modActor,
    });
    expect(manualRes.status).toBe("committed");
    expect(countRows(database, "score_ledger")).toBe(0);
    const scoreRow = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "sub-exc")).get();
    expect(scoreRow?.currentScore).toBe(0);
  });

  it("rejects stale processing_generation callbacks after DELETE_DATA_ONLY", async () => {
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: "sub-gen",
        channelId: "ch-1",
        platformSubjectKey: "plat-gen",
        createdAt: T0,
      });
      tx.insert(channelEvents)
        .values({
          id: "evt-gen-1",
          channelId: "ch-1",
          subjectId: "sub-gen",
          platformMessageRef: "pmsg-gen-1",
          platformOrder: orderSeq++,
          receivedAt: T0,
          correlationId: "corr-gen-1",
          createdAt: T0,
        })
        .run();
      tx.insert(tasks)
        .values({
          id: "task-gen-1",
          channelId: "ch-1",
          eventId: "evt-gen-1",
          kind: "REALTIME_REVIEW",
          status: "PENDING_REVIEW",
          eventVersion: 1,
          processingGeneration: 0,
          deadlineAt: T0,
          createdAt: T0,
          updatedAt: T0,
        })
        .run();
    });

    const deps = makeDataDeps();
    const { exec } = runDataDeletion(deps, "sub-gen", "DELETE_DATA_ONLY");
    expect((exec.body as { execution: string }).execution).toBe("COMPLETED");

    const subRow = database.orm.select().from(subjects).where(eq(subjects.id, "sub-gen")).get();
    expect(subRow?.processingGeneration).toBe(1);

    runShortTransaction(database, (tx) => {
      tx.insert(channelEvents)
        .values({
          id: "evt-gen-stale",
          channelId: "ch-1",
          subjectId: "sub-gen",
          platformMessageRef: "pmsg-gen-stale",
          platformOrder: orderSeq++,
          receivedAt: T0,
          correlationId: "corr-gen-stale",
          createdAt: T0,
        })
        .run();
      tx.insert(tasks)
        .values({
          id: "task-gen-stale",
          channelId: "ch-1",
          eventId: "evt-gen-stale",
          kind: "REALTIME_REVIEW",
          status: "PENDING_REVIEW",
          eventVersion: 1,
          processingGeneration: 0,
          deadlineAt: T0,
          createdAt: T0,
          updatedAt: T0,
        })
        .run();
    });

    const decisions = createDecisionService({
      store: createDecisionStorePort(database, {
        planner: createScoringPlanner({ enabled: true }),
        changeLogExpiresAt: (at) => new Date(Date.parse(at) + AUDIT_RETENTION_DAYS.metadata * 86_400_000).toISOString(),
      }),
      newId: randomUUID,
      now: () => NOW,
      limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
    });

    const modActor: DecisionActor = {
      contractVersion: CONTRACT_VERSION,
      accountRef: "acc-mod",
      channelId: "ch-1",
      capabilities: new Set([REVIEW_CAPABILITY]),
    };
    const staleCommit = await decisions.commit("task-gen-stale", createVerdict("BLOCK"), {
      kind: "HUMAN",
      actor: modActor,
    });
    expect(staleCommit.status).toBe("conflict");
    if (staleCommit.status === "conflict") {
      expect(staleCommit.reason).toBe("STALE_GENERATION");
    }
    expect(countRows(database, "score_ledger")).toBe(0);
    const scoreRow = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "sub-gen")).get();
    expect(scoreRow?.currentScore).toBe(0);
  });

  it("reports PARTIAL_FAILED on mid-cleanup fault injection (never falsely COMPLETED) and converges idempotently on retry", () => {
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, { id: "sub-fault", channelId: "ch-1", platformSubjectKey: "plat-fault", createdAt: T0 });
      tx.insert(channelEvents)
        .values({
          id: "evt-fault-1",
          channelId: "ch-1",
          subjectId: "sub-fault",
          platformMessageRef: "pmsg-fault-1",
          platformOrder: orderSeq++,
          receivedAt: T0,
          correlationId: "corr-fault-1",
          createdAt: T0,
        })
        .run();
    });

    let failCache = true;
    const flakyCaches: SubjectCacheHub = {
      names: ["RUNTIME_CACHE"],
      forgetSubject() {
        if (failCache) {
          const err = new Error("raw sensitive error details should not be stored");
          (err as { code?: string }).code = "CACHE_TIMEOUT";
          throw err;
        }
        return 1;
      },
    };

    const deps = makeDataDeps({ caches: flakyCaches });
    const { reqId, exec, routes } = runDataDeletion(deps, "sub-fault", "DELETE_DATA_ONLY");
    expect(exec.status).toBe(200);
    const partialBody = exec.body as { execution: string };
    expect(partialBody.execution).toBe("PARTIAL_FAILED");

    const items = database.orm.select().from(dataRequestItems).where(eq(dataRequestItems.requestId, reqId)).all();
    const failedItem = items.find((i) => i.itemState === "FAILED");
    expect(failedItem?.targetKind).toBe("CACHE");
    expect(failedItem?.errorCode).toBe("CACHE_TIMEOUT");
    expect(JSON.stringify(failedItem)).not.toContain("raw sensitive error details");

    failCache = false;
    const retried = routes.execute(adminActor, reqId);
    expect(retried.status).toBe(200);
    expect((retried.body as { execution: string }).execution).toBe("COMPLETED");

    const reqRow = database.orm.select().from(dataRequests).where(eq(dataRequests.id, reqId)).get();
    expect(reqRow?.executionState).toBe("COMPLETED");

    const idempotent = routes.execute(adminActor, reqId);
    expect(idempotent.status).toBe(200);
    expect((idempotent.body as { execution: string }).execution).toBe("COMPLETED");
  });

  it("fails closed with TOMBSTONE_UNAVAILABLE when tombstone ledger cannot persist", () => {
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, { id: "sub-tomb-fail", channelId: "ch-1", platformSubjectKey: "plat-tf", createdAt: T0 });
      tx.insert(channelEvents)
        .values({
          id: "evt-tf-1",
          channelId: "ch-1",
          subjectId: "sub-tomb-fail",
          platformMessageRef: "pmsg-tf-1",
          platformOrder: orderSeq++,
          receivedAt: T0,
          correlationId: "corr-tf-1",
          createdAt: T0,
        })
        .run();
    });

    const deps = makeDataDeps({
      tombstones: {
        record() {
          throw new Error("LEDGER_WRITE_FAILED");
        },
      },
    });
    const { exec } = runDataDeletion(deps, "sub-tomb-fail", "DELETE_DATA_ONLY");
    expect(exec.status).toBe(409);
    expect(exec.body).toEqual({ error: "TOMBSTONE_UNAVAILABLE" });
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, "sub-tomb-fail")).all()).toHaveLength(1);
  });
});
