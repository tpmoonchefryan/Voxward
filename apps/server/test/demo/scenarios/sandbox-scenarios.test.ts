import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { issueOutputToken } from "../../../src/auth/downstream-tokens.js";
import { createAccount } from "../../../src/auth/login.js";
import { issueNativeGrant } from "../../../src/auth/output-grants.js";
import { readDockAndModerationFeed } from "../../../src/db/channel-panel-read.js";
import { openDatabase, type VoxwardDatabase } from "../../../src/db/client.js";
import { runMigrations } from "../../../src/db/migrate.js";
import { createApprovedContentPort } from "../../../src/db/output-store.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { createSandboxRuntime } from "../../../src/demo/scenarios/index.js";
import { SANDBOX_CHANNEL_ID } from "../../../src/demo/synthetic-source.js";

function setupSandboxDb(dirs: string[]): VoxwardDatabase {
  const dir = mkdtempSync(join(tmpdir(), "voxward-sandbox-scen-"));
  dirs.push(dir);
  const db = openDatabase({ filePath: join(dir, "sandbox.sqlite3") });
  runMigrations(db);
  return db;
}

describe("VOXWARD-SUB-046: sandbox synthetic scenarios and deterministic reset", () => {
  const dbs: VoxwardDatabase[] = [];
  const dirs: string[] = [];

  afterEach(() => {
    while (dbs.length > 0) {
      dbs.pop()?.close();
    }
    while (dirs.length > 0) {
      const dir = dirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs normal scoring, spam/toxicity block, superchat plain-text translation, and manual review", async () => {
    const db = setupSandboxDb(dirs);
    dbs.push(db);
    const runtime = createSandboxRuntime(db);

    const before = runtime.snapshot();
    expect(before.banner).toContain("SYNTHETIC SANDBOX");
    expect(before.subjects.find((s) => s.subjectKey === "demo-viewer-alice")?.currentScore).toBe(10);

    await runtime.runScenario("normal-scoring");
    await runtime.runScenario("spam-toxicity-block");
    const scRes = await runtime.runScenario("superchat-translation");
    await runtime.runScenario("manual-review");

    const snap = runtime.snapshot();
    expect(snap.subjects.find((s) => s.subjectKey === "demo-viewer-alice")?.currentScore).toBe(11);
    expect(snap.subjects.find((s) => s.subjectKey === "demo-viewer-bob")?.currentScore).toBe(0);
    expect(snap.blockedItems.length).toBe(1);
    expect(snap.reviewQueue.length).toBe(1);
    expect(snap.candidateCards.length).toBe(1);
    expect(snap.approvedStage.some((item) => item.amountDisplay === "$10.00")).toBe(true);

    // SuperChat TRANSLATION evidence is plain text, compatible with both output-store and channel-panel-read
    const approvedPort = createApprovedContentPort(db);
    const portRead = approvedPort.readApproved({
      channelId: SANDBOX_CHANNEL_ID,
      correlationId: scRes.correlationId!,
      nowIso: new Date().toISOString(),
    });
    expect(portRead?.translation).toBe("Thanks for the awesome stream! Supporting you always!");

    const feed = readDockAndModerationFeed(db, SANDBOX_CHANNEL_ID, {
      includeOriginal: true,
      nowIso: new Date().toISOString(),
    });
    expect(feed.approvedSc.some((sc) => sc.translation === "Thanks for the awesome stream! Supporting you always!")).toBe(
      true,
    );

    // Manual review decision
    const taskId = snap.reviewQueue[0]!.taskId;
    const decided = await runtime.decideReview(taskId, "ALLOW_MEANINGFUL");
    expect(decided.status).toBe(200);
    expect(runtime.snapshot().reviewQueue.length).toBe(0);
  });

  it("executes DELETE and DELETE_AND_EXCEPT with SubjectCacheHub + CandidateStore cleanup and blocks subsequent scoring", async () => {
    const db = setupSandboxDb(dirs);
    dbs.push(db);
    const runtime = createSandboxRuntime(db);

    await runtime.runScenario("normal-scoring");
    await runtime.runScenario("manual-review");
    expect(runtime.snapshot().cacheEntryCount).toBeGreaterThan(0);

    await runtime.runScenario("privacy-delete", { subjectKey: "demo-viewer-charlie" });
    const afterDelete = runtime.snapshot();
    expect(afterDelete.candidateCards.length).toBe(0);
    expect(afterDelete.dataRequests.some((r) => r.mode === "DELETE_DATA_ONLY" && r.executionState === "COMPLETED")).toBe(
      true,
    );

    await runtime.runScenario("privacy-delete-and-except", { subjectKey: "demo-viewer-alice" });
    const afterExcept = runtime.snapshot();
    const alice = afterExcept.subjects.find((s) => s.subjectKey === "demo-viewer-alice")!;
    expect(alice.hasException).toBe(true);
    expect(alice.currentScore).toBe(0);
    expect(alice.processingGeneration).toBeGreaterThan(0);

    // Subsequent message from excepted subject must NOT change score and routes to PENDING_REVIEW
    const afterMsg = await runtime.ingestCustom({
      subjectKey: "demo-viewer-alice",
      text: "Hello again after exception!",
    });
    expect(afterMsg.classification).toBe("PENDING_REVIEW");
    expect(runtime.snapshot().subjects.find((s) => s.subjectKey === "demo-viewer-alice")?.currentScore).toBe(0);
  });

  it("deterministically resets all sandbox state and in-memory caches", async () => {
    const db = setupSandboxDb(dirs);
    dbs.push(db);
    const runtime = createSandboxRuntime(db);

    await runtime.runScenario("normal-scoring");
    await runtime.runScenario("spam-toxicity-block");
    await runtime.runScenario("superchat-translation");
    await runtime.runScenario("manual-review");
    const acc = await createAccount(db, {
      loginName: "sbx-owner-reset",
      displayName: "Sandbox Owner",
      password: "reset-test-password-123",
      now: new Date(),
    });
    runShortTransaction(db, (tx) => {
      issueNativeGrant(tx, { channelId: SANDBOX_CHANNEL_ID, nowIso: new Date().toISOString(), outputKind: "OBS_OVERLAY" });
      issueOutputToken(tx, { channelId: SANDBOX_CHANNEL_ID, createdByAccountId: acc.accountId, now: new Date() });
    });

    runtime.reset();
    const snap = runtime.snapshot();
    expect(snap.reviewQueue.length).toBe(0);
    expect(snap.blockedItems.length).toBe(0);
    expect(snap.approvedStage.length).toBe(0);
    expect(snap.candidateCards.length).toBe(0);
    expect(snap.cacheEntryCount).toBe(0);
    expect(snap.subjects.find((s) => s.subjectKey === "demo-viewer-alice")?.currentScore).toBe(10);
    expect(snap.subjects.find((s) => s.subjectKey === "demo-viewer-bob")?.currentScore).toBe(5);
  });
});
