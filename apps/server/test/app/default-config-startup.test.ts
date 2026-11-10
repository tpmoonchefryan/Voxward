import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { removeDirectory, scratchDirectory } from "../db/helpers.js";

const SERVER_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MAIN_ENTRY = join(SERVER_ROOT, "src", "main.ts");
// The child runs from a scratch directory, where a bare "tsx" would not resolve, so the loader is named by URL.
const TSX_LOADER = pathToFileURL(join(SERVER_ROOT, "node_modules", "tsx", "dist", "loader.mjs")).href;
const RUN_TIMEOUT_MS = 60_000;
const PROBE_DEADLINE_MS = 45_000;

/** Starts src/main.ts in the given working directory. Only VOXWARD_ADAPTERS and the port are set, so the database path is the default. */
function startServer(workingDirectory: string, port: number): ChildProcess {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("VOXWARD_")));
  return spawn(process.execPath, ["--import", TSX_LOADER, MAIN_ENTRY], {
    cwd: workingDirectory,
    env: { ...inherited, VOXWARD_ADAPTERS: "synthetic", VOXWARD_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Keeps stderr for failure messages. Stdout is drained so a full pipe cannot block the child. */
function captureOutput(child: ChildProcess): { readonly stderr: () => string } {
  let stderr = "";
  child.stdout?.resume();
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  return { stderr: () => stderr };
}

async function probeHealthz(port: number): Promise<number | undefined> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`);
    await response.arrayBuffer();
    return response.status;
  } catch {
    return undefined;
  }
}

/** Polls until /healthz answers 200. If the child exits first, fails at once with the child's stderr. */
async function waitForHealthz(port: number, child: ChildProcess, stderr: () => string): Promise<number> {
  const deadline = Date.now() + PROBE_DEADLINE_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited with code ${child.exitCode}: ${stderr().trim()}`);
    }
    const status = await probeHealthz(port);
    if (status === 200) return status;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`/healthz did not answer 200 before the deadline: ${stderr().trim()}`);
}

/** Sends SIGTERM and resolves with the exit code once the child is gone. */
function stopServer(child: ChildProcess): Promise<number | null> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve) => {
    const killTimer = setTimeout(() => child.kill("SIGKILL"), 15_000);
    child.once("exit", (code) => {
      clearTimeout(killTimer);
      resolve(code);
    });
    child.kill("SIGTERM");
  });
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

describe("startup with the default configuration", () => {
  it("creates the default database under the working directory and answers /healthz with 200", async () => {
    const workingDirectory = scratchDirectory("default-config-");
    const port = await freePort();
    const child = startServer(workingDirectory, port);
    const output = captureOutput(child);

    let exitCode: number | null = null;
    try {
      expect(await waitForHealthz(port, child, output.stderr)).toBe(200);
      expect(existsSync(join(workingDirectory, "data", "voxward.sqlite3"))).toBe(true);
    } finally {
      exitCode = await stopServer(child);
      removeDirectory(workingDirectory);
    }
    expect(exitCode).toBe(0);
  }, RUN_TIMEOUT_MS);
});
