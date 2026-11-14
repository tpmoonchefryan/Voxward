import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../../../..");

async function allocateFreePort(): Promise<number> {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate ephemeral port")));
        return;
      }
      const { port } = address;
      server.close((err) => (err ? reject(err) : resolvePort(port)));
    });
  });
}

async function waitForHttpReady(url: string, timeoutMs = 15_000): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}

async function isPortListening(host: string, port: number): Promise<boolean> {
  return await new Promise((resolveListening) => {
    const socket = createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolveListening(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolveListening(false);
    });
  });
}

describe("VOXWARD-SUB-047: standalone sandbox launcher & production fail-closed guard", () => {
  const dirs: string[] = [];
  const children: ChildProcess[] = [];

  afterEach(async () => {
    while (children.length > 0) {
      const child = children.pop();
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await new Promise((r) => child.once("exit", r));
      }
    }
    while (dirs.length > 0) {
      const dir = dirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("launches real HTTP+SPA sandbox on random port, serves /sandbox-api/state, /sandbox, and /sandbox-api/scenarios, and exits cleanly on SIGINT", async () => {
    const dir = mkdtempSync(join(tmpdir(), "voxward-sandbox-launcher-"));
    dirs.push(dir);
    const dbFile = join(dir, "sandbox.sqlite3");
    const port = await allocateFreePort();

    const child = spawn(process.execPath, [resolve(REPO_ROOT, "deploy/sandbox/start-sandbox.mjs")], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        VOXWARD_SANDBOX_ENABLED: "true",
        VOXWARD_SANDBOX_DB: dbFile,
        VOXWARD_SANDBOX_HOST: "127.0.0.1",
        VOXWARD_SANDBOX_PORT: String(port),
      },
    });
    children.push(child);

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    const stateRes = await waitForHttpReady(`${baseUrl}/sandbox-api/state`);
    expect(stateRes.status).toBe(200);
    const stateJson = (await stateRes.json()) as { role: string; snapshot: { syntheticOnly: boolean } };
    expect(stateJson.role).toBe("DEMO_STREAMER");
    expect(stateJson.snapshot.syntheticOnly).toBe(true);

    if (existsSync(resolve(REPO_ROOT, "apps/web/dist/index.html"))) {
      const spaRes = await fetch(`${baseUrl}/sandbox`);
      expect(spaRes.status).toBe(200);
      expect(spaRes.headers.get("content-type")).toContain("text/html");
      const html = await spaRes.text();
      expect(html.toLowerCase()).toContain("<!doctype html>");
    }

    const scenarioRes = await fetch(`${baseUrl}/sandbox-api/scenarios`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario: "normal-scoring" }),
    });
    expect(scenarioRes.status).toBe(200);
    const scenarioJson = (await scenarioRes.json()) as { ok: boolean; snapshot: { subjects: unknown[] } };
    expect(scenarioJson.ok).toBe(true);
    expect(scenarioJson.snapshot.subjects.length).toBeGreaterThan(0);

    const exitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveExit) => {
      child.once("exit", (code, signal) => resolveExit({ code, signal }));
    });
    child.kill("SIGINT");
    const exit = await exitPromise;
    expect(exit.code === 0 || exit.signal === "SIGINT", `stderr: ${stderr}`).toBe(true);

    const stillListening = await isPortListening("127.0.0.1", port);
    expect(stillListening).toBe(false);
  }, 25_000);

  it("refuses to start production main entry when VOXWARD_SANDBOX_ENABLED=true", async () => {
    const distMain = resolve(REPO_ROOT, "apps/server/dist/main.js");
    const tsxBin = resolve(REPO_ROOT, "apps/server/node_modules/.bin/tsx");
    const cmd = existsSync(distMain) ? process.execPath : tsxBin;
    const args = [existsSync(distMain) ? distMain : resolve(REPO_ROOT, "apps/server/src/main.ts")];

    const child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        VOXWARD_SANDBOX_ENABLED: "true",
      },
    });
    children.push(child);

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const exitCode = await new Promise<number | null>((resolveExit) => {
      child.once("exit", (code) => resolveExit(code));
    });
    expect(exitCode).toBe(1);
    expect(stderr).toContain("VOXWARD_SANDBOX_ENABLED");
  }, 15_000);
});
