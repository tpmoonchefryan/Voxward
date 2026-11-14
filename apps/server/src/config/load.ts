import { CONTRACT_VERSION, type VoxwardError } from "@voxward/contracts";
import { serverConfigSchema, type ServerConfig } from "./schema.js";

export type ConfigResult =
  | { readonly ok: true; readonly config: ServerConfig }
  | { readonly ok: false; readonly error: VoxwardError };

export interface ConfigSources {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly readFile: (path: string) => string;
}

const CONFIG_FILE_ENV = "VOXWARD_CONFIG_FILE";
const CONFIG_KEYS = Object.keys(serverConfigSchema.shape);
const REQUIRED_KEYS = ["adapters"] as const;

/** Environment variables that map onto configuration keys. Any other VOXWARD_ name is unknown. */
const ENV_KEYS: Readonly<Record<string, string>> = {
  VOXWARD_HOST: "host",
  VOXWARD_PORT: "port",
  VOXWARD_ADAPTERS: "adapters",
  VOXWARD_DATABASE_FILE: "databaseFile",
  VOXWARD_KIRO_TIMEOUT_MS: "kiroTimeoutMs",
};

class ConfigFailure extends Error {
  readonly error: VoxwardError;

  constructor(error: VoxwardError) {
    super(error.code);
    this.error = error;
  }
}

function invalid(key: string, reason: string): ConfigFailure {
  return new ConfigFailure({ contractVersion: CONTRACT_VERSION, code: "CONFIG_INVALID", key, reason });
}

function unknownKey(key: string): ConfigFailure {
  return new ConfigFailure({ contractVersion: CONTRACT_VERSION, code: "CONFIG_UNKNOWN_KEY", key });
}

/** Loads configuration from an optional JSON file, overridden by VOXWARD_* environment variables. */
export function loadConfig({ env, readFile }: ConfigSources): ConfigResult {
  try {
    const fileValues = readConfigFile(env[CONFIG_FILE_ENV], readFile);
    const merged = { ...fileValues, ...readEnvValues(env) };
    return parseConfig(merged);
  } catch (error) {
    if (error instanceof ConfigFailure) return { ok: false, error: error.error };
    throw error;
  }
}

function readConfigFile(path: string | undefined, readFile: ConfigSources["readFile"]): Record<string, unknown> {
  if (path === undefined || path === "") return {};

  let text: string;
  try {
    text = readFile(path);
  } catch {
    throw invalid(CONFIG_FILE_ENV, "file cannot be read");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw invalid(CONFIG_FILE_ENV, "file is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw invalid(CONFIG_FILE_ENV, "file must contain a JSON object");
  }

  const values = parsed as Record<string, unknown>;
  for (const key of Object.keys(values)) {
    if (!CONFIG_KEYS.includes(key)) throw unknownKey(key);
  }
  return values;
}

function readEnvValues(env: ConfigSources["env"]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("VOXWARD_") || name === CONFIG_FILE_ENV || value === undefined) continue;

    const key = ENV_KEYS[name];
    if (key === undefined) throw unknownKey(name);
    const isNumericKey = key === "port" || key === "kiroTimeoutMs";
    values[key] = isNumericKey && /^\d+$/.test(value) ? Number(value) : value;
  }
  return values;
}

function parseConfig(values: Record<string, unknown>): ConfigResult {
  for (const key of REQUIRED_KEYS) {
    if (values[key] === undefined) throw invalid(key, "required key is missing");
  }

  const parsed = serverConfigSchema.safeParse(values);
  if (parsed.success) return { ok: true, config: parsed.data };

  const [issue] = parsed.error.issues;
  if (issue === undefined) throw invalid("(root)", "value is invalid");
  if (issue.code === "unrecognized_keys") throw unknownKey(issue.keys[0] ?? "(unknown)");
  throw invalid(issue.path.map(String).join(".") || "(root)", reasonFor(issue.code));
}

/** Reasons name the kind of problem only. They never echo the configured value. */
function reasonFor(code: string): string {
  switch (code) {
    case "invalid_type":
      return "expected a different type";
    case "too_small":
    case "too_big":
      return "out of range";
    case "invalid_value":
      return "not an allowed value";
    default:
      return "value is invalid";
  }
}

/** One line for operators: the key and the reason, never a value. */
export function describeConfigError(error: VoxwardError): string {
  switch (error.code) {
    case "CONFIG_INVALID":
      return `CONFIG_INVALID: ${error.key} (${error.reason})`;
    case "CONFIG_UNKNOWN_KEY":
      return `CONFIG_UNKNOWN_KEY: ${error.key}`;
    default:
      return error.code;
  }
}
