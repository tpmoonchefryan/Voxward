import { spawn, type ChildProcess } from "node:child_process";
import { lstat, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { buildDeleteSessionArguments } from "./command.js";
import { signalProcessGroup } from "./process-group.js";
import { RUN_DIRECTORY_PREFIX, RUN_MARKER_FILE } from "./session-lifecycle.js";

/**
 * REMOVED: the directory was deleted. ABSENT: it was already gone. REFUSED: it is not a directory this adapter made, or it
 * is a symbolic link. FAILED: the removal itself failed.
 */
export type RunDirectoryCleanup = "REMOVED" | "ABSENT" | "REFUSED" | "FAILED";

/**
 * Removes one run directory. Only a direct child of the runtime root, named with the run prefix and carrying the marker
 * file, is removed. A symbolic link is never followed, and the runtime root itself is never removed.
 */
export async function removeRunDirectory(runtimeRoot: string, directory: string): Promise<RunDirectoryCleanup> {
  const absolute = resolve(directory);
  if (dirname(absolute) !== resolve(runtimeRoot) || !basename(absolute).startsWith(RUN_DIRECTORY_PREFIX)) {
    return "REFUSED";
  }

  let entry;
  try {
    entry = await lstat(absolute);
  } catch (error) {
    return isNotFound(error) ? "ABSENT" : "FAILED";
  }
  if (!entry.isDirectory()) return "REFUSED";
  if (!(await hasMarker(absolute))) return "REFUSED";

  try {
    await rm(absolute, { recursive: true, force: true });
    return "REMOVED";
  } catch {
    return "FAILED";
  }
}

/**
 * DELETE_REQUESTED: the CLI accepted the delete command with exit status 0. That is the only claim made. It does not mean
 * the provider has erased the data (design section 7). DELETE_FAILED: the command failed or timed out. NOT_OBSERVED: the
 * run never named a session id, so no command was sent.
 */
export type KiroSessionDeletion = "DELETE_REQUESTED" | "DELETE_FAILED" | "NOT_OBSERVED";

export interface KiroSessionDeletionRequest {
  readonly command: string;
  readonly env: Readonly<Record<string, string>>;
  readonly workingDirectory: string;
  readonly sessionId: string | undefined;
  readonly timeoutMs: number;
}

/** Asks the CLI to delete one saved session. Its output is discarded, so no content is kept. */
export async function requestKiroSessionDeletion(request: KiroSessionDeletionRequest): Promise<KiroSessionDeletion> {
  if (request.sessionId === undefined) return "NOT_OBSERVED";
  let args: string[];
  try {
    args = buildDeleteSessionArguments(request.sessionId);
  } catch {
    return "DELETE_FAILED";
  }
  const exitCode = await runToExit(request, args);
  return exitCode === 0 ? "DELETE_REQUESTED" : "DELETE_FAILED";
}

async function hasMarker(directory: string): Promise<boolean> {
  try {
    return (await lstat(join(directory, RUN_MARKER_FILE))).isFile();
  } catch {
    return false;
  }
}

function runToExit(request: KiroSessionDeletionRequest, args: readonly string[]): Promise<number | undefined> {
  return new Promise((resolveExit) => {
    let child: ChildProcess;
    try {
      child = spawn(request.command, [...args], {
        cwd: request.workingDirectory,
        env: { ...request.env },
        stdio: "ignore",
        detached: true,
        windowsHide: true,
      });
    } catch {
      resolveExit(undefined);
      return;
    }
    const timer = setTimeout(() => signalProcessGroup(child, "SIGKILL"), request.timeoutMs);
    child.on("error", () => {
      clearTimeout(timer);
      resolveExit(undefined);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveExit(code ?? undefined);
    });
  });
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}
