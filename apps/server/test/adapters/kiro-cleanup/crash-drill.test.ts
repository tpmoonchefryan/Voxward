import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sweepOrphanRunDirectories } from "../../../src/adapters/kiro-cli/orphan-sweep.js";
import { SESSION_RECORD_FILE } from "../../../src/adapters/kiro-cli/session-lifecycle.js";
import {
  createScratch,
  FAKE_CLI,
  fakeEnvironment,
  isAlive,
  makeFakeExecutable,
  readCalls,
  waitFor,
} from "../kiro-cli/helpers.js";

const SERVER_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const CHILD = fileURLToPath(new URL("./fixtures/crash-child.ts", import.meta.url));

interface RecordView {
  readonly state: string;
  readonly pid: number | null;
  readonly kiroSessionId: string | null;
}

function recordIn(directory: string): RecordView {
  return JSON.parse(readFileSync(join(directory, SESSION_RECORD_FILE), "utf8")) as RecordView;
}

/** Waits for a condition without failing. The caller asserts the outcome, so a miss shows its actual value. */
async function settles(predicate: () => boolean, timeoutMs: number): Promise<void> {
  try {
    await waitFor(predicate, timeoutMs);
  } catch {
    // The predicate stayed false. The assertion that follows reports what was observed.
  }
}

function exited(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", () => resolve()));
}

describe("crash drill: the server dies while its CLI runs and has already named a saved session", () => {
  let scratch: string;
  let runtimeRoot: string;

  beforeAll(() => {
    makeFakeExecutable();
    scratch = createScratch("kiro-crash-drill-");
    runtimeRoot = join(scratch, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("requests the saved session's deletion once, leaves no orphan CLI, and removes the run directory", async () => {
    const logPath = join(scratch, "drill-calls.jsonl");
    const server = spawn(process.execPath, ["--import", "tsx", CHILD, runtimeRoot, logPath], {
      cwd: SERVER_ROOT,
      stdio: "ignore",
      detached: true,
    });
    const serverExit = exited(server);
    let cli: { readonly pid: number; readonly cwd: string } | undefined;
    try {
      await waitFor(() => readCalls(logPath).some((call) => call.kind === "started"), 30_000);
      const started = readCalls(logPath).find((call) => call.kind === "started");
      if (started === undefined) throw new Error("the fake CLI did not start");
      cli = started;
      const directory = started.cwd;

      // The CLI printed its session id before it hung. The server must have recorded it while the run was alive.
      await settles(() => recordIn(directory).kiroSessionId !== null, 3_000);
      expect.soft(recordIn(directory)).toMatchObject({ state: "running", kiroSessionId: "sess-fake-1" });

      // The server dies alone. Its CLI runs in its own process group and keeps going.
      server.kill("SIGKILL");
      await serverExit;
      expect.soft(isAlive(started.pid)).toBe(true);

      // A restarted server sweeps the runtime root.
      const report = await sweepOrphanRunDirectories({
        runtimeRoot,
        now: new Date(),
        kiroCli: { command: FAKE_CLI, env: fakeEnvironment(logPath, "ok") },
      });

      expect.soft(report.kiroSessions).toEqual({ requested: 1, failed: 0, notObserved: 0 });
      expect.soft(isAlive(started.pid)).toBe(false);
      expect.soft(existsSync(directory)).toBe(false);
      const deletions = readCalls(logPath).filter((call) => call.kind === "delete-session");
      expect.soft(deletions.map((call) => call.sessionId)).toEqual(["sess-fake-1"]);
      expect.soft(deletions.map((call) => call.cwd)).toEqual([directory]);
    } finally {
      if (cli !== undefined && isAlive(cli.pid)) process.kill(cli.pid, "SIGKILL");
      if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
      await serverExit;
    }
  }, 60_000);
});
