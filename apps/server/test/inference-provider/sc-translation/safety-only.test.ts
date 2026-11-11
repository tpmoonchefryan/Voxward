import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createKiroCliInferenceProvider } from "../../../src/adapters/kiro-cli/provider.js";
import { runScBatch, type ScRunOutcome } from "../../../src/modules/inference-provider/index.js";
import {
  createScratch,
  FAKE_CLI,
  fakeEnvironment,
  makeFakeExecutable,
  moderationValidator,
  readCalls,
} from "../../adapters/kiro-cli/helpers.js";
import { REPORT_WITH_MODELS } from "../model-settings/fixtures.js";
import { depsWith, requestOf, SC_SELECTION, scOutput, standInScModel } from "./fixtures.js";

/** Items sent to the fake CLI in its most recent logged chat call, parsed from the end of the prompt as the adapter tests do. */
function itemsSentTo(logPath: string): { itemId: string; text: string }[] {
  const chat = readCalls(logPath).filter((call) => call.kind === "chat").at(-1);
  const stdin = chat?.stdin ?? "";
  return (JSON.parse(stdin.slice(stdin.lastIndexOf('{"items":'))) as { items: { itemId: string; text: string }[] }).items;
}

describe("translation off: safety review through the real S008 adapter and the fake CLI", () => {
  let scratch: string;
  let runtimeRoot: string;
  let logPath: string;

  beforeAll(() => {
    makeFakeExecutable();
    scratch = createScratch("sc-safety-");
    runtimeRoot = join(scratch, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
    logPath = join(scratch, "calls.log");
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  const adapter = () =>
    createKiroCliInferenceProvider({
      command: FAKE_CLI,
      env: fakeEnvironment(logPath, "ok"),
      runtimeRoot,
      maxItems: 10,
      validateOutput: moderationValidator,
      timeoutMs: 20_000,
    });

  const batch = [
    { correlationId: "sc-1", text: "thank you for the stream" },
    { correlationId: "sc-2", text: "this has badword in it" },
  ];

  it("still reviews the paid text, so BLOCK is reported, and gives no item a cue sheet entry", async () => {
    const scModel = standInScModel((input) => scOutput(input));
    const outcome: ScRunOutcome = await runScBatch(
      requestOf("sc-off-1", batch),
      { translationEnabled: false, selection: SC_SELECTION },
      depsWith({ safety: adapter(), scModel, capabilities: () => REPORT_WITH_MODELS }),
    );

    expect(outcome).toEqual({
      ok: true,
      batchId: "sc-off-1",
      items: [
        { correlationId: "sc-1", classification: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], cue: null, withheld: "TRANSLATION_OFF" },
        { correlationId: "sc-2", classification: "BLOCK", reasonCodes: ["HARASSMENT"], matchedSpan: { start: 0, end: 1 }, cue: null, withheld: "VERDICT_BLOCK" },
      ],
    });
  });

  it("sends the CLI only a temporary item id and the text, with no translation field and no viewer data", async () => {
    await runScBatch(
      requestOf("sc-off-2", batch),
      { translationEnabled: false, selection: SC_SELECTION },
      depsWith({ safety: adapter(), capabilities: () => REPORT_WITH_MODELS }),
    );

    const sent = itemsSentTo(logPath);
    expect(sent.map((item) => item.text)).toEqual(["thank you for the stream", "this has badword in it"]);
    expect(sent.every((item) => Object.keys(item).sort().join(",") === "itemId,text")).toBe(true);
    expect(JSON.stringify(sent)).not.toContain("sc-1");
  });

  it("never reaches the SC translation model while translation is off", async () => {
    const scModel = standInScModel((input) => scOutput(input));
    await runScBatch(
      requestOf("sc-off-3", batch),
      { translationEnabled: false, selection: SC_SELECTION },
      depsWith({ safety: adapter(), scModel, capabilities: () => REPORT_WITH_MODELS }),
    );

    expect(scModel.sent).toEqual([]);
  });
});
