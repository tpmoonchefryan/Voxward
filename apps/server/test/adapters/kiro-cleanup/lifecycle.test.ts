import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CONTRACT_VERSION, type InferenceRequest } from "@voxward/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { KiroInferenceError } from "../../../src/adapters/kiro-cli/errors.js";
import { createKiroCliInferenceProvider, type KiroCliProviderOptions } from "../../../src/adapters/kiro-cli/provider.js";
import {
  createScratch,
  FAKE_CLI,
  fakeEnvironment,
  isAlive,
  makeFakeExecutable,
  moderationValidator,
  readCalls,
  waitFor,
} from "../kiro-cli/helpers.js";

const items = [
  { correlationId: "corr-life-1", text: "lifecycle message one" },
  { correlationId: "corr-life-2", text: "lifecycle message two" },
];

function requestOf(batchId: string): InferenceRequest {
  return { contractVersion: CONTRACT_VERSION, batchId, items };
}

async function failureOf(pending: Promise<unknown>): Promise<KiroInferenceError> {
  try {
    await pending;
  } catch (error) {
    if (error instanceof KiroInferenceError) return error;
    throw error;
  }
  throw new Error("expected the run to fail");
}

describe("one-time session lifecycle", () => {
  let scratch: string;
  let runtimeRoot: string;
  let logPath: string;

  beforeAll(() => {
    makeFakeExecutable();
    scratch = createScratch("kiro-lifecycle-");
    runtimeRoot = join(scratch, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  beforeEach(() => {
    logPath = join(scratch, `calls-${randomUUID()}.jsonl`);
  });

  function providerFor(mode: string, overrides: Partial<KiroCliProviderOptions> = {}) {
    return createKiroCliInferenceProvider({
      command: FAKE_CLI,
      env: fakeEnvironment(logPath, mode),
      runtimeRoot,
      maxItems: 10,
      validateOutput: moderationValidator,
      ...overrides,
    });
  }

  function runDirectoryOf(kind: "chat" | "started"): string {
    const call = readCalls(logPath).find((entry) => entry.kind === kind);
    if (call === undefined) throw new Error(`no ${kind} call was recorded`);
    return call.cwd;
  }

  it("removes the run directory after a successful run, and keeps the runtime root", async () => {
    const result = await providerFor("ok").infer(requestOf("life-success"));
    expect(result.items).toHaveLength(2);
    const directory = runDirectoryOf("chat");
    expect(dirname(directory)).toBe(realpathSync(runtimeRoot));
    expect(basename(directory)).toMatch(/^run-/);
    expect(existsSync(directory)).toBe(false);
    expect(existsSync(runtimeRoot)).toBe(true);
  });

  it("removes the run directory after a failed run", async () => {
    const error = await failureOf(providerFor("fail").infer(requestOf("life-failure")));
    expect(error.code).toBe("RUN_FAILED");
    expect(existsSync(runDirectoryOf("chat"))).toBe(false);
  });

  it("removes the run directory after a timeout", async () => {
    const error = await failureOf(providerFor("hang", { timeoutMs: 300 }).infer(requestOf("life-timeout")));
    expect(error.code).toBe("RUN_TIMEOUT");
    expect(existsSync(runDirectoryOf("started"))).toBe(false);
  });

  it("removes the run directory after a cancellation", async () => {
    const provider = providerFor("hang");
    const pending = failureOf(provider.infer(requestOf("life-cancel")));
    await waitFor(() => readCalls(logPath).some((entry) => entry.kind === "started"));
    const directory = runDirectoryOf("started");
    expect(existsSync(directory)).toBe(true);

    await provider.cancel("life-cancel");
    expect((await pending).code).toBe("RUN_CANCELLED");
    expect(existsSync(directory)).toBe(false);
  });

  it("keeps only a marker and a metadata record in the run directory while the run is alive", async () => {
    const provider = providerFor("hang");
    const pending = failureOf(provider.infer(requestOf("life-metadata")));
    await waitFor(() => readCalls(logPath).some((entry) => entry.kind === "started"));
    const started = readCalls(logPath).find((entry) => entry.kind === "started");
    const directory = runDirectoryOf("started");

    // The session id reaches the record as soon as the run stream names it, while the run is still alive.
    await waitFor(() => JSON.parse(readFileSync(join(directory, "session.json"), "utf8")).kiroSessionId !== null);
    expect(readdirSync(directory).sort()).toEqual([".voxward-session", "session.json"]);
    const text = readFileSync(join(directory, "session.json"), "utf8");
    const record = JSON.parse(text) as { batchId: string; state: string; pid: number; kiroSessionId: string | null };
    expect(record).toMatchObject({ batchId: "life-metadata", state: "running", kiroSessionId: "sess-fake-1" });
    expect(record.pid).toBe(started?.pid);
    for (const forbidden of ["lifecycle message", "corr-life", "itemId", "items"]) {
      expect(text).not.toContain(forbidden);
    }

    await provider.cancel("life-metadata");
    await pending;
    expect(existsSync(directory)).toBe(false);
  });

  it("asks the CLI to delete the saved session that a successful run named", async () => {
    await providerFor("ok").infer(requestOf("life-delete"));
    const deletion = readCalls(logPath).find((entry) => entry.kind === "delete-session");
    expect(deletion?.argv).toEqual(["chat", "--delete-session", "sess-fake-1"]);
    expect(basename(deletion?.cwd ?? "")).toMatch(/^run-/);
  });

  it("sends no delete command when the run named no session", async () => {
    await failureOf(providerFor("fail").infer(requestOf("life-no-session")));
    expect(readCalls(logPath).some((entry) => entry.kind === "delete-session")).toBe(false);
  });

  it("keeps the run directory when the saved session cannot be deleted, so the orphan sweep can retry it", async () => {
    const env = { ...fakeEnvironment(logPath, "ok"), FAKE_KIRO_DELETE: "fail" };
    await providerFor("ok", { env }).infer(requestOf("life-delete-fails"));
    const directory = runDirectoryOf("chat");

    expect(existsSync(directory)).toBe(true);
    const record = JSON.parse(readFileSync(join(directory, "session.json"), "utf8")) as Record<string, unknown>;
    expect(record).toMatchObject({ state: "finished", kiroSessionId: "sess-fake-1" });
  });
});
