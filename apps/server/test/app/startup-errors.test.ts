import { spawn } from "node:child_process";
import { createServer, type AddressInfo, type Server } from "node:net";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SERVER_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RUN_TIMEOUT_MS = 60_000;

interface MainRun {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderrLines: string[];
}

/** Starts src/main.ts in a child process with only the given VOXWARD_* settings, and collects its output. */
function runMain(settings: Record<string, string>): Promise<MainRun> {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("VOXWARD_")));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
      cwd: SERVER_ROOT,
      env: { ...inherited, VOXWARD_ADAPTERS: "synthetic", ...settings },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), RUN_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderrLines: stderr.split("\n").filter((line) => line.trim() !== "") });
    });
  });
}

function listen(host: string, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}

async function freePort(): Promise<number> {
  const server = await listen("127.0.0.1", 0);
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

describe("startup failures", () => {
  it("prints one controlled line and exits non-zero when the host cannot be resolved", async () => {
    const run = await runMain({ VOXWARD_HOST: "no-such-host.invalid", VOXWARD_PORT: String(await freePort()) });

    expect(run.code).toBe(1);
    expect(run.stderrLines).toEqual(["LISTEN_FAILED: host (cannot be resolved)"]);
    expect(run.stderrLines.join("\n")).not.toMatch(/\bat\s+\S+\s+\(/);
  }, RUN_TIMEOUT_MS);

  it("prints one controlled line and exits non-zero when the port is already in use", async () => {
    const occupant = await listen("127.0.0.1", 0);
    try {
      const { port } = occupant.address() as AddressInfo;
      const run = await runMain({ VOXWARD_HOST: "127.0.0.1", VOXWARD_PORT: String(port) });

      expect(run.code).toBe(1);
      expect(run.stderrLines).toEqual(["LISTEN_FAILED: port (address already in use)"]);
      expect(run.stderrLines.join("\n")).not.toMatch(/\bat\s+\S+\s+\(/);
    } finally {
      await new Promise<void>((resolve) => occupant.close(() => resolve()));
    }
  }, RUN_TIMEOUT_MS);
});
