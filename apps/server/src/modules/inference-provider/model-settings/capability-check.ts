import type { InferenceCapabilities } from "@voxward/contracts";
import { TASK_KINDS, type ModelSelection, type ModelSettings, type SettingsIssue, type TaskKind } from "./settings.js";

/**
 * Checks one chosen model against what the adapter reports. The check only reports. It never replaces the model or the
 * level with another one, so a choice that stops being supported stays visible as a problem (proposal line 359).
 */
export function checkSelection(
  selection: ModelSelection,
  path: string,
  capabilities: InferenceCapabilities,
): SettingsIssue[] {
  const models = capabilities.models ?? [];
  if (models.length === 0) return [{ code: "CAPABILITY_NOT_REPORTED", path }];

  const model = models.find((candidate) => candidate.modelId === selection.modelId);
  if (model === undefined) return [{ code: "MODEL_NOT_SUPPORTED", path: `${path}/modelId` }];

  const levels = model.reasoningLevels;
  if (levels.length === 0) {
    return selection.reasoning === null ? [] : [{ code: "REASONING_NOT_SUPPORTED", path: `${path}/reasoning` }];
  }
  if (selection.reasoning === null) return [{ code: "REASONING_REQUIRED", path: `${path}/reasoning` }];
  return levels.includes(selection.reasoning) ? [] : [{ code: "REASONING_NOT_SUPPORTED", path: `${path}/reasoning` }];
}

/** Checks every selection that is set. A task with no selection has nothing to check here. */
export function checkSettings(settings: ModelSettings, capabilities: InferenceCapabilities): SettingsIssue[] {
  return TASK_KINDS.flatMap((task) => {
    const selection = settings[task];
    return selection === null ? [] : checkSelection(selection, `/${task}`, capabilities);
  });
}

/**
 * The gate in front of a run. A task without a selection is refused, and so is a selection the current report no longer
 * supports. An empty result means the task may run with exactly the model it was given.
 */
export function checkRunnable(
  task: TaskKind,
  settings: ModelSettings,
  capabilities: InferenceCapabilities,
): SettingsIssue[] {
  const selection = settings[task];
  if (selection === null) return [{ code: "SELECTION_NOT_CONFIGURED", path: `/${task}` }];
  return checkSelection(selection, `/${task}`, capabilities);
}
