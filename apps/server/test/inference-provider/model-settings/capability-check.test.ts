import { describe, expect, it } from "vitest";
import { describeKiroCli } from "../../../src/adapters/kiro-cli/capabilities.js";
import {
  checkRunnable,
  checkSelection,
  checkSettings,
  DEFAULT_MODEL_SETTINGS,
  type ModelSettings,
} from "../../../src/modules/inference-provider/index.js";
import { REPORT_AFTER_CHANGE, REPORT_WITH_MODELS, REPORT_WITHOUT_MODELS } from "./fixtures.js";

const A = "synthetic-model-a";
const B = "synthetic-model-b";

describe("checking a chosen model against the adapter's report", () => {
  it("accepts a model and a level that the report lists", () => {
    expect(checkSelection({ modelId: A, reasoning: "high" }, "/review", REPORT_WITH_MODELS)).toEqual([]);
  });

  it("accepts a model without a reasoning parameter when the report lists none for it", () => {
    expect(checkSelection({ modelId: B, reasoning: null }, "/review", REPORT_WITH_MODELS)).toEqual([]);
  });

  it("refuses a model the report does not list, and does not echo its id", () => {
    const issues = checkSelection({ modelId: "synthetic-model-z", reasoning: null }, "/scTranslation", REPORT_WITH_MODELS);

    expect(issues).toEqual([{ code: "MODEL_NOT_SUPPORTED", path: "/scTranslation/modelId" }]);
    expect(JSON.stringify(issues)).not.toContain("synthetic-model-z");
  });

  it("requires a level when the model lists levels", () => {
    expect(checkSelection({ modelId: A, reasoning: null }, "/review", REPORT_WITH_MODELS)).toEqual([
      { code: "REASONING_REQUIRED", path: "/review/reasoning" },
    ]);
  });

  it("refuses a level the model does not list, and a level for a model with none", () => {
    expect(checkSelection({ modelId: A, reasoning: "medium" }, "/review", REPORT_WITH_MODELS)).toEqual([
      { code: "REASONING_NOT_SUPPORTED", path: "/review/reasoning" },
    ]);
    expect(checkSelection({ modelId: B, reasoning: "low" }, "/review", REPORT_WITH_MODELS)).toEqual([
      { code: "REASONING_NOT_SUPPORTED", path: "/review/reasoning" },
    ]);
  });

  it("reports that no choice exists when the adapter reports no models", () => {
    expect(checkSelection({ modelId: A, reasoning: null }, "/review", REPORT_WITHOUT_MODELS)).toEqual([
      { code: "CAPABILITY_NOT_REPORTED", path: "/review" },
    ]);
  });

  it("finds the real Kiro CLI adapter reporting no models, so no choice can be made against it yet", () => {
    expect(describeKiroCli().models).toBeUndefined();
    expect(checkSelection({ modelId: A, reasoning: null }, "/review", describeKiroCli())).toEqual([
      { code: "CAPABILITY_NOT_REPORTED", path: "/review" },
    ]);
  });
});

describe("checking whole settings", () => {
  const settings: ModelSettings = {
    realtimeModeration: { modelId: A, reasoning: "low" },
    scTranslation: null,
    review: { modelId: "synthetic-model-z", reasoning: null },
    scTranslationEnabled: true,
  };

  it("checks only the selections that are set, in task order", () => {
    expect(checkSettings(settings, REPORT_WITH_MODELS)).toEqual([
      { code: "MODEL_NOT_SUPPORTED", path: "/review/modelId" },
    ]);
  });

  it("reports nothing for empty settings", () => {
    expect(checkSettings(DEFAULT_MODEL_SETTINGS, REPORT_WITHOUT_MODELS)).toEqual([]);
  });
});

describe("the run gate", () => {
  it("refuses a task with no selection, rather than picking a model for it", () => {
    expect(checkRunnable("scTranslation", DEFAULT_MODEL_SETTINGS, REPORT_WITH_MODELS)).toEqual([
      { code: "SELECTION_NOT_CONFIGURED", path: "/scTranslation" },
    ]);
  });

  it("lets a task run with the model it was given, when the report still supports it", () => {
    const settings = { ...DEFAULT_MODEL_SETTINGS, realtimeModeration: { modelId: A, reasoning: "high" } };

    expect(checkRunnable("realtimeModeration", settings, REPORT_WITH_MODELS)).toEqual([]);
  });

  it("refuses a saved selection that the changed report no longer supports, and does not swap it for another model", () => {
    const settings = { ...DEFAULT_MODEL_SETTINGS, realtimeModeration: { modelId: A, reasoning: "low" } };
    const before = JSON.stringify(settings);

    const issues = checkRunnable("realtimeModeration", settings, REPORT_AFTER_CHANGE);

    expect(issues).toEqual([{ code: "MODEL_NOT_SUPPORTED", path: "/realtimeModeration/modelId" }]);
    expect(JSON.stringify(settings)).toBe(before);
  });
});
