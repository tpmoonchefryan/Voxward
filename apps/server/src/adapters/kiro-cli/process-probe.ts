import { readFileSync } from "node:fs";
import { readlink, realpath } from "node:fs/promises";
import { signalProcessGroupById } from "./process-group.js";

/**
 * RUNS_IN: the process works in the run directory. OTHER: it works elsewhere, or it no longer exists, so the recorded pid
 * was reused or is gone. UNKNOWN: the platform or the permissions do not say, so nothing may be signalled.
 */
export type ProcessIdentity = "RUNS_IN" | "OTHER" | "UNKNOWN";

/** The process facts the orphan sweep needs. Tests replace it; the system probe reads signals and Linux /proc. */
export interface ProcessProbe {
  /** Whether a process with this pid exists and has not exited. A zombie has exited. */
  isAlive(pid: number): boolean;
  /** Whether the process with this pid works in the given directory. */
  identify(pid: number, directory: string): Promise<ProcessIdentity>;
  /** Sends a signal to the process group led by this pid. */
  signalGroup(pid: number, signal: NodeJS.Signals): void;
}

export const systemProcessProbe: ProcessProbe = {
  isAlive,
  identify,
  signalGroup: signalProcessGroupById,
};

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch (error) {
    // EPERM means the process exists under another owner.
    return errorCode(error) === "EPERM";
  }
  return !isZombie(pid);
}

async function identify(pid: number, directory: string): Promise<ProcessIdentity> {
  // Only Linux shows the working directory of another process. Elsewhere the identity stays unknown.
  if (process.platform !== "linux") return "UNKNOWN";
  let workingDirectory: string;
  try {
    workingDirectory = await readlink(`/proc/${pid}/cwd`);
  } catch (error) {
    return errorCode(error) === "ENOENT" ? "OTHER" : "UNKNOWN";
  }
  try {
    return workingDirectory === (await realpath(directory)) ? "RUNS_IN" : "OTHER";
  } catch {
    return "UNKNOWN";
  }
}

/** A zombie has exited and waits to be reaped. Linux shows its state in /proc. */
function isZombie(pid: number): boolean {
  let stat: string;
  try {
    stat = readFileSync(`/proc/${pid}/stat`, "utf8");
  } catch {
    return false;
  }
  // The state follows the command name, which sits in parentheses and may contain spaces.
  const state = stat.charAt(stat.lastIndexOf(")") + 2);
  return state === "Z" || state === "X";
}

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}
