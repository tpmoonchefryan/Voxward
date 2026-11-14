import {
  CONTRACT_VERSION,
  createVerdict,
  type ChannelEvent,
} from "@voxward/contracts";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createDecisionStorePort } from "../../../src/db/decision-store.js";
import { SubjectStore } from "../../../src/db/repository.js";
import { channels, scoreLedger, subjectScores } from "../../../src/db/schema/index.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { RETENTION_DAYS } from "../../../src/modules/audit-store/content-policy.js";
import { createDecisionService } from "../../../src/modules/decision-service/index.js";
import { createReviewRunner } from "../../../src/modules/moderation-engine/review/runner.js";
import { createScoringEngine, createScoringPlanner } from "../../../src/modules/scoring-engine/index.js";
import { createTaskCoordinator } from "../../../src/modules/task-coordinator/index.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";

describe("S026 Core Flow: Failure & Anomaly No-Penalty Invariant (VW-R-004 / B14b)", () => {
  let dbDir: string;
  let database: VoxwardDatabase;
  const CHANNEL_ID = "ch-b14b-1";
  const T0 = "2026-11-14T11:00:00.000Z";

  beforeEach(() => {
    dbDir = scratchDirectory("s026-no-penalty-");
    database = migratedDatabase(dbDir);
    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({
          id: CHANNEL_ID,
          platform: "youtube",
          platformChannelRef: "UC-S026-NOP",
          displayName: "S026 No-Penalty Channel",
          createdAt: T0,
          updatedAt: T0,
        })
        .run();
    });
  });

  afterEach(() => {
    database.close();
    removeDirectory(dbDir);
  });

  it("escalates realtime task to pending_review via TaskCoordinator.reportFailure with 0 score penalty and 0 ledger rows", async () => {
    const subjectId = "sub-nop-rt";
    const subjectKey = "viewer-nop-rt";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjectId,
        channelId: CHANNEL_ID,
        platformSubjectKey: subjectKey,
        createdAt: T0,
      });
    });

    // Wire real DecisionService + ScoringLedgerPort (not invoked on failure)
    const decisionStore = createDecisionStorePort(database, {
      planner: createScoringPlanner({ enabled: true }),
      changeLogExpiresAt: (occurredAt) =>
        new Date(Date.parse(occurredAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString(),
    });
    const _decisions = createDecisionService({
      store: decisionStore,
      newId: () => "dec-nop-rt",
      now: () => new Date(T0),
      limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
    });
    expect(_decisions).toBeDefined();

    let clockMs = Date.parse(T0);
    const coordinator = createTaskCoordinator({
      facts: {
        readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
        commitIfCurrent: (_key, _expected, apply) => {
          apply();
          return { status: "committed" };
        },
      },
      concurrency: { current: () => 2 },
      clock: () => new Date(clockMs),
      limits: { maxBatchItems: 1 },
    });

    const event: ChannelEvent = {
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: CHANNEL_ID,
      platformMessageId: "yt-nop-rt-1",
      platformOrder: 1,
      receivedAt: T0,
      correlationId: "corr-nop-rt-1",
      body: "suspicious message triggering transient failure",
      sender: { contractVersion: CONTRACT_VERSION, senderRef: subjectKey },
    };

    const deadline = new Date(clockMs + 300_000).toISOString();
    const receipt = await coordinator.enqueueInLane("REALTIME", event, deadline);
    const taskId = receipt.taskId;

    let finalOutcome: Awaited<ReturnType<typeof coordinator.reportFailure>> | undefined;
    for (let attempt = 0; attempt < 10; attempt++) {
      const batch = await coordinator.takeBatch();
      expect(batch?.tasks.map((t) => t.taskId)).toEqual([taskId]);
      const outcome = await coordinator.reportFailure(taskId, "TRANSIENT_FAILURE");
      await coordinator.finishBatch(batch!.batchId);
      finalOutcome = outcome;
      if (outcome.status === "pending_review") break;
      expect(outcome.status).toBe("retry_scheduled");
      if (outcome.status === "retry_scheduled") {
        clockMs = outcome.notBeforeMs;
      }
    }
    expect(finalOutcome?.status).toBe("pending_review");

    const status = await coordinator.statusOf(taskId);
    expect(status).toBe("PENDING_REVIEW");

    const scoreRow = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, subjectId)).get();
    expect(scoreRow?.currentScore).toBe(0);
    const ledgerRows = database.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, subjectId)).all();
    expect(ledgerRows).toHaveLength(0);
  });

  it("keeps subject score and ledger unchanged (0 penalty) on ReviewRunner MODEL_CALL_FAILED (timeout) and AI_OUTPUT_INVALID (bad JSON)", async () => {
    const subjectId = "sub-nop-bg";
    const subjectKey = "viewer-nop-bg";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjectId,
        channelId: CHANNEL_ID,
        platformSubjectKey: subjectKey,
        createdAt: T0,
      });
    });

    const scoring = createScoringEngine({
      ledger: createScoringLedgerPort(database),
      clock: () => new Date(T0),
    });
    const decisionStore = createDecisionStorePort(database, {
      planner: createScoringPlanner({ enabled: true }),
      changeLogExpiresAt: (occurredAt) =>
        new Date(Date.parse(occurredAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString(),
    });
    const _decisions = createDecisionService({
      store: decisionStore,
      newId: () => "dec-nop-bg",
      now: () => new Date(T0),
      limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
    });
    expect(_decisions).toBeDefined();

    const deadline = new Date(Date.parse(T0) + 60_000).toISOString();
    const scenarios: readonly { readonly id: string; readonly mode: "timeout" | "invalid-json"; readonly expectedError: string }[] = [
      { id: "ev-nop-timeout", mode: "timeout", expectedError: "MODEL_CALL_FAILED" },
      { id: "ev-nop-invalid", mode: "invalid-json", expectedError: "AI_OUTPUT_INVALID" },
    ];

    let scoringCalls = 0;
    for (const [idx, s] of scenarios.entries()) {
      const coordinator = createTaskCoordinator({
        facts: {
          readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
          commitIfCurrent: (_key, _expected, apply) => {
            apply();
            return { status: "committed" };
          },
        },
        concurrency: { current: () => 2 },
        clock: () => new Date(T0),
        limits: { maxBatchItems: 1 },
      });

      const candidateEvent: ChannelEvent = {
        contractVersion: CONTRACT_VERSION,
        platform: "youtube",
        channelId: CHANNEL_ID,
        platformMessageId: `yt-nop-bg-${idx + 1}`,
        platformOrder: idx + 1,
        receivedAt: T0,
        correlationId: `corr-nop-bg-${idx + 1}`,
        body: "fast passed message under background review",
        sender: { contractVersion: CONTRACT_VERSION, senderRef: subjectKey },
      };

      const runner = createReviewRunner({
        store: {
          listOpenCandidates: () => [
            {
              eventId: s.id,
              event: candidateEvent,
              settlementState: "UNSETTLED_FAST_PASS",
              settlementDeadlineAt: deadline,
              evidenceExpiresAt: deadline,
              exceptionMarked: false,
              deletionInProgress: false,
              manuallyDecided: false,
            },
          ],
          readCandidate: () => undefined,
          markExpired: () => undefined,
          commitSettlement: () => ({ status: "SETTLED" }),
          markScoring: () => undefined,
          listPendingScoring: () => [],
        },
        coordinator,
        model: {
          reviewBatch: async () => {
            if (s.mode === "timeout") throw new Error("SYNTHETIC_AI_TIMEOUT");
            return { invalid: "not-a-valid-review-batch-result" } as never;
          },
        },
        scoring: {
          applyVerdict: async (ev, verdict) => {
            scoringCalls += 1;
            return scoring.applyVerdict(ev, verdict);
          },
        },
        reviewQueue: { append: () => undefined },
        candidates: { propose: () => undefined },
        now: () => new Date(T0),
        newId: () => `id-${s.id}`,
        newNonce: () => `nonce-${s.id}`,
      });

      const cycle = await runner.runCycle({ channelId: CHANNEL_ID, streamEnded: true });
      expect(cycle.enqueued).toBe(1);

      const batch = await runner.runBatch();
      expect(batch?.items).toHaveLength(1);
      const item = batch?.items[0];
      expect(item?.status).toBe("FAILED");
      if (item?.status === "FAILED") {
        expect(item.errorCode).toBe(s.expectedError);
      }
    }

    expect(scoringCalls).toBe(0);
    const scoreRow = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, subjectId)).get();
    expect(scoreRow?.currentScore).toBe(0);
    const ledgerRows = database.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, subjectId)).all();
    expect(ledgerRows).toHaveLength(0);
  });
});
