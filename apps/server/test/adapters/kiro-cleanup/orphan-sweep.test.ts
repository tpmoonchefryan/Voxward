import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { markRunDirectoryActive, releaseRunDirectory } from "../../../src/adapters/kiro-cli/active-runs.js";
import {
  type OrphanKiroCli,
  type OrphanSweepReport,
  scheduleOrphanSweeps,
  sweepOrphanRunDirectories,
} from "../../../src/adapters/kiro-cli/orphan-sweep.js";
import type { ProcessIdentity, ProcessProbe } from "../../../src/adapters/kiro-cli/process-probe.js";
import { openRunSession } from "../../../src/adapters/kiro-cli/session-lifecycle.js";
import {
  createScratch,
  FAKE_CLI,
  fakeEnvironment,
  isAlive,
  makeFakeExecutable,
  readCalls,
  waitFor,
} from "../kiro-cli/helpers.js";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const TWO_HOURS_AGO = new Date("2026-11-10T10:00:00.000Z");
const SLEEPER = "setInterval(() => {}, 1000)";

/** A pid of a process that has exited. Its process id is not running now. */
async function exitedPid(): Promise<number> {
  const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
  await new Promise<void>((resolve) => child.on("close", () => resolve()));
  if (child.pid === undefined) throw new Error("the helper process did not start");
  return child.pid;
}

/** The saved-session CLI of a test. `environment` chooses what the fake CLI lists or refuses to delete. */
function kiroCliFor(logPath: string, environment: Record<string, string> = {}): OrphanKiroCli {
  return { command: FAKE_CLI, env: { ...fakeEnvironment(logPath, "ok"), ...environment } };
}

/** Process facts for tests that must not reach a real process: every pid looks alive, and signals are only recorded. */
function scriptedProbe(identity: ProcessIdentity, signals: NodeJS.Signals[]): ProcessProbe {
  return {
    isAlive: () => true,
    identify: async () => identity,
    signalGroup: (_pid, signal) => {
      signals.push(signal);
    },
  };
}

function manualReasonOf(directory: string): string | undefined {
  const path = join(directory, "needs-manual.json");
  if (!existsSync(path)) return undefined;
  return (JSON.parse(readFileSync(path, "utf8")) as { reason: string }).reason;
}

describe("orphan sweep after a restart", () => {
  let scratch: string;

  beforeAll(() => {
    makeFakeExecutable();
    scratch = createScratch("kiro-sweep-");
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  /** A runtime root of its own, so each test sees only its own directories. */
  function rootFor(name: string): string {
    const root = join(scratch, name, "runtime");
    mkdirSync(root, { recursive: true });
    return root;
  }

  it("settles dead, finished and stale residue, keeps young batches, and refuses foreign entries", async () => {
    const root = rootFor("mixed");
    const logPath = join(scratch, "mixed-calls.jsonl");

    const dead = await exitedPid();
    const deadRun = await openRunSession(root, "sweep-dead", TWO_HOURS_AGO);
    await deadRun.markRunning(dead);
    await deadRun.recordKiroSession("sess-dead-1");

    const finishedRun = await openRunSession(root, "sweep-finished", TWO_HOURS_AGO);
    await finishedRun.finish("SUCCEEDED");

    const staleRun = await openRunSession(root, "sweep-stale", TWO_HOURS_AGO);
    const youngRun = await openRunSession(root, "sweep-young", NOW);

    const unmarked = join(root, "run-unmarked");
    mkdirSync(unmarked);
    const elsewhere = join(scratch, "mixed-elsewhere");
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(join(elsewhere, ".voxward-session"), "{}\n");
    symlinkSync(elsewhere, join(root, "run-link"));
    const corrupt = join(root, "run-corrupt");
    mkdirSync(corrupt);
    writeFileSync(join(corrupt, ".voxward-session"), "{}\n");
    writeFileSync(join(corrupt, "session.json"), "not json");
    mkdirSync(join(root, "keep-me"));
    const listedDirectories = [finishedRun.directory, staleRun.directory].map((path) => realpathSync(path));

    const report = await sweepOrphanRunDirectories({
      runtimeRoot: root,
      now: NOW,
      kiroCli: kiroCliFor(logPath, { FAKE_KIRO_LIST: "none" }),
    });

    expect(report).toEqual({
      removed: 3,
      skipped: 2,
      refused: 2,
      terminated: 0,
      manualAction: 0,
      kiroSessions: { requested: 1, failed: 0, notObserved: 2 },
    });
    expect(existsSync(deadRun.directory)).toBe(false);
    expect(existsSync(finishedRun.directory)).toBe(false);
    expect(existsSync(staleRun.directory)).toBe(false);
    expect(existsSync(youngRun.directory)).toBe(true);
    expect(existsSync(corrupt)).toBe(true);
    expect(existsSync(unmarked)).toBe(true);
    expect(existsSync(join(root, "run-link"))).toBe(true);
    expect(existsSync(join(elsewhere, ".voxward-session"))).toBe(true);
    expect(existsSync(join(root, "keep-me"))).toBe(true);

    const calls = readCalls(logPath);
    expect(calls.filter((call) => call.kind === "delete-session").map((call) => call.sessionId)).toEqual(["sess-dead-1"]);
    const listedIn = calls.filter((call) => call.kind === "list-sessions").map((call) => call.cwd);
    expect(listedIn.sort()).toEqual(listedDirectories.sort());
  });

  it.skipIf(process.platform !== "linux")(
    "stops a live CLI that works in an orphan's run directory, then removes the directory",
    async () => {
      const root = rootFor("live-cli");
      const logPath = join(scratch, "live-cli-calls.jsonl");
      const run = await openRunSession(root, "sweep-live-cli", TWO_HOURS_AGO);
      const cli = spawn(process.execPath, ["-e", SLEEPER], { cwd: run.directory, detached: true, stdio: "ignore" });
      try {
        if (cli.pid === undefined) throw new Error("the stand-in CLI did not start");
        await run.markRunning(cli.pid);

        const report = await sweepOrphanRunDirectories({
          runtimeRoot: root,
          now: NOW,
          kiroCli: kiroCliFor(logPath, { FAKE_KIRO_LIST: "none" }),
        });

        expect(report).toMatchObject({ removed: 1, terminated: 1, manualAction: 0 });
        await waitFor(() => cli.exitCode !== null || cli.signalCode !== null);
        expect(existsSync(run.directory)).toBe(false);
      } finally {
        if (cli.exitCode === null && cli.signalCode === null) cli.kill("SIGKILL");
      }
    },
  );

  it.skipIf(process.platform !== "linux")(
    "never signals a process that works elsewhere, even when the run record names its pid",
    async () => {
      const root = rootFor("reused-pid");
      const elsewhere = join(scratch, "reused-pid-elsewhere");
      mkdirSync(elsewhere, { recursive: true });
      const bystander = spawn(process.execPath, ["-e", SLEEPER], { cwd: elsewhere, detached: true, stdio: "ignore" });
      try {
        if (bystander.pid === undefined) throw new Error("the bystander did not start");
        const run = await openRunSession(root, "sweep-reused", TWO_HOURS_AGO);
        await run.markRunning(bystander.pid);

        const report = await sweepOrphanRunDirectories({
          runtimeRoot: root,
          now: NOW,
          kiroCli: kiroCliFor(join(scratch, "reused-pid-calls.jsonl"), { FAKE_KIRO_LIST: "none" }),
        });

        expect(report).toMatchObject({ removed: 1, terminated: 0, manualAction: 0 });
        expect(bystander.exitCode).toBeNull();
        expect(bystander.signalCode).toBeNull();
      } finally {
        if (bystander.exitCode === null && bystander.signalCode === null) bystander.kill("SIGKILL");
      }
    },
  );

  it("keeps a directory whose process cannot be identified, and signals nothing", async () => {
    const root = rootFor("unknown-identity");
    const run = await openRunSession(root, "sweep-unknown", TWO_HOURS_AGO);
    await run.markRunning(4242);
    const signals: NodeJS.Signals[] = [];

    const report = await sweepOrphanRunDirectories({
      runtimeRoot: root,
      now: NOW,
      processes: scriptedProbe("UNKNOWN", signals),
      kiroCli: kiroCliFor(join(scratch, "unknown-calls.jsonl")),
    });

    expect(report).toMatchObject({ removed: 0, terminated: 0, manualAction: 1 });
    expect(signals).toEqual([]);
    expect(existsSync(run.directory)).toBe(true);
    expect(manualReasonOf(run.directory)).toBe("IDENTITY_UNCONFIRMED");
  });

  it("keeps a directory whose process does not stop after TERM and KILL", async () => {
    const root = rootFor("stuck");
    const run = await openRunSession(root, "sweep-stuck", TWO_HOURS_AGO);
    await run.markRunning(4343);
    const signals: NodeJS.Signals[] = [];

    const report = await sweepOrphanRunDirectories({
      runtimeRoot: root,
      now: NOW,
      killGraceMs: 20,
      processes: scriptedProbe("RUNS_IN", signals),
      kiroCli: kiroCliFor(join(scratch, "stuck-calls.jsonl")),
    });

    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
    expect(report).toMatchObject({ removed: 0, terminated: 0, manualAction: 1 });
    expect(manualReasonOf(run.directory)).toBe("PROCESS_NOT_STOPPED");
  });

  it("lists the saved sessions of an orphan without a recorded id, inside its run directory", async () => {
    const root = rootFor("listed");
    const logPath = join(scratch, "listed-calls.jsonl");
    const run = await openRunSession(root, "sweep-listed", TWO_HOURS_AGO);
    await run.finish("RUN_FAILED");
    const directory = realpathSync(run.directory);

    const report = await sweepOrphanRunDirectories({
      runtimeRoot: root,
      now: NOW,
      kiroCli: kiroCliFor(logPath, { FAKE_KIRO_LIST: "one" }),
    });

    expect(report).toMatchObject({ removed: 1, manualAction: 0 });
    expect(report.kiroSessions).toEqual({ requested: 1, failed: 0, notObserved: 0 });
    const calls = readCalls(logPath);
    expect(calls.find((call) => call.kind === "list-sessions")?.cwd).toBe(directory);
    const deletions = calls.filter((call) => call.kind === "delete-session");
    expect(deletions.map((call) => call.sessionId)).toEqual(["sess-listed-1"]);
    expect(deletions.map((call) => call.cwd)).toEqual([directory]);
  });

  it("keeps a directory whose listing is unreadable, and deletes nothing from it", async () => {
    const root = rootFor("unreadable-listing");
    const logPath = join(scratch, "unreadable-listing-calls.jsonl");
    const run = await openRunSession(root, "sweep-unreadable", TWO_HOURS_AGO);
    await run.finish("RUN_FAILED");

    const report = await sweepOrphanRunDirectories({
      runtimeRoot: root,
      now: NOW,
      kiroCli: kiroCliFor(logPath, { FAKE_KIRO_LIST: "garbage" }),
    });

    expect(report).toMatchObject({ removed: 0, manualAction: 1 });
    expect(report.kiroSessions).toEqual({ requested: 0, failed: 0, notObserved: 0 });
    expect(existsSync(run.directory)).toBe(true);
    expect(manualReasonOf(run.directory)).toBe("SESSION_LISTING_UNAVAILABLE");
    expect(readCalls(logPath).some((call) => call.kind === "delete-session")).toBe(false);
  });

  it("keeps a directory for a person when no CLI is configured", async () => {
    const root = rootFor("no-cli");
    const run = await openRunSession(root, "sweep-no-cli", TWO_HOURS_AGO);
    await run.finish("RUN_FAILED");

    const report = await sweepOrphanRunDirectories({ runtimeRoot: root, now: NOW });

    expect(report).toMatchObject({ removed: 0, manualAction: 1 });
    expect(manualReasonOf(run.directory)).toBe("CLI_NOT_CONFIGURED");
  });

  it("keeps a directory whose deletion failed, and deletes it on the next pass", async () => {
    const root = rootFor("retry");
    const logPath = join(scratch, "retry-calls.jsonl");
    const run = await openRunSession(root, "sweep-retry", TWO_HOURS_AGO);
    await run.recordKiroSession("sess-retry-1");
    await run.finish("SUCCEEDED");

    const first = await sweepOrphanRunDirectories({
      runtimeRoot: root,
      now: NOW,
      kiroCli: kiroCliFor(logPath, { FAKE_KIRO_DELETE: "fail" }),
    });
    expect(first).toMatchObject({ removed: 0, manualAction: 1 });
    expect(first.kiroSessions).toEqual({ requested: 0, failed: 1, notObserved: 0 });
    expect(manualReasonOf(run.directory)).toBe("SESSION_DELETE_FAILED");

    const second = await sweepOrphanRunDirectories({ runtimeRoot: root, now: NOW, kiroCli: kiroCliFor(logPath) });
    expect(second).toMatchObject({ removed: 1, manualAction: 0 });
    expect(second.kiroSessions).toEqual({ requested: 1, failed: 0, notObserved: 0 });
    expect(existsSync(run.directory)).toBe(false);
  });

  it("skips a batch that runs in this process, even when its record looks finished", async () => {
    const root = rootFor("active");
    const kiroCli = kiroCliFor(join(scratch, "active-calls.jsonl"), { FAKE_KIRO_LIST: "none" });
    const run = await openRunSession(root, "sweep-active", TWO_HOURS_AGO);
    await run.finish("SUCCEEDED");

    markRunDirectoryActive(run.directory);
    try {
      const during = await sweepOrphanRunDirectories({ runtimeRoot: root, now: NOW, kiroCli });
      expect(during).toMatchObject({ removed: 0, skipped: 1 });
      expect(existsSync(run.directory)).toBe(true);
    } finally {
      releaseRunDirectory(run.directory);
    }

    const after = await sweepOrphanRunDirectories({ runtimeRoot: root, now: NOW, kiroCli });
    expect(after).toMatchObject({ removed: 1, skipped: 0 });
  });

  it("settles an orphan that appears after startup on a timer, then stops", async () => {
    const root = rootFor("scheduled");
    const reports: OrphanSweepReport[] = [];
    const errors: unknown[] = [];
    const schedule = scheduleOrphanSweeps({
      runtimeRoot: root,
      intervalMs: 20,
      kiroCli: kiroCliFor(join(scratch, "scheduled-calls.jsonl"), { FAKE_KIRO_LIST: "none" }),
      onReport: (report) => reports.push(report),
      onError: (error) => errors.push(error),
    });

    let directory: string;
    try {
      const run = await openRunSession(root, "sweep-scheduled", new Date());
      await run.finish("SUCCEEDED");
      directory = run.directory;
      await waitFor(() => !existsSync(directory), 5_000);
    } finally {
      schedule.stop();
    }

    expect(errors).toEqual([]);
    expect(reports.some((report) => report.removed === 1)).toBe(true);
    // A pass that was already running when stop() was called may still report. No pass starts after it.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const passesWhenSettled = reports.length;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(reports.length).toBe(passesWhenSettled);
  });

  it("does nothing when the runtime root does not exist", async () => {
    const report = await sweepOrphanRunDirectories({ runtimeRoot: join(scratch, "missing-root"), now: NOW });
    expect(report).toEqual({
      removed: 0,
      skipped: 0,
      refused: 0,
      terminated: 0,
      manualAction: 0,
      kiroSessions: { requested: 0, failed: 0, notObserved: 0 },
    });
  });
});
