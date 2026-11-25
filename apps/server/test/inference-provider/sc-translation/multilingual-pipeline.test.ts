import { CONTRACT_VERSION, type InferenceCapabilities, type InferenceProvider } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createModerationChecker } from "../../../src/modules/moderation-engine/index.js";
import {
  parseScTranslationEvidence,
} from "../../../src/db/sc-translation-payload.js";
import {
  runScBatch,
  serializeScTranslationEvidence,
  type ScModelPort,
} from "../../../src/modules/inference-provider/index.js";

describe("multilingual SC pipeline & compact v2 storage", () => {
  const selection = { modelId: "m-sc", reasoning: null };
  const caps: InferenceCapabilities = {
    contractVersion: CONTRACT_VERSION,
    providerName: "test-sc",
    supportsCancel: false,
    models: [{ modelId: "m-sc", reasoningLevels: [] }],
  };
  const unusedSafety: InferenceProvider = {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,
    describe: () => caps,
    infer: () => Promise.reject(new Error("unused")),
    cancel: () => Promise.reject(new Error("unused")),
    releaseSession: () => Promise.reject(new Error("unused")),
  };

  it("drops only rejected target-language translations while preserving requested order and compact v2 JSON", async () => {
    const mod = createModerationChecker({
      ruleSet: {
        version: "v1",
        groups: [
          { id: "g-ja", action: { kind: "BLOCK" }, rules: [{ id: "r-ja", kind: "exact", text: "危険語", language: "ja" }] },
        ],
      },
      nicknames: { displayNicknameOf: async () => "Viewer" },
    });

    const scModel: ScModelPort = {
      describe: () => caps,
      async infer(input) {
        return {
          items: input.items.map((item) => ({
            itemId: item.itemId,
            verdict: "ALLOW_MEANINGFUL",
            reasonCodes: ["NONE"],
            sourceLanguage: "en",
            translations: [
              { language: "pt-BR", translatedText: "olá amigo", slangNote: "", replyCue: "" },
              { language: "ja", translatedText: "これは危険語です", slangNote: "", replyCue: "" },
              { language: "zh-CN", translatedText: "你好朋友", slangNote: "", replyCue: "" },
            ],
          })),
        };
      },
    };

    let seq = 0;
    const outcome = await runScBatch(
      {
        contractVersion: CONTRACT_VERSION,
        batchId: "b-multi-1",
        items: [{ correlationId: "corr-1", text: "hello friend" }],
      },
      { translationEnabled: true, selection, targetLanguages: ["zh-Hans", "ja", "pt-BR"] },
      {
        safety: unusedSafety,
        scModel,
        generatedText: {
          async check(text, language) {
            const v = await mod.check(
              {
                contractVersion: CONTRACT_VERSION,
                platform: "synthetic",
                channelId: "ch-1",
                platformMessageId: "pm",
                platformOrder: 1,
                receivedAt: "2026-11-25T00:00:00.000Z",
                correlationId: "gen",
                body: text,
                sender: { contractVersion: CONTRACT_VERSION, senderRef: "gen" },
              },
              language === undefined ? undefined : { language },
            );
            return v.route === "PASS" ? "CLEAN" : "REJECTED";
          },
        },
        addressFor: async () => ({ display: "Viewer", reading: null }),
        newItemId: () => `item-${++seq}`,
        maxItems: 10,
      },
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const cue = outcome.items[0]?.cue;
    expect(cue).not.toBeNull();
    expect(cue?.translations?.map((t) => t.language)).toEqual(["zh-Hans", "pt-BR"]);

    const serialized = serializeScTranslationEvidence(cue!);
    const parsedRaw = JSON.parse(serialized) as Record<string, unknown>;
    expect(parsedRaw.translation).toBeUndefined();
    const readBack = parseScTranslationEvidence(serialized);
    expect(readBack.primaryTranslation).toBe("你好朋友");
    expect(readBack.translations).toHaveLength(2);
  });
});
