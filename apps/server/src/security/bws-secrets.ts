import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface BwsSecretEntry {
  readonly id: string;
  readonly projectId: string | null;
  readonly key: string;
  readonly value: string;
  readonly note: string;
}

export interface BwsLoadOptions {
  readonly bwsBinary?: string;
  readonly accessToken?: string;
  readonly tokenFilePath?: string;
  readonly projectId?: string;
}

export function maskSecretValue(secret: string | null | undefined): string {
  if (!secret || secret.length <= 4) return "***";
  return `***${secret.slice(-4)}`;
}

export function sanitizeSecretText(text: string, secrets: readonly (string | null | undefined)[]): string {
  let out = String(text);
  for (const secret of secrets) {
    if (!secret || secret.length < 4) continue;
    out = out.split(secret).join(maskSecretValue(secret));
    const encoded = encodeURIComponent(secret);
    if (encoded !== secret) {
      out = out.split(encoded).join(maskSecretValue(secret));
    }
  }
  return out;
}

export function resolveBwsBinary(explicit?: string): string {
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  const pathEnv = process.env.PATH ?? "";
  const candidates = [
    ...pathEnv.split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "bws")),
    path.join(os.homedir(), ".local", "bin", "bws"),
    "/usr/local/bin/bws",
  ];
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return "bws";
}

export function resolveBwsAccessToken(options: BwsLoadOptions = {}): string {
  const explicit = options.accessToken?.trim();
  if (explicit) return explicit;
  const fromEnv = (process.env.BWS_ACCESS_TOKEN ?? "").trim();
  if (fromEnv) return fromEnv;
  const tokenFile = options.tokenFilePath ?? path.join(os.homedir(), ".config", "bws", "token");
  if (!fs.existsSync(tokenFile)) {
    throw new Error("BWS_TOKEN_MISSING");
  }
  const fromFile = fs.readFileSync(tokenFile, "utf8").trim();
  if (!fromFile) throw new Error("BWS_TOKEN_EMPTY");
  return fromFile;
}

/**
 * Loads Bitwarden Secrets Manager secrets strictly into process memory. Never writes secrets to disk or logs.
 */
export function loadBwsSecretsMap(options: BwsLoadOptions = {}): ReadonlyMap<string, BwsSecretEntry> {
  const token = resolveBwsAccessToken(options);
  const bin = resolveBwsBinary(options.bwsBinary);
  const args = options.projectId
    ? ["secret", "list", options.projectId, "-o", "json"]
    : ["secret", "list", "-o", "json"];

  let rawJson: string;
  try {
    rawJson = execFileSync(bin, args, {
      env: { ...process.env, BWS_ACCESS_TOKEN: token },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
  } catch (err) {
    const detail = sanitizeSecretText(
      err instanceof Error ? (err as { stderr?: string }).stderr || err.message : "bws command failed",
      [token],
    );
    throw new Error(`BWS_LOOKUP_FAILED: ${detail}`);
  }

  const parsed = JSON.parse(rawJson) as unknown;
  if (!Array.isArray(parsed)) throw new Error("BWS_INVALID_RESPONSE");

  const map = new Map<string, BwsSecretEntry>();
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.key !== "string" || typeof rec.value !== "string") continue;
    map.set(rec.key, {
      id: typeof rec.id === "string" ? rec.id : rec.key,
      projectId: typeof rec.projectId === "string" ? rec.projectId : null,
      key: rec.key,
      value: rec.value.trim(),
      note: typeof rec.note === "string" ? rec.note.trim() : "",
    });
  }
  return map;
}
