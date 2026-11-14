import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const WT = "/home/ryanlan/Code/Voxward/.worktrees/verify-m8c";
const reqFromServer = createRequire(`${WT}/apps/server/package.json`);
const { eq } = await import(reqFromServer.resolve("drizzle-orm"));
const OUT_LOG = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave3a/m8c-accept-out/probes/logs/e80-m8c.json";

const { CONTRACT_VERSION, REVIEW_CAPABILITY, createVerdict } = await import(`${WT}/packages/contracts/src/index.ts`);
const { createDecisionStorePort } = await import(`${WT}/apps/server/src/db/decision-store.ts`);
const { SubjectStore } = await import(`${WT}/apps/server/src/db/repository.ts`);
const { channelEvents, channels, subjectScores, tasks } = await import(`${WT}/apps/server/src/db/schema/index.ts`);
const { runShortTransaction } = await import(`${WT}/apps/server/src/db/transaction.ts`);
const { createDecisionService } = await import(`${WT}/apps/server/src/modules/decision-service/index.ts`);
const { createScoringPlanner } = await import(`${WT}/apps/server/src/modules/scoring-engine/index.ts`);
const {
  createIdentityTracker,
  createInMemoryMessageIdStore,
  parseStreamItem,
  runStreamList,
  toBusinessEvent,
} = await import(`${WT}/apps/server/src/modules/platform-source/index.ts`);
const { createReviewRunner } = await import(`${WT}/apps/server/src/modules/moderation-engine/review/runner.ts`);
const { createTaskCoordinator } = await import(`${WT}/apps/server/src/modules/task-coordinator/index.ts`);
const { migratedDatabase, removeDirectory, scratchDirectory } = await import(`${WT}/apps/server/test/db/helpers.ts`);

interface ProbeResult {
  readonly id: string;
  readonly passed: boolean;
  readonly details: Record<string, unknown>;
}

const results: ProbeResult[] = [];

// ============================================================================
// C1: Q55 (C6) Reproducer on db/decision-store.ts — falsely marked PASS in core-flow-matrix.md!
// Sequence (maxScore=10, minScore=-100, reward=2, penalty=3):
//   evt-1 BLOCK (-3)  -> -3
//   evt-2..7 ALLOW (+2 x 6) -> -1, 1, 3, 5, 7, 9 (none clamped on original timeline!)
//   evt-8 BLOCK (-3)  -> 6
//   overturn evt-1 to ALLOW_MEANINGFUL -> compensation +3 -> currentScore = 9, needsManualAdjustment = false!
//   Replay without evt-1: +2 x 5 = 10, 6th +2 clamped at 10, then -3 = 7!
// ============================================================================
{
  const dir = scratchDirectory("m8c-q55-");
  const db = migratedDatabase(dir);
  const CH = "ch-q55";
  const T0 = "2026-11-14T10:00:00.000Z";

  runShortTransaction(db, (tx) => {
    tx.insert(channels)
      .values({ id: CH, platform: "youtube", platformChannelRef: "yt-q55", displayName: "Q55", createdAt: T0, updatedAt: T0 })
      .run();
    SubjectStore.create(tx, { id: "subj-q55", channelId: CH, platformSubjectKey: "yt-viewer-q55", createdAt: T0 });
  });

  const planner = createScoringPlanner({
    enabled: true,
    minScore: -100,
    maxScore: 10,
    complianceReward: 2,
    violationPenalty: 3,
    rewardCooldownMs: 0,
  });
  let seqId = 0;
  let tickMs = Date.parse(T0);
  const decisionStore = createDecisionStorePort(db, {
    planner,
    newId: () => `id-q55-${++seqId}`,
    changeLogExpiresAt: () => "2099-01-01T00:00:00.000Z",
  });
  const decisions = createDecisionService({
    store: decisionStore,
    newId: () => `did-q55-${++seqId}`,
    now: () => new Date((tickMs += 1000)),
    limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
  });

  const steps: Array<"BLOCK" | "ALLOW_MEANINGFUL"> = [
    "BLOCK",
    "ALLOW_MEANINGFUL",
    "ALLOW_MEANINGFUL",
    "ALLOW_MEANINGFUL",
    "ALLOW_MEANINGFUL",
    "ALLOW_MEANINGFUL",
    "ALLOW_MEANINGFUL",
    "BLOCK",
  ];

  for (let i = 0; i < steps.length; i++) {
    const idx = i + 1;
    const evIso = new Date(Date.parse(T0) + idx * 1000).toISOString();
    runShortTransaction(db, (tx) => {
      tx.insert(channelEvents)
        .values({
          id: `ev-${idx}`,
          channelId: CH,
          platformMessageRef: `pm-${idx}`,
          platformOrder: idx,
          receivedAt: evIso,
          correlationId: `corr-${idx}`,
          subjectId: "subj-q55",
          eventVersion: 1,
          createdAt: evIso,
        })
        .run();
      tx.insert(tasks)
        .values({
          id: `tk-${idx}`,
          channelId: CH,
          eventId: `ev-${idx}`,
          eventVersion: 1,
          processingGeneration: 0,
          kind: "REALTIME_REVIEW",
          status: "RUNNING",
          deadlineAt: "2099-01-01T00:00:00.000Z",
          createdAt: evIso,
          updatedAt: evIso,
        })
        .run();
    });
    const cls = steps[i]!;
    const res = await decisions.commit(`tk-${idx}`, createVerdict(cls), { kind: "SYSTEM", source: "MODEL" });
    assert.equal(res.status, "committed");
  }

  const scoreBeforeOverturn = db.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "subj-q55")).get()!.currentScore;
  assert.equal(scoreBeforeOverturn, 6);

  const actor = {
    contractVersion: CONTRACT_VERSION,
    accountRef: "op-q55",
    channelId: CH,
    capabilities: new Set([REVIEW_CAPABILITY]),
  };
  const overturned = await decisions.overturn({
    eventId: "ev-1",
    operationId: "op-c6-1",
    verdict: createVerdict("ALLOW_MEANINGFUL"),
    actor,
  });
  assert.equal(overturned.status, "overturned");
  const scoreAfterOverturn = db.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "subj-q55")).get()!.currentScore;

  // Replay calculation without ev-1: 6x(+2) clamped at 10 -> 10 - 3 = 7
  let replayScore = 0;
  for (const s of steps.slice(1)) {
    const d = s === "ALLOW_MEANINGFUL" ? 2 : -3;
    replayScore = Math.max(-100, Math.min(10, replayScore + d));
  }

  db.close();
  removeDirectory(dir);

  assert.equal(scoreAfterOverturn, 9);
  assert.equal(replayScore, 7);
  assert.equal(overturned.needsManualAdjustment, false);

  results.push({
    id: "C1_q55_c6_live_defect_unrecorded_and_falsely_marked_pass",
    passed: true,
    details: {
      scoreBeforeOverturn,
      scoreAfterOverturn,
      trueLedgerReplayScore: replayScore,
      needsManualAdjustment: overturned.needsManualAdjustment,
      matrixClaimedStatus: "PASS",
    },
  });
}

// ============================================================================
// C2: Q46 & Q41 Live Behavior Reproducer (milestone userComment dropped, ChannelEvent has no paid flag, steady-state replay age drops on clock skew)
// ============================================================================
{
  const milestoneRaw = {
    kind: "youtube#liveChatMessage",
    id: "yt-milestone-custom-text",
    snippet: {
      type: "memberMilestoneChatEvent",
      publishedAt: "2026-11-14T10:09:30.000Z",
      memberMilestoneChatDetails: { userComment: "2周年おめでとうございます！" },
    },
    authorDetails: { channelId: "UC-MILE-1", isChatSponsor: true },
  };
  const scRaw = {
    kind: "youtube#liveChatMessage",
    id: "yt-sc-flag-check",
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-11-14T10:09:31.000Z",
      superChatDetails: { userComment: "SC hello" },
    },
    authorDetails: { channelId: "UC-SC-FLAG", isChatSponsor: true },
  };

  const parsedMilestone = parseStreamItem(milestoneRaw)!;
  const parsedSc = parseStreamItem(scRaw)!;
  const tracker = createIdentityTracker({ capacity: 10 });
  const mileOut = toBusinessEvent(
    { message: parsedMilestone, receivedAtMs: Date.parse("2026-11-14T10:10:00.000Z"), order: 1 },
    { channelId: "ch-q46", senderRefOf: (c: string) => `ref:${c}`, newId: () => "c-m1", identities: tracker },
  );
  const scOut = toBusinessEvent(
    { message: parsedSc, receivedAtMs: Date.parse("2026-11-14T10:10:00.000Z"), order: 2 },
    { channelId: "ch-q46", senderRefOf: (c: string) => `ref:${c}`, newId: () => "c-s1", identities: tracker },
  );

  // Q41: steady-state poll (resumeToken !== null) with +6m local clock skew drops live message as STALE_REPLAY
  const delivered: unknown[] = [];
  const streamRes = await runStreamList({
    liveChatId: "lc-q41",
    resumeToken: "steady-state-page-token-1",
    config: {
      replayMaxAgeMs: 300_000,
      minPollIntervalMs: 1000,
      maxBackoffMs: 10_000,
      maxConsecutiveFailures: 3,
    },
    dedupe: createInMemoryMessageIdStore(10),
    now: () => Date.parse("2026-11-14T10:15:32.000Z"), // +6m01s ahead of scRaw publishedAt
    sleep: async () => undefined,
    sink: { deliver: async (m: unknown) => { delivered.push(m); } },
    transport: {
      async *connect() {
        yield { kind: "RESPONSE" as const, response: { items: [scRaw], offlineAt: "2026-11-14T10:10:00.000Z" } };
      },
    },
  });

  assert.equal(parsedMilestone.text, null);
  assert.equal(mileOut.message.event.body, "");
  assert.equal("paidText" in scOut.message.event || "type" in scOut.message.event, false);
  assert.equal(streamRes.stats.staleReplay, 1);
  assert.equal(streamRes.stats.delivered, 0);

  results.push({
    id: "C2_q46_q41_live_gaps_unrecorded_and_falsely_marked_pass",
    passed: true,
    details: {
      q46MilestoneUserCommentParsedText: parsedMilestone.text,
      q46MilestoneEventBody: mileOut.message.event.body,
      q46ChannelEventKeys: Object.keys(scOut.message.event),
      q41SteadyStateClockSkewDelivered: streamRes.stats.delivered,
      q41SteadyStateClockSkewStaleReplay: streamRes.stats.staleReplay,
    },
  });
}

// ============================================================================
// C3: Q57 (R7) Two ReviewRunners sharing one coordinator + VW-R-007 AI Failure No-Deduct (missing from S026)
// ============================================================================
{
  const T0 = "2026-11-14T10:20:00.000Z";
  const deadline = "2026-11-14T10:50:00.000Z";
  const coordinator = createTaskCoordinator({
    facts: {
      readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
      commitIfCurrent: (_k: unknown, _e: unknown, apply: () => void) => {
        apply();
        return { status: "committed" as const };
      },
    },
    concurrency: { current: () => 4 },
    clock: () => new Date(T0),
    limits: { maxBatchItems: 1 },
  });

  const candidateEvent = {
    contractVersion: CONTRACT_VERSION,
    platform: "youtube" as const,
    channelId: "ch-q57",
    platformMessageId: "yt-q57-1",
    platformOrder: 1,
    receivedAt: T0,
    correlationId: "corr-q57-1",
    body: "fast passed text needing background review",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "viewer-q57" },
  };

  let scoringCalls = 0;
  const makeRunner = (candidates: typeof candidateEvent[], modelError?: boolean) =>
    createReviewRunner({
      store: {
        listOpenCandidates: () =>
          candidates.map((ev, idx) => ({
            eventId: `ev-q57-${idx}`,
            event: ev,
            settlementState: "UNSETTLED_FAST_PASS" as const,
            settlementDeadlineAt: deadline,
            evidenceExpiresAt: deadline,
            exceptionMarked: false,
            deletionInProgress: false,
            manuallyDecided: false,
          })),
        readCandidate: () => undefined,
        markExpired: () => undefined,
        commitSettlement: () => ({ status: "SETTLED" as const }),
        markScoring: () => undefined,
        listPendingScoring: () => [],
      },
      coordinator,
      model: {
        reviewBatch: async () => {
          if (modelError) throw new Error("SYNTHETIC_AI_TIMEOUT");
          return { contractVersion: CONTRACT_VERSION, items: [] };
        },
      },
      scoring: {
        applyVerdict: async () => {
          scoringCalls += 1;
          throw new Error("should not be called");
        },
      },
      reviewQueue: { append: () => undefined },
      candidates: { propose: () => undefined },
      now: () => new Date(T0),
      newId: () => "id-r",
      newNonce: () => "nonce-r",
      policy: { minCountTrigger: 1 },
    });

  // Runner A enqueues 1 task; Runner B takes the BACKGROUND batch, skips unknown task, calls finishBatch -> task stuck RUNNING!
  const runnerA = makeRunner([candidateEvent]);
  const runnerB = makeRunner([]);
  const cycleA = await runnerA.runCycle({ channelId: "ch-q57", streamEnded: true });
  assert.equal(cycleA.enqueued, 1);
  const batchB = await runnerB.runBatch();
  assert.ok(batchB !== null);
  assert.equal(batchB.items.length, 0);

  // Runner C tests AI timeout -> FAILED item, scoringCalls === 0
  const coordinator2 = createTaskCoordinator({
    facts: {
      readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
      commitIfCurrent: (_k: unknown, _e: unknown, apply: () => void) => {
        apply();
        return { status: "committed" as const };
      },
    },
    concurrency: { current: () => 4 },
    clock: () => new Date(T0),
    limits: { maxBatchItems: 1 },
  });
  const runnerTimeout = createReviewRunner({
    store: {
      listOpenCandidates: () => [
        {
          eventId: "ev-timeout-1",
          event: candidateEvent,
          settlementState: "UNSETTLED_FAST_PASS" as const,
          settlementDeadlineAt: deadline,
          evidenceExpiresAt: deadline,
          exceptionMarked: false,
          deletionInProgress: false,
          manuallyDecided: false,
        },
      ],
      readCandidate: () => undefined,
      markExpired: () => undefined,
      commitSettlement: () => ({ status: "SETTLED" as const }),
      markScoring: () => undefined,
      listPendingScoring: () => [],
    },
    coordinator: coordinator2,
    model: {
      reviewBatch: async () => {
        throw new Error("SYNTHETIC_AI_TIMEOUT");
      },
    },
    scoring: {
      applyVerdict: async () => {
        scoringCalls += 1;
        throw new Error("must not deduct score on AI failure");
      },
    },
    reviewQueue: { append: () => undefined },
    candidates: { propose: () => undefined },
    now: () => new Date(T0),
    newId: () => "id-t",
    newNonce: () => "nonce-t",
    policy: { minCountTrigger: 1 },
  });
  await runnerTimeout.runCycle({ channelId: "ch-q57", streamEnded: true });
  const timeoutBatch = await runnerTimeout.runBatch();
  assert.equal(timeoutBatch?.items[0]?.status, "FAILED");
  assert.equal(scoringCalls, 0);

  results.push({
    id: "C3_q57_r7_and_vw_r007_anomaly_no_deduct",
    passed: true,
    details: {
      q57RunnerBSkippedItemsCount: batchB.items.length,
      vwR007TimeoutItemStatus: timeoutBatch?.items[0]?.status,
      vwR007ScoringCallsOnTimeout: scoringCalls,
    },
  });
}

// ============================================================================
// C4: Hardcoded ephemeral worktree file:// URIs in committed repo docs
// ============================================================================
{
  const matrixPath = path.join(WT, "docs/acceptance/core-flow-matrix.md");
  const readmePath = path.join(WT, "tests/integration/core-flow/README.md");
  const matrixTxt = fs.readFileSync(matrixPath, "utf8");
  const readmeTxt = fs.readFileSync(readmePath, "utf8");
  const re = /file:\/\/\/[^\s)]+/g;
  const matrixHits = matrixTxt.match(re) ?? [];
  const readmeHits = readmeTxt.match(re) ?? [];

  assert.equal(matrixHits.length, 7);
  assert.equal(readmeHits.length, 1);

  results.push({
    id: "C4_hardcoded_ephemeral_worktree_uris_in_repo_docs",
    passed: true,
    details: {
      coreFlowMatrixFileUriCount: matrixHits.length,
      readmeFileUriCount: readmeHits.length,
      sampleUri: matrixHits[0],
    },
  });
}

const summary = {
  candidate: "df376eb",
  total: results.length,
  allProbesCompleted: results.every((r) => r.passed),
  results,
};

fs.writeFileSync(OUT_LOG, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
