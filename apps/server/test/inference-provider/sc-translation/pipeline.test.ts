import { describe, expect, it } from "vitest";
import { runScBatch, scRunChoicesFromSettings, type ScRunOutcome } from "../../../src/modules/inference-provider/index.js";
import { REPORT_AFTER_CHANGE } from "../model-settings/fixtures.js";
import {
  depsWith,
  requestOf,
  SC_SELECTION,
  scOutput,
  standInScModel,
  TRANSLATIONS,
  UNUSED_SAFETY,
} from "./fixtures.js";

const SAMPLES = [
  { correlationId: "c-zh", text: "谢谢大家的支持" },
  { correlationId: "c-ja", text: "ありがとうございます" },
  { correlationId: "c-en", text: "thanks a lot" },
  { correlationId: "c-mix", text: "今日は良い日ですね" },
];

const ON = { translationEnabled: true, selection: SC_SELECTION };

function okItems(outcome: ScRunOutcome) {
  if (!outcome.ok) throw new Error(`expected an ok run, got ${outcome.reason}`);
  return outcome.items;
}

describe("cue sheet entries with translation on", () => {
  it("requests automatic source detection and selects the primary translation by configured order", async () => {
    const model = standInScModel(({ items }) => ({
      items: items.map(({ itemId }) => ({
        itemId, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], sourceLanguage: "ko",
        translations: [
          { targetLanguage: "ja", translatedText: "ありがとう", slangNote: "", replyCue: "" },
          { targetLanguage: "fr", translatedText: "Merci", slangNote: "", replyCue: "", thankYouReading: "mehr-see" },
        ],
      })),
    }));
    const languages = { sourceLanguage: "auto", targetLanguages: ["fr", "ja"] };
    const choices = scRunChoicesFromSettings({
      realtimeModeration: null, review: null, scTranslationEnabled: true, scTranslation: SC_SELECTION, scLanguages: languages,
    });
    const items = okItems(await runScBatch(requestOf("b-lang", [{ correlationId: "c-ko", text: "감사합니다" }]), choices, depsWith({ scModel: model })));
    expect(model.received).toEqual([{ batchId: "b-lang", selection: SC_SELECTION, languages }]);
    expect(items[0]?.cue).toMatchObject({
      original: { language: "ko" },
      generated: {
        translatedText: "Merci", thankYouReading: "mehr-see",
        translations: [{ targetLanguage: "fr" }, { targetLanguage: "ja" }],
      },
    });
    const mismatched = await runScBatch(
      requestOf("b-lang2", [{ correlationId: "c-ko", text: "감사합니다" }]),
      { ...ON, languages: { ...languages, sourceLanguage: "en" } },
      depsWith({ scModel: model }),
    );
    expect(mismatched).toMatchObject({ ok: false, errorCodes: ["SC_LANGUAGE_MISMATCH"] });
  });

  it("gives every cross-language sample an entry with the viewer's words and the generated text kept apart", async () => {
    const outcome = await runScBatch(requestOf("b-1", SAMPLES), ON, depsWith());
    const items = okItems(outcome);

    expect(items.map((item) => item.correlationId)).toEqual(["c-zh", "c-ja", "c-en", "c-mix"]);
    for (const item of items) {
      expect(item.withheld).toBeNull();
      expect(item.cue).not.toBeNull();
    }
    const zh = items[0]?.cue;
    expect(zh).toEqual({
      correlationId: "c-zh",
      original: { origin: "VIEWER_ORIGINAL", text: "谢谢大家的支持" },
      generated: {
        origin: "AI_GENERATED",
        translatedText: TRANSLATIONS["谢谢大家的支持"],
        slangNote: "synthetic slang note",
        replyCue: "synthetic reply cue",
        thankYouReading: null,
      },
      address: { display: "synthetic-address", reading: null },
    });
  });

  it("keeps a thank-you reading when the model gave one, and leaves it null when it did not", async () => {
    const model = standInScModel((input) => scOutput(input, (text) => (text === "thanks a lot" ? { thankYouReading: "san kyu" } : {})));
    const items = okItems(await runScBatch(requestOf("b-2", SAMPLES), ON, depsWith({ scModel: model })));

    expect(items.find((item) => item.correlationId === "c-en")?.cue?.generated.thankYouReading).toBe("san kyu");
    expect(items.find((item) => item.correlationId === "c-zh")?.cue?.generated.thankYouReading).toBeNull();
  });

  it("never gives a BLOCK item a cue, even when the model returned a translation for it", async () => {
    const batch = [{ correlationId: "c-block", text: "this has badword in it" }];
    const model = standInScModel((input) =>
      scOutput(input, () => ({ verdict: "BLOCK", translatedText: "visible translation", reasonCodes: ["HARASSMENT"] })),
    );
    const items = okItems(await runScBatch(requestOf("b-3", batch), ON, depsWith({ scModel: model })));

    expect(items).toEqual([
      { correlationId: "c-block", classification: "BLOCK", reasonCodes: ["HARASSMENT"], cue: null, withheld: "VERDICT_BLOCK" },
    ]);
  });

  it("withholds only the cue of an item whose translation a rule hit, and keeps the batch and the other cues (Q23)", async () => {
    const model = standInScModel((input) => scOutput(input, (text) => (text === "thanks a lot" ? { translatedText: "a badword here" } : {})));
    const outcome = await runScBatch(requestOf("b-4", SAMPLES), ON, depsWith({ scModel: model }));
    const items = okItems(outcome);

    expect(items.find((item) => item.correlationId === "c-en")).toMatchObject({ cue: null, withheld: "GENERATED_TEXT_REJECTED" });
    expect(items.filter((item) => item.cue !== null).map((item) => item.correlationId)).toEqual(["c-zh", "c-ja", "c-mix"]);
  });

  it("withholds a cue whose translation came back empty", async () => {
    const model = standInScModel((input) => scOutput(input, (text) => (text === "thanks a lot" ? { translatedText: "" } : {})));
    const items = okItems(await runScBatch(requestOf("b-5", SAMPLES), ON, depsWith({ scModel: model })));

    expect(items.find((item) => item.correlationId === "c-en")).toMatchObject({ cue: null, withheld: "NO_TRANSLATION" });
  });

  it("gives a noise item a cue on the same path as a meaningful one, because both are allowed (proposal line 112)", async () => {
    const model = standInScModel((input) => scOutput(input, () => ({ verdict: "ALLOW_NOISE", reasonCodes: ["NOISE"] })));
    const items = okItems(await runScBatch(requestOf("b-6", [SAMPLES[0]!]), ON, depsWith({ scModel: model })));

    expect(items[0]).toMatchObject({ classification: "ALLOW_NOISE", withheld: null });
    expect(items[0]?.cue).not.toBeNull();
  });

  it("fails the whole batch, with codes only and no cue, when the model output misses an item", async () => {
    const model = standInScModel((input) => {
      const output = scOutput(input) as { items: unknown[] };
      return { items: output.items.slice(1) };
    });
    const outcome = await runScBatch(requestOf("b-7", SAMPLES), ON, depsWith({ scModel: model }));

    expect(outcome).toEqual({ ok: false, batchId: "b-7", reason: "BATCH_REJECTED", errorCodes: ["ITEM_RESULT_MISSING"] });
  });

  it("fails the batch when the rule engine is not bound, because the generated text cannot be verified (fail closed)", async () => {
    const outcome = await runScBatch(requestOf("b-8", SAMPLES), ON, depsWith({ generatedText: undefined }));

    expect(outcome.ok).toBe(false);
    if (outcome.ok || outcome.reason !== "BATCH_REJECTED") return;
    expect(outcome.errorCodes.length).toBeGreaterThan(0);
    expect(outcome.errorCodes.every((code) => code === "GENERATED_TEXT_UNVERIFIED")).toBe(true);
  });

  it("withholds the cue when the local address has no showable display", async () => {
    const items = okItems(
      await runScBatch(requestOf("b-9", [SAMPLES[0]!]), ON, depsWith({ addressFor: async () => ({ display: "  ", reading: null }) })),
    );

    expect(items[0]).toMatchObject({ cue: null, withheld: "ADDRESS_UNAVAILABLE" });
  });

  it("drops an unreliable reading and still shows the cue", async () => {
    const items = okItems(
      await runScBatch(
        requestOf("b-10", [SAMPLES[0]!]),
        ON,
        depsWith({ addressFor: async () => ({ display: "synthetic-address", reading: "x".repeat(41) }) }),
      ),
    );

    expect(items[0]?.cue?.address).toEqual({ display: "synthetic-address", reading: null });
  });

  it("asks the local address flow only about items that may show a cue", async () => {
    const asked: string[] = [];
    const batch = [SAMPLES[0]!, { correlationId: "c-block", text: "badword" }];
    await runScBatch(
      requestOf("b-11", batch),
      ON,
      depsWith({
        addressFor: async (correlationId) => {
          asked.push(correlationId);
          return { display: "synthetic-address", reading: null };
        },
      }),
    );

    expect(asked).toEqual(["c-zh"]);
  });
});

describe("what leaves the pipeline with translation on", () => {
  it("sends the model only a temporary item id and the text, never the address or a viewer identifier", async () => {
    const model = standInScModel((input) => scOutput(input));
    const alias = "synthetic-alias-7f3a";
    await runScBatch(
      requestOf("b-12", SAMPLES),
      ON,
      depsWith({ scModel: model, addressFor: async () => ({ display: alias, reading: "synthetic reading" }) }),
    );

    const [sent] = model.sent;
    expect(sent?.items.every((item) => Object.keys(item).sort().join(",") === "itemId,text")).toBe(true);
    expect(JSON.stringify(model.sent)).not.toContain(alias);
    expect(JSON.stringify(model.sent)).not.toContain("synthetic reading");
    expect(JSON.stringify(model.sent)).not.toContain("c-zh");
  });
});

describe("runs refused before any model is called", () => {
  it("refuses a run with no SC selection, and sends nothing to any model", async () => {
    const model = standInScModel((input) => scOutput(input));
    const outcome = await runScBatch(requestOf("b-13", SAMPLES), { translationEnabled: true, selection: null }, depsWith({ scModel: model }));

    expect(outcome).toEqual({
      ok: false,
      batchId: "b-13",
      reason: "SELECTION_REFUSED",
      issues: [{ code: "SELECTION_NOT_CONFIGURED", path: "/scTranslation" }],
    });
    expect(model.sent).toEqual([]);
  });

  it("refuses an SC selection its SC model port no longer reports, and does not swap it for another model", async () => {
    const model = standInScModel((input) => scOutput(input), REPORT_AFTER_CHANGE);
    const outcome = await runScBatch(requestOf("b-14", SAMPLES), ON, depsWith({ scModel: model }));

    expect(outcome).toMatchObject({
      ok: false,
      reason: "SELECTION_REFUSED",
      issues: [{ code: "MODEL_NOT_SUPPORTED", path: "/scTranslation/modelId" }],
    });
    expect(model.sent).toEqual([]);
  });

  it("refuses a request whose correlation ids repeat, before the model call", async () => {
    const model = standInScModel((input) => scOutput(input));
    const repeated = [SAMPLES[0]!, { correlationId: "c-zh", text: "second" }];

    expect(await runScBatch(requestOf("b-15", repeated), ON, depsWith({ scModel: model }))).toEqual({
      ok: false,
      batchId: "b-15",
      reason: "BATCH_REJECTED",
      errorCodes: ["REQUEST_INVALID"],
    });
    expect(model.sent).toEqual([]);
  });

  it("refuses an empty batch and a batch above the limit before the model call", async () => {
    const model = standInScModel((input) => scOutput(input));

    expect(await runScBatch(requestOf("b-18", []), ON, depsWith({ scModel: model }))).toEqual({
      ok: false,
      batchId: "b-18",
      reason: "BATCH_REJECTED",
      errorCodes: ["BATCH_EMPTY"],
    });
    expect(await runScBatch(requestOf("b-19", SAMPLES), ON, depsWith({ scModel: model, maxItems: 3 }))).toEqual({
      ok: false,
      batchId: "b-19",
      reason: "BATCH_REJECTED",
      errorCodes: ["BATCH_TOO_LARGE"],
    });
    expect(model.sent).toEqual([]);
  });

  it("refuses a batch whose generated item ids repeat, before the model call", async () => {
    const model = standInScModel((input) => scOutput(input));

    expect(
      await runScBatch(requestOf("b-16", SAMPLES), ON, depsWith({ scModel: model, newItemId: () => "same-id" })),
    ).toEqual({ ok: false, batchId: "b-16", reason: "BATCH_REJECTED", errorCodes: ["INPUT_ITEM_ID_DUPLICATE"] });
    expect(model.sent).toEqual([]);
  });

  it("never calls the safety port on the translation path", async () => {
    const outcome = await runScBatch(requestOf("b-17", SAMPLES), ON, depsWith({ safety: UNUSED_SAFETY }));

    expect(outcome.ok).toBe(true);
  });
});
