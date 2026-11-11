import { mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Absolute path of the bench directory. Every bench file path is derived from it, never from the working directory. */
export const BENCH_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = resolve(BENCH_ROOT, "..");

export const SAMPLES_PATH = join(BENCH_ROOT, "samples", "moderation-samples.json");
export const RULES_PATH = join(BENCH_ROOT, "samples", "rule-set.json");
export const FAKE_CLI = join(BENCH_ROOT, "fixtures", "fake-kiro-cli.mjs");

/** The tsx loader that runs TypeScript in a child process (the crash scenario). It is taken from apps/server, which owns tsx. */
export const TSX_LOADER_URL = pathToFileURL(join(REPO_ROOT, "apps", "server", "node_modules", "tsx", "dist", "loader.mjs")).href;

/**
 * A fresh scratch directory for one run. Under $KIROCREW_SCRATCH when that is set, otherwise under bench/.tmp, which the
 * repository .gitignore already excludes. Never /tmp: the bench must not leave files there.
 */
export function createScratchDir(prefix: string): string {
  const session = process.env.KIROCREW_SCRATCH;
  const base = session !== undefined && session !== "" ? join(session, "bench") : join(BENCH_ROOT, ".tmp");
  mkdirSync(base, { recursive: true });
  return mkdtempSync(join(base, prefix));
}
