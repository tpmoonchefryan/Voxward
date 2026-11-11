import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BatchOutputValidator } from "../../../src/adapters/kiro-cli/provider.js";
import { validateModerationBatch } from "../../../src/modules/inference-provider/index.js";

const SERVER_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** The fake CLI, a Node script that calls no model. Tests never run the real kiro-cli. */
export const FAKE_CLI = fileURLToPath(new URL("./fixtures/fake-kiro-cli.mjs", import.meta.url));

/** Scratch directories live in $KIROCREW_SCRATCH when it is set, otherwise in the git-ignored apps/server/.tmp. */
export function createScratch(prefix: string): string {
  const base = process.env.KIROCREW_SCRATCH ?? join(SERVER_ROOT, ".tmp");
  mkdirSync(base, { recursive: true });
  return mkdtempSync(join(base, prefix));
}

export function makeFakeExecutable(): void {
  chmodSync(FAKE_CLI, 0o755);
}

export interface FakeCallRecord {
  readonly kind: "chat" | "started" | "delete-session" | "list-sessions";
  readonly pid: number;
  readonly cwd: string;
  readonly argv: readonly string[];
  readonly envKeys: readonly string[];
  readonly stdin?: string;
  readonly sessionId?: string;
}

/** Every line the fake CLI appended to its log. A missing log means no process was started. */
export function readCalls(logPath: string): FakeCallRecord[] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as FakeCallRecord);
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("condition was not reached in time");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** The environment the fake CLI gets. It holds only what the test names, never the test process environment. */
export function fakeEnvironment(logPath: string, mode: string): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    FAKE_KIRO_LOG: logPath,
    FAKE_KIRO_MODE: mode,
  };
}

/** The batch validator bound to the adapter port, with the batch limit used by these tests. */
export const moderationValidator: BatchOutputValidator = (output, input) =>
  validateModerationBatch(output, input, { maxItems: 10 });
