import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.VERIFY_REPO_ROOT;
const outJsonPath = process.env.PROBE_OUT_JSON;
assert.ok(repoRoot && fs.existsSync(repoRoot), "VERIFY_REPO_ROOT is required");
assert.ok(outJsonPath, "PROBE_OUT_JSON is required");

const importRepo = (relPath: string) => import(pathToFileURL(path.join(repoRoot, relPath)).href);
const reqFromServer = createRequire(path.join(repoRoot, "apps/server/package.json"));
const { eq } = await import(pathToFileURL(reqFromServer.resolve("drizzle-orm")).href);

const { CONTRACT_VERSION, REVIEW_CAPABILITY, createVerdict } = await importRepo("packages/contracts/src/index.ts");
const { createDecisionStorePort } = await importRepo("apps/server/src/db/decision-store.ts");
const { SubjectStore } = await importRepo("apps/server/src/db/repository.ts");
const { channelEvents, channels, scoreLedger, subjectScores, tasks } = await importRepo(
  "apps/server/src/db/schema/index.ts",
);
const { createScoringLedgerPort } = await importRepo("apps/server/src/db/scoring-ledger.ts");
const { runShortTransaction } = await importRepo("apps/server/src/db/transaction.ts");
const { createDecisionService } = await importRepo("apps/server/src/modules/decision-service/index.ts");
const { createReviewRunner } = await importRepo("apps/server/src/modules/moderation-engine/review/runner.ts");
const {
  createIdentityTracker,
  createInMemoryMessageIdStore,
  parseStreamItem,
  runStreamList,
  toBusinessEvent,
} = await importRepo("apps/server/src/modules/platform-source/index.ts");
const { createScoringEngine, createScoringPlanner } = await importRepo(
  "apps/server/src/modules/scoring-engine/index.ts",
);
const { createTaskCoordinator } = await importRepo("apps/server/src/modules/task-coordinator/index.ts");
const { migratedDatabase, removeDirectory, scratchDirectory } = await importRepo("apps/server/test/db/helpers.ts");

interface ProbeCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly details: Record<string, unknown>;
}

const checks: ProbeCheck[] = [];

// ============================================================================
// P1: Verify B14a Q55 C6 reproducer & matrix alignment
// ============================================================================
{
  const dir = scratchDirectory("m8cr1-p1-");
  const db = migratedDatabase(dir);
  const CH = "ch-m8cr1-p1";
  const T0 = "2026-11-14T12:00:00.000Z";

  runShortTransaction(db, (tx: unknown) => {
    const t = tx as typeof db.orm;
    t.insert(channels)
      .values({ id: CH, platform: "youtube", platformChannelRef: "UC-P1", displayName: "P1", createdAt: T0, updatedAt: T0 })
      .run();
    SubjectStore.create(tx, { id: "sub-p1", channelId: CH, platformSubjectKey: "viewer-p1", createdAt: T0 });
  });

  const planner = createScoringPlanner({
    enabled: true,
    minScore: -100,
    maxScore: 10,
    complianceReward: 2,
    violationPenalty: 3,
    rewardCooldownMs: 0,
  });
  let seq = 0;
  let tickMs = Date.parse(T0);
  const store = createDecisionStorePort(db, {
    planner,
    newId: () => `p1-id-${++seq}`,
    changeLogExpiresAt: () => "2099-01-01T00:00:00.000Z",
  });
  const decisions = createDecisionService({
    store,
    newId: () => `p1-did-${++seq}`,
    now: () => new Date((tickMs += 1000)),
    limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
  });

  const steps: readonly ("BLOCK" | "ALLOW_MEANINGFUL")[] = [
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
    runShortTransaction(db, (tx: unknown) => {
      const t = tx as typeof db.orm;
      t.insert(channelEvents)
        .values({
          id: `p1-ev-${idx}`,
          channelId: CH,
          platformMessageRef: `p1-pm-${idx}`,
          platformOrder: idx,
          receivedAt: evIso,
          correlationId: `p1-corr-${idx}`,
          subjectId: "sub-p1",
          eventVersion: 1,
          createdAt: evIso,
        })
        .run();
      t.insert(tasks)
        .values({
          id: `p1-tk-${idx}`,
          channelId: CH,
          eventId: `p1-ev-${idx}`,
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
    const committed = await decisions.commit(`p1-tk-${idx}`, createVerdict(steps[i]!), { kind: "SYSTEM", source: "MODEL" });
    assert.equal(committed.status, "committed");
  }

  const overturned = await decisions.overturn({
    eventId: "p1-ev-1",
    operationId: "p1-op-1",
    verdict: createVerdict("ALLOW_MEANINGFUL"),
    actor: {
      contractVersion: CONTRACT_VERSION,
      accountRef: "mod-p1",
      channelId: CH,
      capabilities: new Set([REVIEW_CAPABILITY]),
    },
  });
  assert.equal(overturned.status, "overturned");
  const afterScore = db.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "sub-p1")).get()!.currentScore;
  db.close();
  removeDirectory(dir);

  assert.equal(afterScore, 9);
  assert.equal(overturned.needsManualAdjustment, false);

  checks.push({
    id: "P1_q55_c6_reproducer_verified_and_documented_fail_open",
    passed: true,
    details: { afterScore, trueReplayScore: 7, needsManualAdjustment: overturned.needsManualAdjustment },
  });
}

// ============================================================================
// P2: Verify B14a Q46, Q41, and Q57 R7 live reproducers
// ============================================================================
{
  const milestoneRaw = {
    kind: "youtube#liveChatMessage",
    id: "yt-mile-p2",
    snippet: {
      type: "memberMilestoneChatEvent",
      publishedAt: "2026-11-14T10:09:30.000Z",
      memberMilestoneChatDetails: { userComment: "Milestone custom comment" },
    },
    authorDetails: { channelId: "UC-MILE-P2", isChatSponsor: true },
  };
  const scRaw = {
    kind: "youtube#liveChatMessage",
    id: "yt-sc-p2",
    snippet: {
      type: "superChatEvent",
      publishedAt: "2026-11-14T10:09:31.000Z",
      superChatDetails: { userComment: "SuperChat text" },
    },
    authorDetails: { channelId: "UC-SC-P2", isChatSponsor: true },
  };
  const parsedMile = parseStreamItem(milestoneRaw)!;
  const parsedSc = parseStreamItem(scRaw)!;
  const tracker = createIdentityTracker({ capacity: 10 });
  const mileEvt = toBusinessEvent(
    { message: parsedMile, receivedAtMs: Date.parse("2026-11-14T10:10:00.000Z"), order: 1 },
    { channelId: "ch-p2", senderRefOf: (c: string) => `ref:${c}`, newId: () => "c-1", identities: tracker },
  );
  const scEvt = toBusinessEvent(
    { message: parsedSc, receivedAtMs: Date.parse("2026-11-14T10:10:00.000Z"), order: 2 },
    { channelId: "ch-p2", senderRefOf: (c: string) => `ref:${c}`, newId: () => "c-2", identities: tracker },
  );
  assert.equal(parsedMile.text, null);
  assert.equal(mileEvt.message.event.body, "");
  assert.equal("paidText" in scEvt.message.event || "type" in scEvt.message.event, false);

  const streamRes = await runStreamList({
    liveChatId: "lc-p2",
    resumeToken: "steady-token-p2",
    config: {
      replayMaxAgeMs: 300_000,
      dedupeCapacity: 50,
      reconnectInitialMs: 1000,
      reconnectMaxMs: 5000,
      reconnectFactor: 2,
      rateLimitFloorMs: 5000,
      maxConsecutiveFailures: 3,
    },
    dedupe: createInMemoryMessageIdStore(10),
    now: () => Date.parse("2026-11-14T10:15:32.000Z"),
    sleep: async () => undefined,
    sink: { deliver: async () => undefined },
    transport: {
      async *connect() {
        yield { kind: "RESPONSE" as const, response: { items: [scRaw], offlineAt: "2026-11-14T10:10:00.000Z" } };
      },
    },
  });
  assert.equal(streamRes.stats.staleReplay, 1);
  assert.equal(streamRes.stats.delivered, 0);

  // Q57 R7 cross-instance skip check
  const T0 = "2026-11-14T12:10:00.000Z";
  const deadline = "2026-11-14T12:40:00.000Z";
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
  const bgEvent = {
    contractVersion: CONTRACT_VERSION,
    platform: "youtube" as const,
    channelId: "ch-p2",
    platformMessageId: "yt-bg-p2",
    platformOrder: 1,
    receivedAt: T0,
    correlationId: "corr-bg-p2",
    body: "fast pass candidate",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "viewer-p2" },
  };
  const mkRunner = (hasItem: boolean) =>
    createReviewRunner({
      store: {
        listOpenCandidates: () =>
          hasItem
            ? [
                {
                  eventId: "ev-bg-p2",
                  event: bgEvent,
                  settlementState: "UNSETTLED_FAST_PASS" as const,
                  settlementDeadlineAt: deadline,
                  evidenceExpiresAt: deadline,
                  exceptionMarked: false,
                  deletionInProgress: false,
                  manuallyDecided: false,
                },
              ]
            : [],
        readCandidate: () => undefined,
        markExpired: () => undefined,
        commitSettlement: () => ({ status: "SETTLED" as const }),
        markScoring: () => undefined,
        listPendingScoring: () => [],
      },
      coordinator,
      model: { reviewBatch: async () => ({ contractVersion: CONTRACT_VERSION, items: [] }) },
      scoring: {
        applyVerdict: async () => {
          throw new Error("unexpected");
        },
      },
      reviewQueue: { append: () => undefined },
      candidates: { propose: () => undefined },
      now: () => new Date(T0),
      newId: () => "id-p2",
      newNonce: () => "nonce-p2",
    });
  const runnerA = mkRunner(true);
  const runnerB = mkRunner(false);
  const cyc = await runnerA.runCycle({ channelId: "ch-p2", streamEnded: true });
  assert.equal(cyc.enqueued, 1);
  const batchB = await runnerB.runBatch();
  assert.equal(batchB?.items.length, 0);

  checks.push({
    id: "P2_q46_q41_q57_r7_reproducers_verified",
    passed: true,
    details: {
      milestoneText: parsedMile.text,
      steadyStateStaleReplay: streamRes.stats.staleReplay,
      runnerBItemsLength: batchB?.items.length,
    },
  });
}

// ============================================================================
// P3: Verify B14b No-Penalty Invariant on Positive Non-Zero Viewer Score (score=2 -> stays 2)
// ============================================================================
{
  const dir = scratchDirectory("m8cr1-p3-");
  const db = migratedDatabase(dir);
  const CH = "ch-m8cr1-p3";
  const T0 = "2026-11-14T12:20:00.000Z";

  runShortTransaction(db, (tx: unknown) => {
    const t = tx as typeof db.orm;
    t.insert(channels)
      .values({ id: CH, platform: "youtube", platformChannelRef: "UC-P3", displayName: "P3", createdAt: T0, updatedAt: T0 })
      .run();
    SubjectStore.create(tx, { id: "sub-p3", channelId: CH, platformSubjectKey: "viewer-p3", createdAt: T0 });
    t.insert(channelEvents)
      .values({
        id: "p3-ev-seed",
        channelId: CH,
        platformMessageRef: "p3-pm-seed",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "p3-corr-seed",
        subjectId: "sub-p3",
        eventVersion: 1,
        createdAt: T0,
      })
      .run();
    t.insert(tasks)
      .values({
        id: "p3-tk-seed",
        channelId: CH,
        eventId: "p3-ev-seed",
        eventVersion: 1,
        processingGeneration: 0,
        kind: "REALTIME_REVIEW",
        status: "RUNNING",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        createdAt: T0,
        updatedAt: T0,
      })
      .run();
  });

  const planner = createScoringPlanner({ enabled: true, complianceReward: 2, violationPenalty: 5, rewardCooldownMs: 0 });
  let seq = 0;
  const store = createDecisionStorePort(db, {
    planner,
    newId: () => `p3-id-${++seq}`,
    changeLogExpiresAt: () => "2099-01-01T00:00:00.000Z",
  });
  const decisions = createDecisionService({
    store,
    newId: () => `p3-did-${++seq}`,
    now: () => new Date(T0),
    limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
  });
  await decisions.commit("p3-tk-seed", createVerdict("ALLOW_MEANINGFUL"), { kind: "SYSTEM", source: "MODEL" });

  const initialScore = db.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "sub-p3")).get()!.currentScore;
  const initialLedgerCount = db.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, "sub-p3")).all().length;
  assert.equal(initialScore, 2);
  assert.equal(initialLedgerCount, 1);

  const scoring = createScoringEngine({ ledger: createScoringLedgerPort(db), clock: () => new Date(T0) });
  let scoringCalls = 0;
  let clockMs = Date.parse(T0);

  // (a) Realtime reportFailure escalation to PENDING_REVIEW
  const rtCoord = createTaskCoordinator({
    facts: {
      readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
      commitIfCurrent: (_k: unknown, _e: unknown, apply: () => void) => {
        apply();
        return { status: "committed" as const };
      },
    },
    concurrency: { current: () => 2 },
    clock: () => new Date(clockMs),
    limits: { maxBatchItems: 1 },
  });
  const rtEvent = {
    contractVersion: CONTRACT_VERSION,
    platform: "youtube" as const,
    channelId: CH,
    platformMessageId: "p3-rt-fail",
    platformOrder: 2,
    receivedAt: T0,
    correlationId: "p3-corr-rt",
    body: "transient error msg",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "viewer-p3" },
  };
  const rtRec = await rtCoord.enqueueInLane("REALTIME", rtEvent, "2099-01-01T00:00:00.000Z");
  for (let i = 0; i < 10; i++) {
    const b = await rtCoord.takeBatch();
    const out = await rtCoord.reportFailure(rtRec.taskId, "MODEL_TIMEOUT");
    await rtCoord.finishBatch(b!.batchId);
    if (out.status === "pending_review") break;
    if (out.status === "retry_scheduled") clockMs = out.notBeforeMs;
  }
  assert.equal(await rtCoord.statusOf(rtRec.taskId), "PENDING_REVIEW");

  // (b) Background ReviewRunner MODEL_CALL_FAILED & AI_OUTPUT_INVALID
  const bgStatuses: string[] = [];
  for (const mode of ["timeout", "bad-json"] as const) {
    const bgCoord = createTaskCoordinator({
      facts: {
        readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
        commitIfCurrent: (_k: unknown, _e: unknown, apply: () => void) => {
          apply();
          return { status: "committed" as const };
        },
      },
      concurrency: { current: () => 2 },
      clock: () => new Date(T0),
      limits: { maxBatchItems: 1 },
    });
    const runner = createReviewRunner({
      store: {
        listOpenCandidates: () => [
          {
            eventId: `p3-${mode}`,
            event: { ...rtEvent, platformMessageId: `pm-${mode}`, correlationId: `corr-${mode}` },
            settlementState: "UNSETTLED_FAST_PASS" as const,
            settlementDeadlineAt: "2099-01-01T00:00:00.000Z",
            evidenceExpiresAt: "2099-01-01T00:00:00.000Z",
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
      coordinator: bgCoord,
      model: {
        reviewBatch: async () => {
          if (mode === "timeout") throw new Error("AI_TIMEOUT");
          return { bad: true } as never;
        },
      },
      scoring: {
        applyVerdict: async (ev: unknown, v: unknown) => {
          scoringCalls += 1;
          return scoring.applyVerdict(ev, v);
        },
      },
      reviewQueue: { append: () => undefined },
      candidates: { propose: () => undefined },
      now: () => new Date(T0),
      newId: () => `id-${mode}`,
      newNonce: () => `nc-${mode}`,
    });
    await runner.runCycle({ channelId: CH, streamEnded: true });
    const res = await runner.runBatch();
    bgStatuses.push(`${res?.items[0]?.status}:${res?.items[0]?.status === "FAILED" ? res.items[0].errorCode : ""}`);
  }

  const finalScore = db.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "sub-p3")).get()!.currentScore;
  const finalLedgerCount = db.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, "sub-p3")).all().length;
  db.close();
  removeDirectory(dir);

  assert.equal(scoringCalls, 0);
  assert.equal(finalScore, 2);
  assert.equal(finalLedgerCount, 1);

  checks.push({
    id: "P3_b14b_positive_score_preserved_without_penalty_across_realtime_and_review_failures",
    passed: true,
    details: { initialScore, finalScore, initialLedgerCount, finalLedgerCount, scoringCalls, bgStatuses },
  });
}

// ============================================================================
// P4: Audit S026 Matrix, Docs, Specs & Tests for Portable Relative Paths, Link Resolution & Honest Matrix Statuses
// ============================================================================
{
  const s026RelFiles = [
    "docs/acceptance/core-flow-matrix.md",
    "tests/integration/core-flow/README.md",
    "tests/integration/core-flow/fixtures/routing-scoring.json",
    "tests/integration/core-flow/fixtures/dedupe-replay-sc.json",
    "tests/integration/core-flow/fixtures/manual-coordinator-wiring.json",
    "apps/server/test/integration/core-flow/routing-scoring.test.ts",
    "apps/server/test/integration/core-flow/dedupe-replay-sc.test.ts",
    "apps/server/test/integration/core-flow/manual-coordinator-wiring.test.ts",
    "apps/server/test/integration/core-flow/failure-no-penalty.test.ts",
    ".kiro/specs/voxward-s026-core-flow/design.md",
    ".kiro/specs/voxward-s026-core-flow/tasks.md",
    ".kiro/specs/voxward-s026-core-flow/requirements.md",
    ".kiro/specs/voxward-s026-core-flow/source.json",
    ".kiro/specs/voxward-s026-core-flow/evidence/self-check.md",
  ];

  const forbiddenScheme = "file:" + "//";
  const forbiddenWorktree = "." + "worktrees";
  const forbiddenHome = "/" + "home" + "/";
  const pathViolations: string[] = [];
  const resolvedLinks: string[] = [];
  const brokenLinks: string[] = [];

  for (const rel of s026RelFiles) {
    const abs = path.join(repoRoot, rel);
    assert.ok(fs.existsSync(abs), `Missing expected S026 file: ${rel}`);
    const rawTxt = fs.readFileSync(abs, "utf8");
    const txt = rawTxt.replace(/<!-- EINZBERN-SPEC:MANAGED-START -->[\s\S]*?<!-- EINZBERN-SPEC:MANAGED-END -->/g, "");
    if (txt.includes(forbiddenScheme) || txt.includes(forbiddenWorktree) || txt.includes(forbiddenHome)) {
      pathViolations.push(rel);
    }
    if (rel.endsWith(".md")) {
      const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
      for (const m of txt.matchAll(linkRe)) {
        const target = m[1]!;
        if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#")) continue;
        const cleanTarget = target.split("#")[0]!;
        const resolved = path.resolve(path.dirname(abs), cleanTarget);
        if (fs.existsSync(resolved)) {
          resolvedLinks.push(`${rel} -> ${cleanTarget}`);
        } else {
          brokenLinks.push(`${rel} -> ${cleanTarget}`);
        }
      }
    }
  }
  assert.equal(pathViolations.length, 0);
  // All 8 relative links in primary deliverable docs/acceptance/core-flow-matrix.md must resolve
  const matrixBroken = brokenLinks.filter((x) => x.startsWith("docs/acceptance/core-flow-matrix.md"));
  assert.equal(matrixBroken.length, 0);
  assert.equal(resolvedLinks.filter((x) => x.startsWith("docs/acceptance/core-flow-matrix.md")).length, 8);

  const matrixTxt = fs.readFileSync(path.join(repoRoot, "docs/acceptance/core-flow-matrix.md"), "utf8");
  for (const q of ["Q39", "Q41", "Q46", "Q52", "Q57"]) {
    assert.ok(
      new RegExp(`\\|\\s*\`${q}\`[^\\n]*\\|\\s*\`PARTIAL / OPEN\`\\s*\\|`).test(matrixTxt),
      `Expected ${q} to be PARTIAL / OPEN in matrix §3`,
    );
  }
  assert.ok(
    /\|\s*`Q55`[^\n]*\|\s*`FAIL \/ OPEN`\s*\|/.test(matrixTxt),
    "Expected Q55 to be FAIL / OPEN in matrix §3",
  );
  assert.ok(
    /\|\s*\*\*异常不扣分（`VW-R-004` \/ `B14b`）\*\*[^\n]*\|\s*`PASS`\s*\|/.test(matrixTxt),
    "Expected VW-R-004 / B14b row to be PASS in matrix §3",
  );
  assert.ok(matrixTxt.includes("`6a6af8a`") && matrixTxt.includes("`voxward/s026-fix1`"));

  checks.push({
    id: "P4_b14c_n16a_and_matrix_integrity_verified",
    passed: true,
    details: {
      filesAudited: s026RelFiles.length,
      pathViolationsCount: pathViolations.length,
      resolvedMarkdownLinksCount: resolvedLinks.length,
      resolvedLinks,
      nonBlockingBrokenLinks: brokenLinks,
    },
  });
}

const summary = {
  allProbesCompleted: checks.every((c) => c.passed),
  checkCount: checks.length,
  checks,
};

fs.writeFileSync(outJsonPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ allProbesCompleted: summary.allProbesCompleted, checkCount: summary.checkCount }));
