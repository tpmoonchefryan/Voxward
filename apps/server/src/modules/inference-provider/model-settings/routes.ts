import type { InferenceCapabilities } from "@voxward/contracts";
import { checkSettings } from "./capability-check.js";
import { type ModelSettings, type ModelSettingsStore, parseModelSettings, type SettingsIssue } from "./settings.js";

/** The handler inputs: where settings are kept, and the adapter's current capability report (its `describe()`). */
export interface ModelSettingsRouteDeps {
  readonly store: ModelSettingsStore;
  readonly describe: () => InferenceCapabilities;
}

/**
 * Framework-free results. The HTTP layer maps `status` and `body` to a response. Registering the routes is outside this
 * package (STORY-010 G3).
 */
export type ReadModelSettingsResponse = {
  readonly status: 200;
  readonly body: { readonly settings: ModelSettings; readonly issues: readonly SettingsIssue[] };
};

export type WriteModelSettingsResponse =
  | { readonly status: 200; readonly body: { readonly settings: ModelSettings; readonly issues: readonly SettingsIssue[] } }
  | { readonly status: 400; readonly body: { readonly error: "SETTINGS_INVALID"; readonly issues: readonly SettingsIssue[] } }
  | { readonly status: 422; readonly body: { readonly error: "SELECTION_REFUSED"; readonly issues: readonly SettingsIssue[] } };

/**
 * Reads the saved settings. Each saved selection is checked against the current report, so a selection the adapter no
 * longer supports is listed as a problem instead of being hidden.
 */
export async function readModelSettings(deps: ModelSettingsRouteDeps): Promise<ReadModelSettingsResponse> {
  const settings = await deps.store.read();
  return { status: 200, body: { settings, issues: checkSettings(settings, deps.describe()) } };
}

/**
 * Replaces all settings. A malformed body is refused with 400. A selection the current report does not support is refused
 * with 422. In both cases nothing is written, so the saved settings stay as they were.
 */
export async function writeModelSettings(deps: ModelSettingsRouteDeps, body: unknown): Promise<WriteModelSettingsResponse> {
  const parsed = parseModelSettings(body);
  if (!parsed.ok) return { status: 400, body: { error: "SETTINGS_INVALID", issues: parsed.issues } };

  const issues = checkSettings(parsed.settings, deps.describe());
  if (issues.length > 0) return { status: 422, body: { error: "SELECTION_REFUSED", issues } };

  await deps.store.write(parsed.settings);
  return { status: 200, body: { settings: parsed.settings, issues: [] } };
}
