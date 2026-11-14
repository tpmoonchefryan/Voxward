import { basename } from "node:path";

export type SandboxGuardErrorCode =
  | "SANDBOX_PROD_OAUTH_FORBIDDEN"
  | "SANDBOX_PROD_TOKEN_FORBIDDEN"
  | "SANDBOX_PROD_DB_FORBIDDEN";

export class SandboxGuardError extends Error {
  readonly code: SandboxGuardErrorCode;

  constructor(code: SandboxGuardErrorCode, message: string) {
    super(message);
    this.name = "SandboxGuardError";
    this.code = code;
  }
}

export interface SandboxOptions {
  readonly enabled: boolean;
  /** Optional explicit database path check override (defaults to database.filePath). */
  readonly databasePath?: string;
  /** Environment variables to inspect (defaults to process.env). */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

const FORBIDDEN_OAUTH_ENV_KEYS = [
  "GOOGLE_CLIENT_SECRET",
  "YOUTUBE_CLIENT_SECRET",
  "OAUTH_CLIENT_SECRET",
] as const;

const FORBIDDEN_TOKEN_ENV_KEYS = [
  "YOUTUBE_REFRESH_TOKEN",
  "YOUTUBE_ACCESS_TOKEN",
  "GOOGLE_REFRESH_TOKEN",
] as const;

export function isSandboxDatabasePath(filePath: string): boolean {
  if (filePath === ":memory:") return true;
  const lower = filePath.toLowerCase();
  const base = basename(lower);
  if (lower.includes("prod") || lower.includes("production")) return false;
  return base.includes("sandbox") || lower.includes("/sandbox/");
}

/**
 * Fail-closed startup guard for the synthetic sandbox.
 * Refuses to boot if production OAuth secrets, real YouTube/Google tokens,
 * or non-sandbox database paths are detected.
 */
export function assertSandboxStartupSafe(options: SandboxOptions, databaseFilePath: string): void {
  if (!options.enabled) return;

  const env = options.env ?? process.env;
  for (const key of FORBIDDEN_OAUTH_ENV_KEYS) {
    const val = env[key];
    if (typeof val === "string" && val.trim().length > 0) {
      throw new SandboxGuardError(
        "SANDBOX_PROD_OAUTH_FORBIDDEN",
        `Sandbox refused to start: production OAuth secret (${key}) must not be present`,
      );
    }
  }

  for (const key of FORBIDDEN_TOKEN_ENV_KEYS) {
    const val = env[key];
    if (typeof val === "string" && val.trim().length > 0) {
      throw new SandboxGuardError(
        "SANDBOX_PROD_TOKEN_FORBIDDEN",
        `Sandbox refused to start: real platform token (${key}) must not be present`,
      );
    }
  }

  const dbPath = options.databasePath ?? databaseFilePath;
  if (!isSandboxDatabasePath(dbPath)) {
    throw new SandboxGuardError(
      "SANDBOX_PROD_DB_FORBIDDEN",
      `Sandbox refused to start: non-sandbox database path (${dbPath}) is forbidden`,
    );
  }
}
