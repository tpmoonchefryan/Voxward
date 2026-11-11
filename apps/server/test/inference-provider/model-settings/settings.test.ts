import { describe, expect, it } from "vitest";
import {
  createInMemoryModelSettingsStore,
  DEFAULT_MODEL_SETTINGS,
  parseModelSettings,
} from "../../../src/modules/inference-provider/index.js";
import { VALID_BODY } from "./fixtures.js";

describe("model settings body", () => {
  it("accepts a complete body and returns the settings it names", () => {
    const parsed = parseModelSettings(VALID_BODY);

    expect(parsed).toEqual({
      ok: true,
      settings: {
        realtimeModeration: { modelId: "synthetic-model-a", reasoning: "low" },
        scTranslation: { modelId: "synthetic-model-b", reasoning: null },
        review: null,
        scTranslationEnabled: true,
      },
    });
  });

  it("starts with nothing chosen and translation off", () => {
    expect(DEFAULT_MODEL_SETTINGS).toEqual({
      realtimeModeration: null,
      scTranslation: null,
      review: null,
      scTranslationEnabled: false,
    });
  });

  it("refuses a body that is not an object", () => {
    expect(parseModelSettings([])).toEqual({ ok: false, issues: [{ code: "NOT_OBJECT", path: "" }] });
    expect(parseModelSettings("text")).toEqual({ ok: false, issues: [{ code: "NOT_OBJECT", path: "" }] });
  });

  it("requires every key, so a write cannot leave a task silently unset", () => {
    const { review: _review, ...withoutReview } = VALID_BODY;

    expect(parseModelSettings(withoutReview)).toEqual({
      ok: false,
      issues: [{ code: "REQUIRED_MISSING", path: "/review" }],
    });
  });

  it("refuses an unknown key at the top level and inside a selection", () => {
    expect(parseModelSettings({ ...VALID_BODY, extraFlag: true })).toEqual({
      ok: false,
      issues: [{ code: "FIELD_UNKNOWN", path: "" }],
    });
    const withExtra = { ...VALID_BODY, scTranslation: { modelId: "synthetic-model-b", reasoning: null, sendNames: true } };
    expect(parseModelSettings(withExtra)).toEqual({
      ok: false,
      issues: [{ code: "FIELD_UNKNOWN", path: "/scTranslation" }],
    });
  });

  it("refuses a model id that would read as a CLI flag", () => {
    const body = { ...VALID_BODY, realtimeModeration: { modelId: "--trust-all-tools", reasoning: null } };

    expect(parseModelSettings(body)).toEqual({
      ok: false,
      issues: [{ code: "VALUE_INVALID", path: "/realtimeModeration/modelId" }],
    });
  });

  it("refuses a value with spaces, shell characters, or more than 128 characters, and accepts exactly 128", () => {
    const shaped = (modelId: string) => parseModelSettings({ ...VALID_BODY, review: { modelId, reasoning: null } });

    expect(shaped("synthetic model")).toMatchObject({ ok: false, issues: [{ code: "VALUE_INVALID", path: "/review/modelId" }] });
    expect(shaped("synthetic;rm")).toMatchObject({ ok: false, issues: [{ code: "VALUE_INVALID", path: "/review/modelId" }] });
    expect(shaped("a".repeat(129))).toMatchObject({ ok: false, issues: [{ code: "VALUE_INVALID", path: "/review/modelId" }] });
    expect(shaped("a".repeat(128))).toMatchObject({ ok: true });
  });

  it("refuses a non-string model id and a non-boolean translation switch", () => {
    expect(parseModelSettings({ ...VALID_BODY, review: { modelId: 7, reasoning: null } })).toEqual({
      ok: false,
      issues: [{ code: "NOT_STRING", path: "/review/modelId" }],
    });
    expect(parseModelSettings({ ...VALID_BODY, scTranslationEnabled: "yes" })).toEqual({
      ok: false,
      issues: [{ code: "NOT_BOOLEAN", path: "/scTranslationEnabled" }],
    });
  });

  it("names the location of each problem and never echoes the value that caused it", () => {
    const secretLike = "--trust-all-tools";
    const result = parseModelSettings({ ...VALID_BODY, realtimeModeration: { modelId: secretLike, reasoning: null } });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secretLike);
  });
});

describe("in-memory settings store", () => {
  it("returns the defaults until something is written, then returns what was written", async () => {
    const store = createInMemoryModelSettingsStore();
    expect(await store.read()).toEqual(DEFAULT_MODEL_SETTINGS);

    const next = { ...DEFAULT_MODEL_SETTINGS, review: { modelId: "synthetic-model-a", reasoning: "high" } };
    await store.write(next);
    expect(await store.read()).toEqual(next);
  });
});
