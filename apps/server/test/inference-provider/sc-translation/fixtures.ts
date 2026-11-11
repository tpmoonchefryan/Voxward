import {
  type AiBatchInput,
  CONTRACT_VERSION,
  type InferenceCapabilities,
  type InferenceProvider,
  type InferenceRequest,
} from "@voxward/contracts";
import { REPORT_WITH_MODELS } from "../model-settings/fixtures.js";
import { EXPLICIT_RULES, ruleEngineTextChecker } from "../validation/rule-engine-port.js";
import type { ModelSelection, ScModelPort, ScPipelineDeps } from "../../../src/modules/inference-provider/index.js";

/** The SC selection the fixtures choose. The report lists it, so the run is allowed to start. */
export const SC_SELECTION = { modelId: "synthetic-model-a", reasoning: "low" } as const;

/**
 * The selection of the translation-off tests. The S008 adapter cannot apply a reasoning level (STORY-010 G4), so these
 * runs take no reasoning level. A run that asks for one is refused, not run without it.
 */
export const SAFETY_SELECTION = { modelId: "synthetic-model-a", reasoning: null } as const;

/** Models without any reasoning level, as the S008 adapter can run them. */
export const REPORT_MODELS_NO_REASONING: InferenceCapabilities = {
  contractVersion: CONTRACT_VERSION,
  providerName: "synthetic-report",
  supportsCancel: true,
  models: [
    { modelId: "synthetic-model-a", reasoningLevels: [] },
    { modelId: "synthetic-model-b", reasoningLevels: [] },
  ],
};

/** A report that claims a reasoning level the adapter does not apply. The adapter must refuse such a run. */
export const REPORT_CLAIMING_HIGH: InferenceCapabilities = {
  contractVersion: CONTRACT_VERSION,
  providerName: "synthetic-report",
  supportsCancel: true,
  models: [{ modelId: "synthetic-model-a", reasoningLevels: ["high"] }],
};

/**
 * The adapter with its report replaced by `report`. The gate reads that report, and the run goes to the same adapter.
 * The S008 adapter's own describe() lists no model yet (STORY-010 G1), so the tests need this to open the gate.
 */
export function reportingAdapter(adapter: InferenceProvider, report: InferenceCapabilities): InferenceProvider {
  return { ...adapter, describe: () => report };
}

/**
 * Translations for the synthetic cross-language samples. The viewer texts are invented. They cover Chinese, Japanese,
 * English and a mixed line.
 */
export const TRANSLATIONS: Readonly<Record<string, string>> = {
  谢谢大家的支持: "Thank you all for the support",
  ありがとうございます: "Thank you very much",
  "thanks a lot": "Thanks a lot",
  今日は良い日ですね: "It is a good day today",
};

export function requestOf(batchId: string, items: readonly { readonly correlationId: string; readonly text: string }[]): InferenceRequest {
  return { contractVersion: CONTRACT_VERSION, batchId, items: [...items] };
}

/** A new temporary id per call, as the pipeline needs. */
export function counterIds(prefix = "item"): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `${prefix}-${next}`;
  };
}

interface ScFields {
  readonly verdict: string;
  readonly reasonCodes: readonly string[];
  readonly translatedText: string;
  readonly slangNote: string;
  readonly replyCue: string;
  readonly thankYouReading?: string;
}

/** The default answer for one text. A text containing "badword" is BLOCK, as in the fake CLI. */
function defaultFields(text: string): ScFields {
  if (text.includes("badword")) {
    return { verdict: "BLOCK", reasonCodes: ["HARASSMENT"], translatedText: "", slangNote: "", replyCue: "" };
  }
  return {
    verdict: "ALLOW_MEANINGFUL",
    reasonCodes: ["NONE"],
    translatedText: TRANSLATIONS[text] ?? "synthetic translation",
    slangNote: "synthetic slang note",
    replyCue: "synthetic reply cue",
  };
}

/** Builds a raw SC business output for a batch input. `override` changes the answer for chosen texts. */
export function scOutput(input: AiBatchInput, override: (text: string) => Partial<ScFields> = () => ({})): unknown {
  return {
    items: input.items.map((item) => ({ itemId: item.itemId, ...defaultFields(item.text), ...override(item.text) })),
  };
}

/**
 * The SC model stand-in. It records each batch it was sent, and the selection each call carried, so tests can check what
 * left the pipeline and what the port was asked to run.
 */
export function standInScModel(
  output: (input: AiBatchInput) => unknown,
  report: InferenceCapabilities = REPORT_WITH_MODELS,
): ScModelPort & {
  readonly sent: AiBatchInput[];
  readonly received: { readonly batchId: string; readonly selection: ModelSelection }[];
} {
  const sent: AiBatchInput[] = [];
  const received: { readonly batchId: string; readonly selection: ModelSelection }[] = [];
  return {
    sent,
    received,
    describe: () => report,
    async infer(input, call) {
      sent.push(input);
      received.push(call);
      return output(input);
    },
  };
}

/** Fails the test when it runs. The translation-on path must never reach the safety port. */
export const UNUSED_SAFETY: InferenceProvider = {
  moduleName: "InferenceProvider",
  contractVersion: CONTRACT_VERSION,
  describe: () => ({ contractVersion: CONTRACT_VERSION, providerName: "unused", supportsCancel: false }),
  infer: () => Promise.reject(new Error("the safety port must not run on this path")),
  cancel: () => Promise.resolve(),
  releaseSession: () => Promise.resolve(),
};

/** Dependencies for one run. Every default is synthetic, and each test replaces only what it needs. */
export function depsWith(overrides: Partial<ScPipelineDeps> = {}): ScPipelineDeps {
  return {
    safety: UNUSED_SAFETY,
    scModel: standInScModel((input) => scOutput(input)),
    generatedText: ruleEngineTextChecker(EXPLICIT_RULES),
    addressFor: async () => ({ display: "synthetic-address", reading: null }),
    newItemId: counterIds(),
    maxItems: 10,
    ...overrides,
  };
}
