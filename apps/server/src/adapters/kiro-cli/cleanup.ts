import { spawn, type ChildProcess } from "node:child_process";
import { lstat, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { isPlainObject } from "@voxward/contracts";
import { buildDeleteSessionArguments, buildListSessionsArguments, isAcceptedSessionId } from "./command.js";
import { signalProcessGroup } from "./process-group.js";
import { RUN_DIRECTORY_PREFIX, RUN_MARKER_FILE } from "./session-lifecycle.js";

/** Largest listing output kept. A listing larger than this is refused, not cut (自定, the run output cap). */
const MAX_LISTING_BYTES = 1_048_576;

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

/** The CLI command run inside one run directory. The directory is the working directory, because the CLI keeps sessions per directory. */
export interface KiroCommandRequest {
  readonly command: string;
  readonly env: Readonly<Record<string, string>>;
  readonly workingDirectory: string;
  readonly timeoutMs: number;
}

export interface KiroSessionDeletionRequest extends KiroCommandRequest {
  readonly sessionId: string | undefined;
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
  const { exitCode } = await runCommand(request, args, false);
  return exitCode === 0 ? "DELETE_REQUESTED" : "DELETE_FAILED";
}

/**
 * The session ids saved in one run directory, or undefined when the listing failed or has an unexpected shape. An empty
 * list is a definite answer; an unreadable listing is not, so the caller must not treat it as empty.
 */
export async function listKiroSessions(request: KiroCommandRequest): Promise<string[] | undefined> {
  const { exitCode, stdout } = await runCommand(request, buildListSessionsArguments(), true);
  if (exitCode !== 0 || stdout === undefined) return undefined;
  return parseSessionListing(stdout);
}

/** Accepts a JSON array of session ids, or of objects that carry one as `sessionId`. Anything else is undefined. */
export function parseSessionListing(text: string): string[] | undefined {
  let listing: unknown;
  try {
    listing = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!Array.isArray(listing)) return undefined;

  const ids: string[] = [];
  for (const entry of listing) {
    const id: unknown = typeof entry === "string" ? entry : isPlainObject(entry) ? entry.sessionId : undefined;
    if (typeof id !== "string" || !isAcceptedSessionId(id)) return undefined;
    ids.push(id);
  }
  return ids;
}

async function hasMarker(directory: string): Promise<boolean> {
  try {
    return (await lstat(join(directory, RUN_MARKER_FILE))).isFile();
  } catch {
    return false;
  }
}

interface CommandResult {
  /** Undefined when the command could not start, or was killed by a signal. */
  readonly exitCode: number | undefined;
  /** Present only when stdout was captured, the command exited, and its output stayed within the cap. */
  readonly stdout: string | undefined;
}

/**
 * Runs one CLI command to its end, in its own process group, and kills the group when the timeout passes. Stdout is kept
 * only when asked for, and only up to the cap.
 */
function runCommand(request: KiroCommandRequest, args: readonly string[], captureStdout: boolean): Promise<CommandResult> {
  return new Promise((resolveResult) => {
    let child: ChildProcess;
    try {
      child = spawn(request.command, [...args], {
        cwd: request.workingDirectory,
        env: { ...request.env },
        stdio: ["ignore", captureStdout ? "pipe" : "ignore", "ignore"],
        detached: true,
        windowsHide: true,
      });
    } catch {
      resolveResult({ exitCode: undefined, stdout: undefined });
      return;
    }

    const chunks: Buffer[] = [];
    let bytes = 0;
    let oversized = false;
    const timer = setTimeout(() => signalProcessGroup(child, "SIGKILL"), request.timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_LISTING_BYTES) {
        oversized = true;
        signalProcessGroup(child, "SIGKILL");
        return;
      }
      chunks.push(chunk);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolveResult({ exitCode: undefined, stdout: undefined });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const stdout = captureStdout && !oversized ? Buffer.concat(chunks).toString("utf8") : undefined;
      resolveResult({ exitCode: code ?? undefined, stdout });
    });
  });
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}
