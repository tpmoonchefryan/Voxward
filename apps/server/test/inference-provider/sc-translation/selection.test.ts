import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KiroInferenceError } from "../../../src/adapters/kiro-cli/errors.js";
import { createKiroCliInferenceProvider } from "../../../src/adapters/kiro-cli/provider.js";
import { runScBatch } from "../../../src/modules/inference-provider/index.js";
import {
  createScratch,
  FAKE_CLI,
  fakeEnvironment,
  makeFakeExecutable,
  moderationValidator,
  readCalls,
} from "../../adapters/kiro-cli/helpers.js";
import {
  depsWith,
  requestOf,
  reportingAdapter,
  REPORT_CLAIMING_HIGH,
  REPORT_MODELS_NO_REASONING,
  SAFETY_SELECTION,
  SC_SELECTION,
  scOutput,
  standInScModel,
} from "./fixtures.js";

const batch = [{ correlationId: "sel-1", text: "thank you for the stream" }];
const SAMPLE = [{ correlationId: "sel-zh", text: "谢谢大家的支持" }];

/** The `--model` value of the one chat run the fake CLI logged, or null when that run had no model flag. */
function chatModelFlag(logPath: string): string | null {
  const argv = readCalls(logPath).find((call) => call.kind === "chat")?.argv ?? [];
  const index = argv.indexOf("--model");
  return index < 0 ? null : (argv[index + 1] ?? null);
}

describe("translation off: the safety run uses the chosen model through the real adapter", () => {
  let scratch: string;
  let runtimeRoot: string;

  beforeAll(() => {
    makeFakeExecutable();
    scratch = createScratch("sc-selection-");
    runtimeRoot = join(scratch, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

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

  it("refuses the run before any process starts when the adapter as built reports no model", async () => {
    const { provider, logPath } = adapterBuiltWith("own-report", "synthetic-model-b");
    const outcome = await runScBatch(
      requestOf("sel-own-report", batch),
      { translationEnabled: false, selection: SC_SELECTION },
      depsWith({ safety: provider }),
    );

    expect(outcome).toEqual({
      ok: false,
      batchId: "sel-own-report",
      reason: "SELECTION_REFUSED",
      issues: [{ code: "CAPABILITY_NOT_REPORTED", path: "/scTranslation" }],
    });
    expect(readCalls(logPath)).toEqual([]);
  });

  it("runs the chosen model whichever model the adapter was built with, and never calls the SC model", async () => {
    for (const [name, built] of [
      ["built-b", "synthetic-model-b"],
      ["built-none", undefined],
    ] as const) {
      const { provider, logPath } = adapterBuiltWith(name, built);
      const scModel = standInScModel((input) => scOutput(input));
      const outcome = await runScBatch(
        requestOf(`sel-${name}`, batch),
        { translationEnabled: false, selection: SAFETY_SELECTION },
        depsWith({ safety: reportingAdapter(provider, REPORT_MODELS_NO_REASONING), scModel }),
      );

      expect(outcome.ok).toBe(true);
      expect(chatModelFlag(logPath)).toBe("synthetic-model-a");
      expect(scModel.received).toEqual([]);
    }
  });

  it("fails explicitly, with no result and no process, when the selected level cannot be applied", async () => {
    const { provider, logPath } = adapterBuiltWith("high");
    const failure = await runScBatch(
      requestOf("sel-high", batch),
      { translationEnabled: false, selection: { modelId: "synthetic-model-a", reasoning: "high" } },
      depsWith({ safety: reportingAdapter(provider, REPORT_CLAIMING_HIGH) }),
    ).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(KiroInferenceError);
    expect((failure as KiroInferenceError).code).toBe("SELECTION_UNSUPPORTED");
    expect(readCalls(logPath)).toEqual([]);
  });
});

describe("translation on: the SC model port's own report governs the run", () => {
  it("refuses a reasoning level its SC model port does not report, and calls no model", async () => {
    const scModel = standInScModel((input) => scOutput(input), REPORT_MODELS_NO_REASONING);
    const outcome = await runScBatch(
      requestOf("sel-port-report", SAMPLE),
      { translationEnabled: true, selection: SC_SELECTION },
      depsWith({ scModel }),
    );

    expect(outcome).toEqual({
      ok: false,
      batchId: "sel-port-report",
      reason: "SELECTION_REFUSED",
      issues: [{ code: "REASONING_NOT_SUPPORTED", path: "/scTranslation/reasoning" }],
    });
    expect(scModel.sent).toEqual([]);
  });

  it("hands the chosen model and reasoning to the SC model port unchanged", async () => {
    const scModel = standInScModel((input) => scOutput(input));
    await runScBatch(
      requestOf("sel-handed", SAMPLE),
      { translationEnabled: true, selection: SC_SELECTION },
      depsWith({ scModel }),
    );

    expect(scModel.received).toEqual([{ batchId: "sel-handed", selection: SC_SELECTION }]);
  });
});
