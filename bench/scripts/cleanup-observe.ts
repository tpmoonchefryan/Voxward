import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTRACT_VERSION, type InferenceRequest } from "../../packages/contracts/src/index.js";
import { KiroInferenceError } from "../../apps/server/src/adapters/kiro-cli/errors.js";
import { sweepOrphanRunDirectories } from "../../apps/server/src/adapters/kiro-cli/orphan-sweep.js";
import { fakeCliProvider } from "../lib/doubles.js";
import { environmentRecord, parseArgs, refuseRealModelRequest } from "../lib/gate.js";
import { countAlive, countKind, readFakeLog, waitForKind } from "../lib/fake-log.js";
import { BENCH_ROOT, createScratchDir, FAKE_CLI, TSX_LOADER_URL } from "../lib/paths.js";
import { errorCodeOf } from "../lib/metrics.js";

/** The text the fake CLI writes to stderr in fail mode. A failure must never carry it out of the adapter. */
const STDERR_MARKER = "stderr-secret-marker";
const RUN_DIRECTORY_PREFIX = "run-";

interface Attempt {
  readonly outcome: string;
  readonly errorCode: string | null;
  readonly exitCode: number | null;
  readonly validationCodes: readonly string[];
  readonly stderrMarkerLeaked: boolean;
}

interface Scenario {
  readonly scenario: string;
  readonly outcome: string;
  readonly errorCode: string | null;
  readonly exitCode: number | null;
  readonly validationCodes: readonly string[];
  readonly stderrMarkerLeaked: boolean;
  readonly residualRunDirs: number;
  readonly processesAlive: number;
  readonly sessionDeleteRequests: number;
  readonly clean: boolean;
}

function requestOf(batchId: string): InferenceRequest {
  return {
    contractVersion: CONTRACT_VERSION,
    batchId,
    items: [
      { correlationId: `bench-corr-${batchId}-1`, text: "bench probe one" },
      { correlationId: `bench-corr-${batchId}-2`, text: "bench probe two" },
    ],
  };
}

function residualRunDirs(runtimeRoot: string): number {
  return readdirSync(runtimeRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name.startsWith(RUN_DIRECTORY_PREFIX)).length;
}

/** Records what an adapter error reveals. Only codes, the exit status and validation codes are kept, never the message. */
function refusedAttempt(error: unknown): Attempt {
  const text = error instanceof Error ? `${error.name} ${error.message} ${error.stack ?? ""}` : String(error);
  return {
    outcome: "REFUSED",
    errorCode: errorCodeOf(error),
    exitCode: error instanceof KiroInferenceError ? (error.exitCode ?? null) : null,
    validationCodes: error instanceof KiroInferenceError ? error.validationCodes : [],
    stderrMarkerLeaked: text.includes(STDERR_MARKER),
  };
}

const COMPLETED: Attempt = { outcome: "COMPLETED", errorCode: null, exitCode: null, validationCodes: [], stderrMarkerLeaked: false };

/** Runs one scenario in its own scratch directory, then observes what it left behind. Leftover fake processes are stopped. */
async function scenario(name: string, act: (runtimeRoot: string, logPath: string) => Promise<Attempt>): Promise<Scenario> {
  const scratch = createScratchDir(`cleanup-${name}-`);
  const runtimeRoot = join(scratch, "runs");
  mkdirSync(runtimeRoot);
  const logPath = join(scratch, "fake-cli.log");
  const attempt = await act(runtimeRoot, logPath);
  const observed = observe(name, attempt, runtimeRoot, logPath);
  stopLeftovers(logPath);
  rmSync(scratch, { recursive: true, force: true });
  return observed;
}

function observe(name: string, attempt: Attempt, runtimeRoot: string, logPath: string): Scenario {
  const residual = residualRunDirs(runtimeRoot);
  const alive = countAlive(logPath);
  return {
    scenario: name,
    outcome: attempt.outcome,
    errorCode: attempt.errorCode,
    exitCode: attempt.exitCode,
    validationCodes: attempt.validationCodes,
    stderrMarkerLeaked: attempt.stderrMarkerLeaked,
    residualRunDirs: residual,
    processesAlive: alive,
    sessionDeleteRequests: countKind(logPath, "delete-session"),
    clean: residual === 0 && alive === 0,
  };
}

/**
 * Stops fake processes that the observation found still running. The bench created them, so the bench removes them, after
 * the observation was recorded.
 */
function stopLeftovers(logPath: string): void {
  const pids = new Set(readFakeLog(logPath).map((entry) => entry.pid));
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

async function crashRestart(): Promise<Record<string, unknown>> {
  const scratch = createScratchDir("cleanup-restart-");
  const runtimeRoot = join(scratch, "runs");
  mkdirSync(runtimeRoot);
  const logPath = join(scratch, "fake-cli.log");

  // A child process starts one batch that never ends, then the observer kills the child as a crashed host would.
  const child = spawn(process.execPath, ["--import", TSX_LOADER_URL, join(BENCH_ROOT, "lib", "crash-child.ts"), runtimeRoot, logPath], {
    cwd: BENCH_ROOT,
    stdio: "ignore",
  });
  await waitForKind(logPath, "started", 20_000);
  child.kill("SIGKILL");
  await once(child, "exit");

  const beforeSweep = { residualRunDirs: residualRunDirs(runtimeRoot), processesAlive: countAlive(logPath) };
  // The sweep runs three hours later, so the run directory counts as unclaimed.
  const sweep = await sweepOrphanRunDirectories({
    runtimeRoot,
    now: new Date(Date.now() + 3 * 60 * 60 * 1000),
    killGraceMs: 200,
    kiroCli: {
      command: FAKE_CLI,
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", FAKE_KIRO_LOG: logPath, FAKE_KIRO_MODE: "ok" },
      timeoutMs: 5_000,
    },
  });
  const afterSweep = observe("restart-after-kill", COMPLETED, runtimeRoot, logPath);
  stopLeftovers(logPath);
  rmSync(scratch, { recursive: true, force: true });
  return {
    scenario: "restart-after-kill",
    beforeSweep,
    orphanSweep: { ...sweep },
    afterSweep: { residualRunDirs: afterSweep.residualRunDirs, processesAlive: afterSweep.processesAlive, sessionDeleteRequests: afterSweep.sessionDeleteRequests, clean: afterSweep.clean },
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  refuseRealModelRequest(argv, process.env);
  const args = parseArgs(argv);

  const scenarios: Scenario[] = [];
  scenarios.push(
    await scenario("success", async (runtimeRoot, logPath) => {
      const provider = fakeCliProvider({ mode: "ok", logPath, runtimeRoot, maxItems: 10 });
      await provider.infer(requestOf("success-1"));
      return COMPLETED;
    }),
  );
  scenarios.push(
    await scenario("failure", async (runtimeRoot, logPath) => {
      const provider = fakeCliProvider({ mode: "fail", logPath, runtimeRoot, maxItems: 10 });
      try {
        await provider.infer(requestOf("failure-1"));
        return COMPLETED;
      } catch (error) {
        return refusedAttempt(error);
      }
    }),
  );
  scenarios.push(
    await scenario("invalid-output", async (runtimeRoot, logPath) => {
      const provider = fakeCliProvider({ mode: "invalid", logPath, runtimeRoot, maxItems: 10 });
      try {
        await provider.infer(requestOf("invalid-1"));
        return COMPLETED;
      } catch (error) {
        return refusedAttempt(error);
      }
    }),
  );
  scenarios.push(
    await scenario("cancel", async (runtimeRoot, logPath) => {
      const provider = fakeCliProvider({ mode: "hang", logPath, runtimeRoot, maxItems: 10 });
      const pending = provider.infer(requestOf("cancel-1")).then(
        (): unknown => null,
        (error: unknown): unknown => error,
      );
      await waitForKind(logPath, "started", 10_000);
      await provider.cancel("cancel-1");
      const error = await pending;
      return error === null ? COMPLETED : refusedAttempt(error);
    }),
  );
  scenarios.push(
    await scenario("timeout", async (runtimeRoot, logPath) => {
      const provider = fakeCliProvider({ mode: "hang", logPath, runtimeRoot, maxItems: 10, timeoutMs: 800, killGraceMs: 300 });
      try {
        await provider.infer(requestOf("timeout-1"));
        return COMPLETED;
      } catch (error) {
        return refusedAttempt(error);
      }
    }),
  );

  const restart = await crashRestart();

  const report = {
    schema: "voxward.bench.cleanup-observe.v1",
    bench: "VOXWARD-SUB-049",
    mode: "doubles-only",
    note: "Observations of the Kiro CLI adapter against the fake CLI. They show what this machine left behind. They do not prove what a real Kiro CLI retains.",
    environment: environmentRecord(),
    criteria: "after each scenario: residualRunDirs = 0 and processesAlive = 0. The exit code is 0 when the observation completes, not when cleanup passes; read the clean fields.",
    scenarios,
    restart,
    notMeasured: [
      "retention of sessions inside a real Kiro CLI account: needs the Owner account (SUB-050, Q60)",
      "behaviour of a real kiro-cli session delete command: the fake CLI answers every delete request",
    ],
  };

  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out !== undefined) writeFileSync(args.out, text);
  else process.stdout.write(text);
}

main().catch((error: unknown) => {
  process.stderr.write(`cleanup-observe: failed with ${errorCodeOf(error)}: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
