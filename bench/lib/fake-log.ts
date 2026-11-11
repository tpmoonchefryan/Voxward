import { existsSync, readFileSync } from "node:fs";

/** One line the fake CLI appended to its log. Every line names the process that wrote it. */
export interface FakeLogEntry {
  readonly kind: string;
  readonly pid: number;
}

export function readFakeLog(logPath: string): FakeLogEntry[] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as FakeLogEntry);
}

/** Whether a process is still running. EPERM means it exists under another owner. */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Number of distinct fake-CLI processes from the log that are still running. */
export function countAlive(logPath: string): number {
  const pids = new Set(readFakeLog(logPath).map((entry) => entry.pid));
  let alive = 0;
  for (const pid of pids) if (isAlive(pid)) alive += 1;
  return alive;
}

/** Number of log lines of one kind, such as delete-session. */
export function countKind(logPath: string, kind: string): number {
  return readFakeLog(logPath).filter((entry) => entry.kind === kind).length;
}

/** Waits until the log holds a line of the given kind. Rejects when the deadline passes first. */
export async function waitForKind(logPath: string, kind: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (countKind(logPath, kind) === 0) {
    if (Date.now() > deadline) throw new Error(`log did not reach kind ${kind} in time`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
