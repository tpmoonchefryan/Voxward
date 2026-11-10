import type { ChildProcess } from "node:child_process";

/**
 * Signals the process group a child leads, so helpers the CLI started stop with it. The child is started detached, which
 * makes it a group leader on POSIX. A group that has already exited is not an error.
 */
export function signalProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // The group has already exited.
  }
}
