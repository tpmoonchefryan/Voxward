import { messageLanguageOf, type InferenceProvider } from "@voxward/contracts";
import type { ScModelPort } from "../../modules/inference-provider/sc-translation/pipeline.js";

export function createSyntheticScModel(provider: InferenceProvider, knownLanguage?: string): ScModelPort {
  return {
    describe: () => provider.describe(),
    async infer({ items }, { languages }) {
      return {
        items: items.map(({ itemId, text }) => {
          const base = { itemId, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] };
          if (languages === undefined) return { ...base, translatedText: "[synthetic translation]", slangNote: "", replyCue: "" };
          const detected = messageLanguageOf(text, knownLanguage);
          return {
            ...base,
            sourceLanguage: languages.sourceLanguage === "auto" ? (detected === "mixed" ? "und" : detected) : languages.sourceLanguage,
            translations: languages.targetLanguages.map((targetLanguage) => ({
              targetLanguage, translatedText: `[synthetic translation: ${targetLanguage}]`, slangNote: "", replyCue: "",
            })),
          };
        }),
      };
    },
  };
}
