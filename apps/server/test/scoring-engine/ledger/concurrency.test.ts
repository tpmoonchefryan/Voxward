import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { countRows, migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";
import { ledgerRows, scoreOf, seedChannels } from "./helpers.js";

const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));
const SERVER_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const CHILD_TIMEOUT_MS = 60_000;

interface ChildResult {
  readonly code: number | null;
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
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

interface Summary {
  readonly failed: number;
  readonly deltas: number[];
}

describe("concurrent scoring of one subject", () => {
  let directory: string | undefined;
  let open: VoxwardDatabase | undefined;

  afterEach(() => {
    open?.close();
    open = undefined;
    if (directory !== undefined) removeDirectory(directory);
    directory = undefined;
  });

  it("four processes deliver the same event: one ledger row, one score change, and every reply carries the same delta", async () => {
    directory = scratchDirectory("scoring-concurrency-");
    open = migratedDatabase(directory);
    seedChannels(open, ["channel-a"]);
    const filePath = join(directory, "voxward.sqlite3");

    const results = await Promise.all(
      ["w1", "w2", "w3", "w4"].map((worker) =>
        runFixture("score-subject.ts", [filePath, worker, "same-event", "5", "channel-a", "viewer-1"]),
      ),
    );

    const summaries = results.map((result) => {
      expect(result.code, result.stderr).toBe(0);
      return JSON.parse(result.stdout) as Summary;
    });
    const deltas = summaries.flatMap((summary) => summary.deltas);

    expect(summaries.reduce((sum, summary) => sum + summary.failed, 0)).toBe(0);
    expect(deltas).toHaveLength(20);
    expect(deltas.every((delta) => delta === 2)).toBe(true);
    expect(ledgerRows(open, "channel-a", "viewer-1")).toHaveLength(1);
    expect(scoreOf(open, "channel-a", "viewer-1")).toMatchObject({ current: 2, version: 1 });
  }, 120_000);

  it("four processes penalise one subject with distinct events: the ledger stops at the lower limit and matches the stored score", async () => {
    directory = scratchDirectory("scoring-concurrency-");
    open = migratedDatabase(directory);
    seedChannels(open, ["channel-a"]);
    const filePath = join(directory, "voxward.sqlite3");

    const results = await Promise.all(
      ["w1", "w2", "w3", "w4"].map((worker) =>
        runFixture("score-subject.ts", [filePath, worker, "penalties", "10", "channel-a", "viewer-2"]),
      ),
    );

    const summaries = results.map((result) => {
      expect(result.code, result.stderr).toBe(0);
      return JSON.parse(result.stdout) as Summary;
    });
    const rows = ledgerRows(open, "channel-a", "viewer-2");

    expect(summaries.reduce((sum, summary) => sum + summary.failed, 0)).toBe(0);
    expect(rows).toHaveLength(20);
    expect(rows.every((row) => row.actual_delta === -5)).toBe(true);
    expect(rows.reduce((sum, row) => sum + row.actual_delta, 0)).toBe(-100);
    expect(scoreOf(open, "channel-a", "viewer-2")).toMatchObject({ current: -100, behavior: -100, identity: 0, version: 20 });
    expect(countRows(open, "subjects")).toBe(1);
  }, 120_000);
});
