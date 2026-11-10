import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sweepOrphanRunDirectories } from "../../../src/adapters/kiro-cli/orphan-sweep.js";
import { openRunSession } from "../../../src/adapters/kiro-cli/session-lifecycle.js";
import { createScratch } from "../kiro-cli/helpers.js";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const TWO_HOURS_AGO = new Date("2026-11-10T10:00:00.000Z");

/** A pid of a process that has exited. Its process id is not running now. */
async function exitedPid(): Promise<number> {
  const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
  await new Promise<void>((resolve) => child.on("close", () => resolve()));
  if (child.pid === undefined) throw new Error("the helper process did not start");
  return child.pid;
}

describe("orphan sweep after a restart", () => {
  let scratch: string;
  let runtimeRoot: string;

  beforeAll(async () => {
    scratch = createScratch("kiro-sweep-");
    runtimeRoot = join(scratch, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("removes residue of dead or finished runs, keeps live and young ones, and refuses foreign entries", async () => {
    const dead = await exitedPid();

    // A run that died: its process is gone, and the record still says running.
    const deadRun = await openRunSession(runtimeRoot, "sweep-dead", TWO_HOURS_AGO);
    await deadRun.markRunning(dead);
    await deadRun.recordKiroSession("sess-dead-1");

    // A run that finished but was never removed.
    const finishedRun = await openRunSession(runtimeRoot, "sweep-finished", TWO_HOURS_AGO);
    await finishedRun.finish("SUCCEEDED");

    // Never started, and older than the hour.
    const staleRun = await openRunSession(runtimeRoot, "sweep-stale", TWO_HOURS_AGO);

    // A run whose process still runs (this test process). It must be left alone.
    const liveRun = await openRunSession(runtimeRoot, "sweep-live", NOW);
    await liveRun.markRunning(process.pid);

    // Never started and still young: it may be in the middle of being created.
    const youngRun = await openRunSession(runtimeRoot, "sweep-young", NOW);

    // A run directory with no marker, and a symbolic link named like one, are foreign.
    const unmarked = join(runtimeRoot, "run-unmarked");
    mkdirSync(unmarked);
    const elsewhere = join(scratch, "elsewhere");
    mkdirSync(elsewhere);
    writeFileSync(join(elsewhere, ".voxward-session"), "{}\n");
    symlinkSync(elsewhere, join(runtimeRoot, "run-link"));

    // A run directory whose record is unreadable is judged by its age, and this one is new.
    const corrupt = join(runtimeRoot, "run-corrupt");
    mkdirSync(corrupt);
    writeFileSync(join(corrupt, ".voxward-session"), "{}\n");
    writeFileSync(join(corrupt, "session.json"), "not json");

    // Something that is not a run directory at all is not counted.
    mkdirSync(join(runtimeRoot, "keep-me"));

    const deleted: string[] = [];
    const report = await sweepOrphanRunDirectories({
      runtimeRoot,
      now: NOW,
      deleteKiroSession: async (sessionId) => {
        deleted.push(sessionId);
        return "DELETE_REQUESTED";
      },
    });

    expect(report).toEqual({
      removed: 3,
      skipped: 3,
      refused: 2,
      kiroSessions: { requested: 1, failed: 0, notObserved: 2 },
    });
    expect(deleted).toEqual(["sess-dead-1"]);

    expect(existsSync(deadRun.directory)).toBe(false);
    expect(existsSync(finishedRun.directory)).toBe(false);
    expect(existsSync(staleRun.directory)).toBe(false);
    expect(existsSync(liveRun.directory)).toBe(true);
    expect(existsSync(youngRun.directory)).toBe(true);
    expect(existsSync(corrupt)).toBe(true);
    expect(existsSync(unmarked)).toBe(true);
    expect(existsSync(join(runtimeRoot, "run-link"))).toBe(true);
    expect(existsSync(join(elsewhere, ".voxward-session"))).toBe(true);
    expect(existsSync(join(runtimeRoot, "keep-me"))).toBe(true);
  });

  it("does nothing when the runtime root does not exist", async () => {
    const report = await sweepOrphanRunDirectories({ runtimeRoot: join(scratch, "missing-root"), now: NOW });
    expect(report).toEqual({
      removed: 0,
      skipped: 0,
      refused: 0,
      kiroSessions: { requested: 0, failed: 0, notObserved: 0 },
    });
  });
});
