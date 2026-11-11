import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { CONTRACT_VERSION, type InferenceRequest, type InferenceSelection } from "@voxward/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KiroInferenceError } from "../../../src/adapters/kiro-cli/errors.js";
import { createKiroCliInferenceProvider } from "../../../src/adapters/kiro-cli/provider.js";
import {
  createScratch,
  FAKE_CLI,
  fakeEnvironment,
  makeFakeExecutable,
  moderationValidator,
  readCalls,
} from "./helpers.js";

const items = [{ correlationId: "sel-1", text: "hello there" }];
const CHOSEN: InferenceSelection = { modelId: "synthetic-model-a", reasoning: null };

function requestOf(batchId: string, selection?: InferenceSelection): InferenceRequest {
  return { contractVersion: CONTRACT_VERSION, batchId, items, ...(selection === undefined ? {} : { selection }) };
}

/** The value after `--model` in the one chat run the fake CLI logged, or null when that run had no model flag. */
function chatModelFlag(logPath: string): string | null {
  const argv = readCalls(logPath).find((call) => call.kind === "chat")?.argv ?? [];
  const index = argv.indexOf("--model");
  return index < 0 ? null : (argv[index + 1] ?? null);
}

/** The error of a run that must fail, or undefined when the run completed. */
function failureOf(pending: Promise<unknown>): Promise<unknown> {
  return pending.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe("Kiro CLI adapter: a run uses the model of its selection", () => {
  let scratch: string;
  let runtimeRoot: string;

  beforeAll(() => {
    makeFakeExecutable();
    scratch = createScratch("kiro-selection-");
    runtimeRoot = join(scratch, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  /** An adapter built with `model` (or with none), logging to a file of its own so each test reads only its runs. */
  function adapterBuiltWith(name: string, model?: string) {
    const logPath = join(scratch, `${name}.log`);
    const provider = createKiroCliInferenceProvider({
      command: FAKE_CLI,
      env: fakeEnvironment(logPath, "ok"),
      runtimeRoot,
      maxItems: 10,
      validateOutput: moderationValidator,
      timeoutMs: 20_000,
      ...(model === undefined ? {} : { model }),
    });
    return { provider, logPath };
  }

  it("runs with the selected model when the adapter was built with a different one", async () => {
    const { provider, logPath } = adapterBuiltWith("built-b", "synthetic-model-b");
    await provider.infer(requestOf("sel-built-b", CHOSEN));

    expect(chatModelFlag(logPath)).toBe("synthetic-model-a");
  });

  it("runs with the selected model when the adapter was built with no model", async () => {
    const { provider, logPath } = adapterBuiltWith("built-none");
    await provider.infer(requestOf("sel-built-none", CHOSEN));

    expect(chatModelFlag(logPath)).toBe("synthetic-model-a");
  });

  it("keeps the model the adapter was built with when a request carries no selection", async () => {
    const { provider, logPath } = adapterBuiltWith("built-b-plain", "synthetic-model-b");
    await provider.infer(requestOf("sel-plain"));

    expect(chatModelFlag(logPath)).toBe("synthetic-model-b");
  });

  it("refuses a reasoning level before any process starts, because the CLI has no reasoning flag", async () => {
    const { provider, logPath } = adapterBuiltWith("reasoning");
    const error = await failureOf(
      provider.infer(requestOf("sel-high", { modelId: "synthetic-model-a", reasoning: "high" })),
    );

    expect(error).toBeInstanceOf(KiroInferenceError);
    expect((error as KiroInferenceError).code).toBe("SELECTION_UNSUPPORTED");
    expect(readCalls(logPath)).toEqual([]);
  });

  it("refuses a model id that the CLI would read as a flag, before any process starts", async () => {
    const { provider, logPath } = adapterBuiltWith("flag-like");
    const error = await failureOf(
      provider.infer(requestOf("sel-flag", { modelId: "--trust-all-tools", reasoning: null })),
    );

    expect(error).toBeInstanceOf(KiroInferenceError);
    expect((error as KiroInferenceError).code).toBe("REQUEST_INVALID");
    expect(readCalls(logPath)).toEqual([]);
  });
});
