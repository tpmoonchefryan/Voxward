import { normalizeStoredLanguage, parseScLanguagePolicy, type ScLanguagePolicy, type SupportedLanguage } from "@voxward/contracts";

/**
 * Model settings for the three AI tasks (proposal section 9.1). Nothing here picks a model. The user chooses one from what
 * the adapter reports, and a choice the adapter does not support is refused, never replaced by another model.
 */

/** The AI tasks that each have their own model: real-time moderation, paid text (Super Chat) and after-stream review. */
export const TASK_KINDS = ["realtimeModeration", "scTranslation", "review"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

/** A chosen model and its reasoning level. `reasoning` is null when the model takes no reasoning parameter. */
export interface ModelSelection {
  readonly modelId: string;
  readonly reasoning: string | null;
}

/** All model settings. A task whose selection is null has no model and cannot run. */
export interface ModelSettings {
  readonly realtimeModeration: ModelSelection | null;
  readonly scTranslation: ModelSelection | null;
  readonly review: ModelSelection | null;
  /** Paid translation (精翻) switch. Turning it off does not stop the safety review of paid text (proposal line 37). */
  readonly scTranslationEnabled: boolean;
  readonly scLanguages?: ScLanguagePolicy;
}

/** Nothing chosen and translation off. The module never supplies a model of its own (自定). */
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  realtimeModeration: null,
  scTranslation: null,
  review: null,
  scTranslationEnabled: false,
};

/**
 * Shape of a model id or reasoning value (自定): 1 to 128 characters of letters, digits and `. _ : / -`. The first character
 * may not be `-`, so a value can never read as a CLI flag. The same rule applies in the adapter's command builder.
 */
export const SETTING_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;

const SETTINGS_KEYS = ["realtimeModeration", "scTranslation", "review", "scTranslationEnabled", "scLanguages"] as const;
const SELECTION_KEYS = ["modelId", "reasoning"] as const;

export type SettingsIssueCode =
  | "NOT_OBJECT"
  | "FIELD_UNKNOWN"
  | "REQUIRED_MISSING"
  | "NOT_STRING"
  | "NOT_BOOLEAN"
  | "VALUE_INVALID"
  | "SELECTION_NOT_CONFIGURED"
  | "CAPABILITY_NOT_REPORTED"
  | "MODEL_NOT_SUPPORTED"
  | "REASONING_REQUIRED"
  | "REASONING_NOT_SUPPORTED";

/** One problem, located by a JSON Pointer such as `/scTranslation/modelId`. The value that caused it is never included. */
export interface SettingsIssue {
  readonly code: SettingsIssueCode;
  readonly path: string;
}

export type ParsedModelSettings =
  | { readonly ok: true; readonly settings: ModelSettings }
  | { readonly ok: false; readonly issues: readonly SettingsIssue[] };

export function normalizeStoredScLanguages(settings: ModelSettings): ModelSettings {
  const { scLanguages, ...otherSettings } = settings;
  if (scLanguages === undefined) return settings;
  const targetLanguages = new Set<SupportedLanguage>();
  for (const value of scLanguages.targetLanguages) {
    const language = normalizeStoredLanguage(value);
    if (language !== "und") targetLanguages.add(language);
  }
  if (targetLanguages.size === 0) return otherSettings;
  const sourceLanguage = normalizeStoredLanguage(scLanguages.sourceLanguage);
  return {
    ...otherSettings,
    scLanguages: {
      sourceLanguage: sourceLanguage === "und" ? "auto" : sourceLanguage,
      targetLanguages: [...targetLanguages],
    },
  };
}

/**
 * Reads a replacement settings body. The translation language policy is optional for legacy callers and stored settings.
 * The result carries the issues found, and it never echoes an input value.
 */
export function parseModelSettings(value: unknown): ParsedModelSettings {
  if (!isRecord(value)) return { ok: false, issues: [{ code: "NOT_OBJECT", path: "" }] };
  const issues: SettingsIssue[] = [];
  checkKeys(value, SETTINGS_KEYS, "", issues);
  const realtimeModeration = readSelection(value, "realtimeModeration", issues);
  const scTranslation = readSelection(value, "scTranslation", issues);
  const review = readSelection(value, "review", issues);
  const scTranslationEnabled = readBoolean(value, "scTranslationEnabled", issues);
  const scLanguages = value.scLanguages === undefined ? undefined : parseScLanguagePolicy(value.scLanguages);
  if (scLanguages === null) issues.push({ code: "VALUE_INVALID", path: "/scLanguages" });
  if (issues.length > 0) return { ok: false, issues };
  if (
    realtimeModeration === undefined ||
    scTranslation === undefined ||
    review === undefined ||
    scTranslationEnabled === undefined
  ) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    settings: {
      realtimeModeration,
      scTranslation,
      review,
      scTranslationEnabled,
      ...(scLanguages == null ? {} : { scLanguages }),
    },
  };
}

/** Where the settings are kept between requests. A database table is bound later (STORY-010 G2). */
export interface ModelSettingsStore {
  read(): Promise<ModelSettings>;
  write(settings: ModelSettings): Promise<void>;
}

/** Keeps the settings in process memory. Used by tests and by any caller that has no database yet. */
export function createInMemoryModelSettingsStore(initial: ModelSettings = DEFAULT_MODEL_SETTINGS): ModelSettingsStore {
  let current = initial;
  return {
    read: async () => current,
    write: async (next) => {
      current = next;
    },
  };
}

function readSelection(
  record: Readonly<Record<string, unknown>>,
  key: TaskKind,
  issues: SettingsIssue[],
): ModelSelection | null | undefined {
  const path = `/${key}`;
  const value = record[key];
  if (value === undefined) {
    issues.push({ code: "REQUIRED_MISSING", path });
    return undefined;
  }
  if (value === null) return null;
  if (!isRecord(value)) {
    issues.push({ code: "NOT_OBJECT", path });
    return undefined;
  }
  checkKeys(value, SELECTION_KEYS, path, issues);
  const modelId = readValue(value, "modelId", path, issues);
  const reasoning = readNullableValue(value, "reasoning", path, issues);
  if (modelId === undefined || reasoning === undefined) return undefined;
  return { modelId, reasoning };
}

function readValue(
  record: Readonly<Record<string, unknown>>,
  key: string,
  parentPath: string,
  issues: SettingsIssue[],
): string | undefined {
  const path = `${parentPath}/${key}`;
  const value = record[key];
  if (value === undefined) {
    issues.push({ code: "REQUIRED_MISSING", path });
    return undefined;
  }
  if (typeof value !== "string") {
    issues.push({ code: "NOT_STRING", path });
    return undefined;
  }
  if (!SETTING_VALUE_PATTERN.test(value)) {
    issues.push({ code: "VALUE_INVALID", path });
    return undefined;
  }
  return value;
}

/** Like readValue, but null is a valid value for this key and means "none". */
function readNullableValue(
  record: Readonly<Record<string, unknown>>,
  key: string,
  parentPath: string,
  issues: SettingsIssue[],
): string | null | undefined {
  if (record[key] === null) return null;
  return readValue(record, key, parentPath, issues);
}

function readBoolean(record: Readonly<Record<string, unknown>>, key: string, issues: SettingsIssue[]): boolean | undefined {
  const value = record[key];
  if (value === undefined) {
    issues.push({ code: "REQUIRED_MISSING", path: `/${key}` });
    return undefined;
  }
  if (typeof value !== "boolean") {
    issues.push({ code: "NOT_BOOLEAN", path: `/${key}` });
    return undefined;
  }
  return value;
}

function checkKeys(
  record: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  path: string,
  issues: SettingsIssue[],
): void {
  if (Object.keys(record).some((key) => !allowed.includes(key))) issues.push({ code: "FIELD_UNKNOWN", path });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
