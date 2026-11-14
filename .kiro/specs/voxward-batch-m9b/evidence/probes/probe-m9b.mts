import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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

const { CONTRACT_VERSION, createVerdict } = await importRepo("packages/contracts/src/index.ts");
const { createAuditLogPort } = await importRepo("apps/server/src/db/audit-log.ts");
const { createDataRequestPort } = await importRepo("apps/server/src/db/data-request-store.ts");
const { SubjectStore } = await importRepo("apps/server/src/db/repository.ts");
const { channels, scoreExceptions, scoreLedger, subjectScores, subjects } = await importRepo(
  "apps/server/src/db/schema/index.ts",
);
const { createScoringLedgerPort } = await importRepo("apps/server/src/db/scoring-ledger.ts");
const { createSubjectCleanupPort } = await importRepo("apps/server/src/db/subject-cleanup.ts");
const { createSubjectReadPort } = await importRepo("apps/server/src/db/subject-read.ts");
const { createTombstoneLedger, ledgerRecorder } = await importRepo("apps/server/src/db/tombstone-ledger.ts");
const { runShortTransaction } = await importRepo("apps/server/src/db/transaction.ts");
const { RETENTION_DAYS } = await importRepo("apps/server/src/modules/audit-store/content-policy.ts");
const { createInvalidationBus } = await importRepo("apps/server/src/modules/audit-store/index.ts");
const { createDataRoutes, preferenceMarkerOf } = await importRepo(
  "apps/server/src/modules/data-lifecycle-service/index.ts",
);
const { createReviewRunner } = await importRepo("apps/server/src/modules/moderation-engine/review/runner.ts");
const { createScoringEngine } = await importRepo("apps/server/src/modules/scoring-engine/index.ts");
const { createTaskCoordinator } = await importRepo("apps/server/src/modules/task-coordinator/index.ts");
const { migratedDatabase, removeDirectory, scratchDirectory, T0 } = await importRepo("apps/server/test/db/helpers.ts");

interface ProbeCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly details: Record<string, unknown>;
}

const checks: ProbeCheck[] = [];

// ============================================================================
// P1: Verify All 27 SQLite Schema Tables Exist After Migrations AND Every Table Is Covered in data-lifecycle-matrix.md §2
// ============================================================================
{
  const dir = scratchDirectory("m9b-p1-schema-");
  const db = migratedDatabase(dir);
  const rows = db.sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name",
    )
    .all() as Array<{ name: string }>;
  const tableNames = rows.map((r) => r.name);
  db.close();
  removeDirectory(dir);

  assert.equal(tableNames.length, 27);
  const matrixMd = fs.readFileSync(path.join(repoRoot, "docs/acceptance/data-lifecycle-matrix.md"), "utf8");
  const missingFromMatrix = tableNames.filter((t) => !matrixMd.includes(`\`${t}\``));
  assert.equal(missingFromMatrix.length, 0);

  checks.push({
    id: "P1_all_27_sqlite_tables_verified_against_live_schema_and_matrix",
    passed: true,
    details: { tableCount: tableNames.length, missingFromMatrixCount: missingFromMatrix.length },
  });
}

// ============================================================================
// P2: Independent Check of Delayed Scoring Entry (ReviewRunner.resumePendingScoring) Under DELETE_AND_EXCEPT + Minimal Preference Marker
// ============================================================================
{
  const dir = scratchDirectory("m9b-p2-delayed-");
  const ledgerDir = scratchDirectory("m9b-p2-led-");
  const db = migratedDatabase(dir);
  const NOW = new Date(T0);

  runShortTransaction(db, (tx: unknown) => {
    const t = tx as typeof db.orm;
    t.insert(channels)
      .values({
        id: "ch-p2",
        platform: "youtube",
        platformChannelRef: "UC-SECRET-P2",
        displayName: "Secret P2",
        createdAt: T0,
        updatedAt: T0,
      })
      .run();
    SubjectStore.create(tx, { id: "sub-p2", channelId: "ch-p2", platformSubjectKey: "plat-secret-p2", createdAt: T0 });
  });

  const bus = createInvalidationBus();
  const routes = createDataRoutes({
    requests: createDataRequestPort(db),
    subjects: createSubjectReadPort(db),
    cleanup: createSubjectCleanupPort(db),
    logs: createAuditLogPort(db),
    caches: { names: ["RUNTIME_CACHE"], forgetSubject: () => 0 },
    publishInvalidation: (e: unknown) => bus.publish(e),
    tombstones: ledgerRecorder(createTombstoneLedger(ledgerDir)),
    certificateSummary: "DATA_REQUEST_CERTIFICATE",
    now: () => NOW,
    newId: randomUUID,
    retentionDays: RETENTION_DAYS,
  });
  const actor = { accountId: "acc-da", channelId: "ch-p2", capabilities: new Set(["data.handle"]) };
  const created = routes.createRequest(actor, {
    subjectRef: "sub-p2",
    kind: "DELETE",
    mode: "DELETE_AND_EXCEPT",
    requestSource: "OPERATOR_INITIATED",
  });
  const reqId = (created.body as { requestId: string }).requestId;
  routes.decideVerification(actor, reqId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
  const exec = routes.execute(actor, reqId);
  assert.equal((exec.body as { execution: string }).execution, "COMPLETED");

  // Delayed scoring via ReviewRunner.resumePendingScoring on a pending-score item for excepted subject
  const scoring = createScoringEngine({ ledger: createScoringLedgerPort(db), clock: () => NOW });
  const coordinator = createTaskCoordinator({
    facts: {
      readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
      commitIfCurrent: (_k: unknown, _e: unknown, apply: () => void) => {
        apply();
        return { status: "committed" as const };
      },
    },
    concurrency: { current: () => 2 },
    clock: () => NOW,
    limits: { maxBatchItems: 1 },
  });

  let markedStatus = "";
  const runner = createReviewRunner({
    store: {
      listOpenCandidates: () => [],
      readCandidate: () => undefined,
      markExpired: () => undefined,
      commitSettlement: () => ({ status: "SETTLED" as const }),
      markScoring: (_eventId: string, state: string) => {
        markedStatus = state;
      },
      listPendingScoring: () => [
        {
          eventId: "ev-delayed-1",
          event: {
            contractVersion: CONTRACT_VERSION,
            platform: "youtube" as const,
            channelId: "ch-p2",
            platformMessageId: "pm-delayed-1",
            platformOrder: 1,
            receivedAt: T0,
            correlationId: "corr-delayed-1",
            body: "delayed review message",
            sender: { contractVersion: CONTRACT_VERSION, senderRef: "plat-secret-p2" },
          },
          verdict: createVerdict("BLOCK", [{ code: "DELAYED_PENALTY", points: 10 }]),
        },
      ],
    },
    coordinator,
    model: { reviewBatch: async () => ({ contractVersion: CONTRACT_VERSION, items: [] }) },
    scoring,
    reviewQueue: { append: () => undefined },
    candidates: { propose: () => undefined },
    now: () => NOW,
    newId: randomUUID,
    newNonce: randomUUID,
  });

  const resumeRes = await runner.resumePendingScoring("ch-p2");
  const ledgerRows = db.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, "sub-p2")).all();
  const scoreRow = db.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, "sub-p2")).get();
  const subRow = db.orm.select().from(subjects).where(eq(subjects.id, "sub-p2")).get();
  const excRow = db.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, "sub-p2")).get();
  const marker = preferenceMarkerOf("sub-p2", T0);

  db.close();
  removeDirectory(dir);
  removeDirectory(ledgerDir);

  assert.equal(ledgerRows.length, 0);
  assert.equal(scoreRow?.currentScore, 0);
  assert.equal(subRow?.processingGeneration, 1);
  assert.equal(excRow?.removedAt, null);
  assert.deepEqual(Object.keys(marker).sort(), ["createdAt", "purpose", "subjectId"]);

  checks.push({
    id: "P2_delayed_review_scoring_and_preference_marker_verified",
    passed: true,
    details: {
      resumeRes,
      markedStatus,
      ledgerRowCount: ledgerRows.length,
      currentScore: scoreRow?.currentScore,
      processingGeneration: subRow?.processingGeneration,
      preferenceMarkerKeys: Object.keys(marker).sort(),
    },
  });
}

// ============================================================================
// P3: Audit S028 Docs, Matrix Links, Honest Boundary Disclosures & Zero Portable-Path Violations
// ============================================================================
{
  const s028Files = [
    "docs/acceptance/data-lifecycle-matrix.md",
    "apps/server/test/integration/data-lifecycle/deletion-matrix.test.ts",
    "apps/server/test/integration/data-lifecycle/scoring-and-faults.test.ts",
    "apps/server/test/integration/data-lifecycle/isolation-rbac-restore.test.ts",
    ".kiro/specs/voxward-s028-privacy-verify/design.md",
    ".kiro/specs/voxward-s028-privacy-verify/tasks.md",
    ".kiro/specs/voxward-s028-privacy-verify/requirements.md",
    ".kiro/specs/voxward-s028-privacy-verify/source.json",
    ".kiro/specs/voxward-s028-privacy-verify/evidence/self-check.md",
  ];

  const badScheme = "file:" + "///";
  const badHome = "/" + "home" + "/";
  const badWt = "." + "worktrees";
  const badTmp = "/" + "tmp" + "/";
  const violations: string[] = [];
  const resolvedLinks: string[] = [];

  for (const rel of s028Files) {
    const abs = path.join(repoRoot, rel);
    assert.ok(fs.existsSync(abs), `Missing S028 file: ${rel}`);
    const raw = fs.readFileSync(abs, "utf8");
    const txt = raw.replace(/<!-- EINZBERN-SPEC:MANAGED-START -->[\s\S]*?<!-- EINZBERN-SPEC:MANAGED-END -->/g, "");
    if (txt.includes(badScheme) || txt.includes(badHome) || txt.includes(badWt) || txt.includes(badTmp)) {
      violations.push(rel);
    }
    if (rel.endsWith(".md")) {
      const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
      for (const m of txt.matchAll(linkRe)) {
        const target = m[1]!;
        if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#")) continue;
        const cleanTarget = target.split("#")[0]!;
        const resolved = path.resolve(path.dirname(abs), cleanTarget);
        assert.ok(fs.existsSync(resolved), `Broken relative link in ${rel}: ${target}`);
        resolvedLinks.push(`${rel} -> ${cleanTarget}`);
      }
    }
  }
  assert.equal(violations.length, 0);
  assert.equal(resolvedLinks.length, 6);

  const matrixMd = fs.readFileSync(path.join(repoRoot, "docs/acceptance/data-lifecycle-matrix.md"), "utf8");
  assert.ok(matrixMd.includes("NO_SUBJECT_CACHES"));
  assert.ok(matrixMd.includes("Q30"));
  assert.ok(matrixMd.includes("YouTube / Google API"));
  assert.ok(matrixMd.includes("Kiro CLI"));

  checks.push({
    id: "P3_s028_docs_links_boundaries_and_portable_paths_verified",
    passed: true,
    details: {
      filesAudited: s028Files.length,
      violationsCount: violations.length,
      resolvedLinksCount: resolvedLinks.length,
      resolvedLinks,
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
