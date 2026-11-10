import { readdir, lstat } from "node:fs/promises";
import { join } from "node:path";
import { removeRunDirectory, requestKiroSessionDeletion, type KiroSessionDeletion } from "./cleanup.js";
import { readSessionRecord, RUN_DIRECTORY_PREFIX, RUN_MARKER_FILE, type SessionRecord } from "./session-lifecycle.js";

/** Default age after which a directory with no recorded process counts as unclaimed. One hour (自定). */
const DEFAULT_UNCLAIMED_AFTER_MS = 3_600_000;

export interface OrphanSweepOptions {
  readonly runtimeRoot: string;
  readonly now: Date;
  readonly unclaimedAfterMs?: number;
  /** Whether a recorded process id still runs. The default probes with signal 0. */
  readonly isProcessAlive?: (pid: number) => boolean;
  /** Asks the CLI to delete the saved session of an orphan. Omitted, saved sessions are only counted. */
  readonly deleteKiroSession?: (sessionId: string) => Promise<KiroSessionDeletion>;
}

export interface OrphanSweepReport {
  /** Run directories removed. */
  readonly removed: number;
  /** Directories left alone: their process still runs, or they are too new to call unclaimed. */
  readonly skipped: number;
  /** Entries that are not this adapter's directories, such as links or directories without the marker. */
  readonly refused: number;
  readonly kiroSessions: { readonly requested: number; readonly failed: number; readonly notObserved: number };
}

type Verdict = "ORPHAN" | "SKIP" | "REFUSE";

/**
 * Removes residue of runs that did not finish cleanly: a restart or crash during a run, or a cleanup that never ran. A
 * directory is an orphan when its record says it finished, when its recorded process is gone, or when it was never started
 * and is old. A directory whose process still runs is left alone, because it may still be writing. The sweep only
 * touches directories this adapter made.
 */
export async function sweepOrphanRunDirectories(options: OrphanSweepOptions): Promise<OrphanSweepReport> {
  const counts = { removed: 0, skipped: 0, refused: 0, requested: 0, failed: 0, notObserved: 0 };
  const entries = await readdir(options.runtimeRoot, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.name.startsWith(RUN_DIRECTORY_PREFIX)) continue;
    const directory = join(options.runtimeRoot, entry.name);
    const record = await recordOf(directory);
    const verdict = await judge(directory, record, options);
    if (verdict === "REFUSE") {
      counts.refused += 1;
      continue;
    }
    if (verdict === "SKIP") {
      counts.skipped += 1;
      continue;
    }
    const deletion = await deleteSavedSession(record, options);
    if (deletion === "DELETE_REQUESTED") counts.requested += 1;
    else if (deletion === "DELETE_FAILED") counts.failed += 1;
    else if (deletion === "NOT_OBSERVED") counts.notObserved += 1;

    const cleanup = await removeRunDirectory(options.runtimeRoot, directory);
    if (cleanup === "REMOVED" || cleanup === "ABSENT") counts.removed += 1;
    else counts.refused += 1;
  }

  return {
    removed: counts.removed,
    skipped: counts.skipped,
    refused: counts.refused,
    kiroSessions: { requested: counts.requested, failed: counts.failed, notObserved: counts.notObserved },
  };
}

async function recordOf(directory: string): Promise<SessionRecord | undefined> {
  return readSessionRecord(directory);
}

async function judge(
  directory: string,
  record: SessionRecord | undefined,
  options: OrphanSweepOptions,
): Promise<Verdict> {
  let entry;
  try {
    entry = await lstat(directory);
  } catch {
    return "SKIP";
  }
  if (!entry.isDirectory()) return "REFUSE";
  if (!(await hasMarker(directory))) return "REFUSE";

  if (record === undefined) {
    return isOlderThan(entry.mtime, options) ? "ORPHAN" : "SKIP";
  }
  if (record.state === "finished") return "ORPHAN";
  if (record.pid !== null) {
    const alive = (options.isProcessAlive ?? probeAlive)(record.pid);
    return alive ? "SKIP" : "ORPHAN";
  }
  return isOlderThan(new Date(record.createdAt), options) ? "ORPHAN" : "SKIP";
}

async function deleteSavedSession(
  record: SessionRecord | undefined,
  options: OrphanSweepOptions,
): Promise<KiroSessionDeletion | undefined> {
  if (record === undefined || options.deleteKiroSession === undefined) return undefined;
  if (record.kiroSessionId === null) return "NOT_OBSERVED";
  return options.deleteKiroSession(record.kiroSessionId);
}

async function hasMarker(directory: string): Promise<boolean> {
  try {
    return (await lstat(join(directory, RUN_MARKER_FILE))).isFile();
  } catch {
    return false;
  }
}

function isOlderThan(at: Date, options: OrphanSweepOptions): boolean {
  const ageMs = options.now.getTime() - at.getTime();
  return ageMs > (options.unclaimedAfterMs ?? DEFAULT_UNCLAIMED_AFTER_MS);
}

/** Signal 0 checks existence without sending anything. EPERM means the process exists under another owner. */
function probeAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
