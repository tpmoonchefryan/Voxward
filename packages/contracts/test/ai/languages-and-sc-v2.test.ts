import { describe, expect, it } from "vitest";
import {
  SC_MULTILINGUAL_BATCH_SCHEMA,
  UI_SUPPORTED_LANGUAGES,
  canonicalizeContentLanguage,
  parseScLanguagePolicy,
  parseTermLanguage,
  validateScBatchResult,
  validateScMultilingualBatchResult,
} from "../../src/index.js";

describe("BCP 47 content languages and VoxWardScBatchV2", () => {
  it("keeps UI presets separate from open BCP 47 content canonicalization without downgrading to und", () => {
    expect(UI_SUPPORTED_LANGUAGES).toEqual(["en", "zh-Hans", "ja", "ko", "fr"]);
    expect(canonicalizeContentLanguage("zh")).toBe("zh-Hans");
    expect(canonicalizeContentLanguage("zh-CN")).toBe("zh-Hans");
    expect(canonicalizeContentLanguage("zh-TW")).toBe("zh-Hant");
    expect(canonicalizeContentLanguage("pt-br")).toBe("pt-BR");
    expect(canonicalizeContentLanguage("es-419")).toBe("es-419");
    expect(canonicalizeContentLanguage("mixed")).toBe("mixed");
    expect(canonicalizeContentLanguage("und")).toBe("und");
    expect(canonicalizeContentLanguage("invalid tag!")).toBeNull();
    expect(parseTermLanguage("pt-BR")).toBe("pt-BR");
  });

  it("validates SC language policies and rejects invalid tags or >5 target languages", () => {
    const ok = parseScLanguagePolicy({
      sourceLanguages: ["zh-CN", "pt-br"],
      targetLanguages: ["en", "zh-TW", "ja", "ko", "fr"],
    });
    expect(ok).toEqual({
      sourceLanguages: ["zh-Hans", "pt-BR"],
      targetLanguages: ["en", "zh-Hant", "ja", "ko", "fr"],
    });
    expect(
      parseScLanguagePolicy({
        sourceLanguages: ["en"],
        targetLanguages: ["en", "zh-Hans", "ja", "ko", "fr", "es"],
      }),
    ).toBeNull();
    expect(parseScLanguagePolicy({ sourceLanguages: ["en"], targetLanguages: ["und"] })).toBeNull();
  });

  it("validates VoxWardScBatchV2 while leaving v1 schema untouched", () => {
    const v1 = validateScBatchResult({
      items: [
        {
          itemId: "i1",
          verdict: "ALLOW_MEANINGFUL",
          reasonCodes: ["NONE"],
          translatedText: "hello",
          slangNote: "",
          replyCue: "",
        },
      ],
    });
    expect(v1.ok).toBe(true);

    const v2 = validateScMultilingualBatchResult({
      items: [
        {
          itemId: "i1",
          verdict: "ALLOW_MEANINGFUL",
          reasonCodes: ["NONE"],
          sourceLanguage: "ja",
          translations: [
            { language: "zh-TW", translatedText: "你好", slangNote: "", replyCue: "" },
            { language: "pt-br", translatedText: "olá", slangNote: "", replyCue: "" },
          ],
        },
      ],
    });
    expect(v2.ok).toBe(true);
    if (v2.ok) {
      expect(v2.schema).toEqual(SC_MULTILINGUAL_BATCH_SCHEMA);
      expect(v2.value.items[0]?.translations.map((t) => t.language)).toEqual(["zh-Hant", "pt-BR"]);
    }
  });
});
