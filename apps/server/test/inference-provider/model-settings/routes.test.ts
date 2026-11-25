import { describe, expect, it } from "vitest";
import { describeKiroCli } from "../../../src/adapters/kiro-cli/capabilities.js";
import {
  createInMemoryModelSettingsStore,
  DEFAULT_MODEL_SETTINGS,
  readModelSettings,
  writeModelSettings,
} from "../../../src/modules/inference-provider/index.js";
import { REPORT_AFTER_CHANGE, REPORT_WITH_MODELS, VALID_BODY } from "./fixtures.js";

const withBody = (overrides: Record<string, unknown>) => ({ ...VALID_BODY, ...overrides });

describe("reading the settings", () => {
  it("returns the defaults with no problems before anything is chosen", async () => {
    const deps = { store: createInMemoryModelSettingsStore(), describe: () => REPORT_WITH_MODELS };

    expect(await readModelSettings(deps)).toEqual({
      status: 200,
      body: { settings: DEFAULT_MODEL_SETTINGS, issues: [] },
    });
  });

  it("lists a saved selection the changed report no longer supports, and keeps showing it as chosen", async () => {
    const store = createInMemoryModelSettingsStore();
    await writeModelSettings({ store, describe: () => REPORT_WITH_MODELS }, VALID_BODY);

    const response = await readModelSettings({ store, describe: () => REPORT_AFTER_CHANGE });

    expect(response.status).toBe(200);
    expect(response.body.issues).toEqual([{ code: "MODEL_NOT_SUPPORTED", path: "/realtimeModeration/modelId" }]);
    expect(response.body.settings.realtimeModeration).toEqual({ modelId: "synthetic-model-a", reasoning: "low" });
  });
});

describe("writing the settings", () => {
  it("round-trips the language policy and does not overwrite it with invalid duplicate targets", async () => {
    const store = createInMemoryModelSettingsStore();
    const deps = { store, describe: () => REPORT_WITH_MODELS };
    const response = await writeModelSettings(deps, withBody({
      scLanguages: { sourceLanguage: "auto", targetLanguages: ["FR", "ja"] },
    }));
    expect(response).toMatchObject({ status: 200 });
    for (const scLanguages of [
      { sourceLanguage: "zh-Hant", targetLanguages: ["en"] },
      { sourceLanguage: "en", targetLanguages: ["zh-TW"] },
      { sourceLanguage: "en", targetLanguages: ["fr-CA"] },
      { sourceLanguage: "und", targetLanguages: ["en"] },
      { sourceLanguage: "auto", targetLanguages: ["und"] },
    ]) {
      expect(await writeModelSettings(deps, withBody({ scLanguages }))).toMatchObject({ status: 400 });
    }
    expect(await writeModelSettings(deps, withBody({
      scLanguages: { sourceLanguage: "auto", targetLanguages: ["fr", "FR"] },
    }))).toEqual({ status: 400, body: { error: "SETTINGS_INVALID", issues: [{ code: "VALUE_INVALID", path: "/scLanguages" }] } });
    expect((await readModelSettings(deps)).body.settings.scLanguages).toEqual({
      sourceLanguage: "auto", targetLanguages: ["fr", "ja"],
    });
  });

  it("stores a valid body and returns it with no problems", async () => {
    const store = createInMemoryModelSettingsStore();

    const response = await writeModelSettings({ store, describe: () => REPORT_WITH_MODELS }, VALID_BODY);

    expect(response).toMatchObject({ status: 200, body: { issues: [] } });
    expect(await store.read()).toEqual({
      realtimeModeration: { modelId: "synthetic-model-a", reasoning: "low" },
      scTranslation: { modelId: "synthetic-model-b", reasoning: null },
      review: null,
      scTranslationEnabled: true,
    });
  });

  it("switches a task to another reported model and level", async () => {
    const store = createInMemoryModelSettingsStore();
    const deps = { store, describe: () => REPORT_WITH_MODELS };
    await writeModelSettings(deps, VALID_BODY);

    const switched = withBody({ scTranslation: { modelId: "synthetic-model-a", reasoning: "high" } });
    expect((await writeModelSettings(deps, switched)).status).toBe(200);
    expect((await store.read()).scTranslation).toEqual({ modelId: "synthetic-model-a", reasoning: "high" });
  });

  it("refuses a model the report does not list, and leaves the saved settings unchanged", async () => {
    const store = createInMemoryModelSettingsStore();
    const deps = { store, describe: () => REPORT_WITH_MODELS };
    await writeModelSettings(deps, VALID_BODY);
    const saved = await store.read();

    const response = await writeModelSettings(deps, withBody({ review: { modelId: "synthetic-model-z", reasoning: null } }));

    expect(response).toEqual({
      status: 422,
      body: { error: "SELECTION_REFUSED", issues: [{ code: "MODEL_NOT_SUPPORTED", path: "/review/modelId" }] },
    });
    expect(await store.read()).toEqual(saved);
  });

  it("refuses an unsupported level with the path of the level", async () => {
    const store = createInMemoryModelSettingsStore();

    const response = await writeModelSettings(
      { store, describe: () => REPORT_WITH_MODELS },
      withBody({ realtimeModeration: { modelId: "synthetic-model-a", reasoning: "extreme" } }),
    );

    expect(response).toMatchObject({
      status: 422,
      body: { issues: [{ code: "REASONING_NOT_SUPPORTED", path: "/realtimeModeration/reasoning" }] },
    });
    expect(await store.read()).toEqual(DEFAULT_MODEL_SETTINGS);
  });

  it("refuses every model with an explicit problem when the adapter reports none, and never writes a default", async () => {
    const store = createInMemoryModelSettingsStore();
    const deps = { store, describe: describeKiroCli };

    const response = await writeModelSettings(deps, withBody({ realtimeModeration: { modelId: "synthetic-model-a", reasoning: null } }));

    expect(response).toMatchObject({
      status: 422,
      body: {
        issues: [
          { code: "CAPABILITY_NOT_REPORTED", path: "/realtimeModeration" },
          { code: "CAPABILITY_NOT_REPORTED", path: "/scTranslation" },
        ],
      },
    });
    expect(await store.read()).toEqual(DEFAULT_MODEL_SETTINGS);
  });

  it("still accepts clearing every selection against the real adapter, because nothing is chosen", async () => {
    const store = createInMemoryModelSettingsStore();

    const response = await writeModelSettings(
      { store, describe: describeKiroCli },
      { realtimeModeration: null, scTranslation: null, review: null, scTranslationEnabled: false },
    );

    expect(response).toMatchObject({ status: 200, body: { issues: [] } });
  });

  it("refuses a malformed body with 400 and writes nothing", async () => {
    const store = createInMemoryModelSettingsStore();
    const deps = { store, describe: () => REPORT_WITH_MODELS };

    const response = await writeModelSettings(deps, { realtimeModeration: null });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: "SETTINGS_INVALID" });
    expect(await store.read()).toEqual(DEFAULT_MODEL_SETTINGS);
  });
});
