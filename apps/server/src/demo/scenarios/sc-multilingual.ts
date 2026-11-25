import {
  CONTRACT_VERSION,
  SC_MAX_TARGET_LANGUAGES,
  canonicalizeContentLanguage,
  type AiBatchInput,
  type InferenceCapabilities,
  type ModerationReasonCode,
  type ModerationRoute,
  type ScMultilingualBatchInput,
} from "@voxward/contracts";
import type { ScModelPort } from "../../modules/inference-provider/index.js";

/**
 * Sandbox-only synthetic multilingual SC model double.
 * Production adapters live under `apps/server/src/adapters/` and stay clean of sandbox fixtures.
 */
export function createSandboxMultilingualScModel(
  routeOf: (text: string) => Promise<ModerationRoute>,
  modelId = "synthetic-demo",
): ScModelPort {
  return {
    describe: (): InferenceCapabilities => ({
      contractVersion: CONTRACT_VERSION,
      providerName: "sandbox-sc-synthetic",
      supportsCancel: false,
      models: [{ modelId, reasoningLevels: [] }],
    }),
    async infer(input: AiBatchInput | ScMultilingualBatchInput) {
      const multiInput = input as ScMultilingualBatchInput;
      const targets = (multiInput.targetLanguages ?? ["en", "zh-Hans"])
        .map((lang) => canonicalizeContentLanguage(lang))
        .filter((lang): lang is string => lang !== null && lang !== "und" && lang !== "mixed")
        .slice(0, SC_MAX_TARGET_LANGUAGES);

      const items = await Promise.all(
        multiInput.items.map(async (item) => {
          const route = await routeOf(item.text);
          const blocked = route === "BLOCK";
          const reasonCodes: readonly ModerationReasonCode[] = blocked ? ["HARASSMENT"] : ["NONE"];
          return {
            itemId: item.itemId,
            verdict: blocked ? "BLOCK" : "ALLOW_MEANINGFUL",
            reasonCodes,
            sourceLanguage: item.language ?? "und",
            translations: blocked
              ? []
              : targets.map((language) => ({
                  language,
                  translatedText: `[${language}] ${item.text}`,
                  slangNote: "",
                  replyCue: "",
                })),
          };
        }),
      );
      return { items };
    },
  };
}
