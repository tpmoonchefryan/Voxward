import { existsSync, lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

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
  "VOXWARD_YOUTUBE_CLIENT_SECRET",
] as const;

const FORBIDDEN_TOKEN_ENV_KEYS = [
  "YOUTUBE_REFRESH_TOKEN",
  "YOUTUBE_ACCESS_TOKEN",
  "GOOGLE_REFRESH_TOKEN",
  "VOXWARD_YOUTUBE_REFRESH_TOKEN",
  "VOXWARD_YOUTUBE_ACCESS_TOKEN",
  "VOXWARD_YOUTUBE_API_KEY",
  "OPENAI_API_KEY",
  "VOXWARD_OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "VOXWARD_ANTHROPIC_API_KEY",
  "VOXWARD_AI_API_KEY",
  "KIRO_API_KEY",
  "VOXWARD_VAULT_KEY",
  "VOXWARD_MASTER_KEY",
  "VOXWARD_SESSION_SECRET",
  "VOXWARD_BOOTSTRAP_PASSWORD",
  "BWS_ACCESS_TOKEN",
] as const;

const DYNAMIC_FORBIDDEN_ENV = /^(?:VOXWARD|YOUTUBE|GOOGLE|OPENAI|ANTHROPIC|KIRO|BWS)_.*(?:SECRET|TOKEN|API_KEY|VAULT_KEY|MASTER_KEY|PASSWORD)$/i;

function resolveWithNearestAncestor(targetPath: string): string {
  const abs = resolve(targetPath);
  const tail: string[] = [];
  let cursor = abs;
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) break;
    tail.unshift(basename(cursor));
    cursor = parent;
  }
  const realBase = existsSync(cursor) ? realpathSync(cursor) : cursor;
  return tail.length > 0 ? join(realBase, ...tail) : realBase;
}

function hasForbiddenDbMarkers(pathLower: string): boolean {
  const base = basename(pathLower);
  if (pathLower.includes("prod") || pathLower.includes("production")) return true;
  if ((base === "voxward.db" || base === "voxward.sqlite3") && !pathLower.includes("sandbox")) return true;
  return false;
}

function hasSandboxMarker(pathLower: string): boolean {
  const base = basename(pathLower);
  return base.includes("sandbox") || pathLower.includes("/sandbox/");
}

export function isSandboxDatabasePath(filePath: string): boolean {
  if (filePath === ":memory:") return true;
  if (!filePath || filePath.includes("\0") || filePath.startsWith("file:")) return false;

  const abs = resolve(filePath);
  const absLower = abs.toLowerCase();
  const real = resolveWithNearestAncestor(abs);
  const realLower = real.toLowerCase();

  if (hasForbiddenDbMarkers(absLower) || hasForbiddenDbMarkers(realLower)) {
    return false;
  }

  // Reject symlinked database file or immediate parent escaping into a non-sandbox path.
  try {
    if (existsSync(abs) && lstatSync(abs).isSymbolicLink()) {
      const targetLower = realpathSync(abs).toLowerCase();
      if (!hasSandboxMarker(targetLower) || hasForbiddenDbMarkers(targetLower)) {
        return false;
      }
    }
  } catch {
    return false;
  }

  const realTmp = realpathSync(tmpdir()).toLowerCase();
  const realInTmp = realLower.startsWith(`${realTmp}/`) || realLower === realTmp;
  return hasSandboxMarker(absLower) && (hasSandboxMarker(realLower) || realInTmp);
}

/**
 * Fail-closed startup guard for the synthetic sandbox.
 * Refuses to boot if production OAuth secrets, API keys, vault keys, or non-sandbox database paths are detected.
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
        `Sandbox refused to start: real credential (${key}) must not be present`,
      );
    }
  }

  for (const [key, val] of Object.entries(env)) {
    if (!DYNAMIC_FORBIDDEN_ENV.test(key)) continue;
    if (typeof val === "string" && val.trim().length > 0) {
      throw new SandboxGuardError(
        "SANDBOX_PROD_TOKEN_FORBIDDEN",
        `Sandbox refused to start: production credential (${key}) must not be present`,
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
