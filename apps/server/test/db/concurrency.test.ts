import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import { countRows, removeDirectory, scratchDirectory, seedChannelAndSubject, migratedDatabase } from "./helpers.js";

const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));
const SERVER_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CHILD_TIMEOUT_MS = 60_000;

interface ChildResult {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs one fixture in its own process, through tsx, and collects its output. */
function runFixture(name: string, args: readonly string[]): Promise<ChildResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", join(FIXTURES, name), ...args], {
      cwd: SERVER_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), CHILD_TIMEOUT_MS);
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
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

interface Summary {
  readonly created: number;
  readonly duplicate: number;
  readonly failed: number;
}

describe("concurrent writers", () => {
  let directory: string | undefined;
  let open: VoxwardDatabase | undefined;

  afterEach(() => {
    open?.close();
    open = undefined;
    if (directory !== undefined) removeDirectory(directory);
    directory = undefined;
  });

  it("four processes record the same 25 messages: each message is stored once and no write fails", async () => {
    directory = scratchDirectory("concurrency-");
    open = migratedDatabase(directory);
    const seed = seedChannelAndSubject(open);
    const filePath = join(directory, "voxward.sqlite3");

    const workers = ["w1", "w2", "w3", "w4"];
    const results = await Promise.all(
      workers.map((worker) => runFixture("record-events.ts", [filePath, worker, "25", seed.channelId, seed.subjectId])),
    );

    const summaries = results.map((result) => {
      expect(result.code, result.stderr).toBe(0);
      return JSON.parse(result.stdout) as Summary;
    });
    const total = summaries.reduce(
      (sum, summary) => ({
        created: sum.created + summary.created,
        duplicate: sum.duplicate + summary.duplicate,
        failed: sum.failed + summary.failed,
      }),
      { created: 0, duplicate: 0, failed: 0 },
    );

    expect(total).toEqual({ created: 25, duplicate: 75, failed: 0 });
    expect(countRows(open, "channel_events")).toBe(25);
  }, 120_000);

  it("a process killed before its COMMIT leaves no partial row, and committed rows survive the restart", async () => {
    directory = scratchDirectory("crash-");
    const filePath = join(directory, "voxward.sqlite3");
    const setup = openDatabase({ filePath });
    runMigrations(setup);
    setup.close();

    const result = await runFixture("write-then-die.ts", [filePath]);
    expect(result.signal).toBe("SIGKILL");

    open = openDatabase({ filePath });
    const names = (open.sqlite.prepare("select id from channels order by id").all() as Array<{ id: string }>).map(
      (row) => row.id,
    );
    expect(names).toEqual(["committed-channel"]);
    expect(open.sqlite.pragma("integrity_check", { simple: true })).toBe("ok");

    open.sqlite
      .prepare("insert into channels (id, platform, platform_channel_ref, display_name, created_at, updated_at) values ('after-restart', 'youtube', 'UC-after', 'after', '2026-11-10T10:04:00.000Z', '2026-11-10T10:04:00.000Z')")
      .run();
    expect(countRows(open, "channels")).toBe(2);
  }, 120_000);
});
