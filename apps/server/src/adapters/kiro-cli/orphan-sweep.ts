import { lstat, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isRunDirectoryActive } from "./active-runs.js";
import {
  listKiroSessions,
  removeRunDirectory,
  requestKiroSessionDeletion,
  type KiroCommandRequest,
} from "./cleanup.js";
import { systemProcessProbe, type ProcessProbe } from "./process-probe.js";
import { readSessionRecord, RUN_DIRECTORY_PREFIX, RUN_MARKER_FILE, type SessionRecord } from "./session-lifecycle.js";

/** Age after which a directory with no recorded process counts as unclaimed. One hour (自定). */
const DEFAULT_UNCLAIMED_AFTER_MS = 3_600_000;
/** Wait for a process to exit after SIGTERM, and again after SIGKILL. Two seconds (自定). */
const DEFAULT_KILL_GRACE_MS = 2_000;
/** Limit for one saved-session command. It is the same bound a deletion request has (自定). */
const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;
const EXIT_POLL_MS = 50;

/** Written into a kept directory, so an operator can see why the sweep kept it. */
const MANUAL_ACTION_FILE = "needs-manual.json";
const MANUAL_ACTION_SCHEMA = "voxward.kiro-manual.v1";

/** Why a directory is kept for a person. Each reason is a case the sweep cannot settle on its own. */
export type ManualActionReason =
  | "IDENTITY_UNCONFIRMED"
  | "PROCESS_NOT_STOPPED"
  | "RECORD_UNREADABLE"
  | "CLI_NOT_CONFIGURED"
  | "SESSION_LISTING_UNAVAILABLE"
  | "SESSION_DELETE_FAILED"
  | "REMOVAL_FAILED";

/** The CLI that deletes saved sessions and lists the sessions of a run directory. */
export interface OrphanKiroCli {
  readonly command: string;
  readonly env: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface OrphanSweepOptions {
  readonly runtimeRoot: string;
  readonly now: Date;
  readonly unclaimedAfterMs?: number;
  /** Wait after each signal, before the next step. Default 2000 ms. */
  readonly killGraceMs?: number;
  /** Process checks and signals. Default: the system probe. */
  readonly processes?: ProcessProbe;
  /**
   * The CLI for saved sessions. Omitted, the sweep cannot ask the CLI, so every orphan whose saved sessions are not known
   * is kept for a person.
   */
  readonly kiroCli?: OrphanKiroCli;
}

export interface OrphanSweepReport {
  /** Run directories removed. */
  readonly removed: number;
  /** Directories left alone: too new to call unclaimed, or running in this process. */
  readonly skipped: number;
  /** Entries that are not this adapter's directories, such as links and directories without the marker. */
  readonly refused: number;
  /** Orphan CLI process groups that were stopped. */
  readonly terminated: number;
  /** Directories kept for a person. Each one holds `needs-manual.json` with the reason. */
  readonly manualAction: number;
  readonly kiroSessions: { readonly requested: number; readonly failed: number; readonly notObserved: number };
}

interface Tally {
  removed: number;
  skipped: number;
  refused: number;
  terminated: number;
  manualAction: number;
  requested: number;
  failed: number;
  notObserved: number;
}

/** The resolved options and the counts of one pass. */
interface Pass {
  readonly runtimeRoot: string;
  readonly now: Date;
  readonly unclaimedAfterMs: number;
  readonly killGraceMs: number;
  readonly processes: ProcessProbe;
  readonly kiroCli: OrphanKiroCli | undefined;
  readonly tally: Tally;
}

/**
 * Settles the residue of runs that did not finish cleanly: a restart or crash during a run, or a cleanup that never ran.
 * A recorded process still running in its run directory is stopped first, so its CLI cannot keep calling the model. Its
 * saved CLI session is then deleted, and the directory is removed. An orphan without a recorded session is listed in its
 * own directory, and a directory that cannot be settled is kept with a reason. A process that works in this process's
 * active batches is never touched.
 */
export async function sweepOrphanRunDirectories(options: OrphanSweepOptions): Promise<OrphanSweepReport> {
  const pass: Pass = {
    runtimeRoot: options.runtimeRoot,
    now: options.now,
    unclaimedAfterMs: options.unclaimedAfterMs ?? DEFAULT_UNCLAIMED_AFTER_MS,
    killGraceMs: options.killGraceMs ?? DEFAULT_KILL_GRACE_MS,
    processes: options.processes ?? systemProcessProbe,
    kiroCli: options.kiroCli,
    tally: { removed: 0, skipped: 0, refused: 0, terminated: 0, manualAction: 0, requested: 0, failed: 0, notObserved: 0 },
  };
  const entries = await readdir(options.runtimeRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.name.startsWith(RUN_DIRECTORY_PREFIX)) continue;
    await sweepDirectory(join(options.runtimeRoot, entry.name), pass);
  }
  return reportOf(pass.tally);
}

export interface OrphanSweepSchedule {
  stop(): void;
}

export interface ScheduledOrphanSweepOptions extends Omit<OrphanSweepOptions, "now"> {
  readonly intervalMs: number;
  /** Clock of each pass. Default: the system clock. */
  readonly clock?: () => Date;
  readonly onReport: (report: OrphanSweepReport) => void;
  readonly onError: (error: unknown) => void;
}

/**
 * Runs the orphan sweep on a timer, so a process that outlives its batch is found without a restart. A pass never overlaps
 * the one before it, and the timer does not keep the server process alive.
 */
export function scheduleOrphanSweeps(options: ScheduledOrphanSweepOptions): OrphanSweepSchedule {
  const { intervalMs, clock = () => new Date(), onReport, onError, ...sweep } = options;
  let passing = false;
  const runPass = async (): Promise<void> => {
    if (passing) return;
    passing = true;
    try {
      onReport(await sweepOrphanRunDirectories({ ...sweep, now: clock() }));
    } catch (error) {
      onError(error);
    } finally {
      passing = false;
    }
  };
  const timer = setInterval(() => void runPass(), intervalMs);
  timer.unref();
  return { stop: () => clearInterval(timer) };
}

async function sweepDirectory(directory: string, pass: Pass): Promise<void> {
  if (isRunDirectoryActive(directory)) {
    pass.tally.skipped += 1;
    return;
  }
  const entry = await lstatOrUndefined(directory);
  if (entry === undefined) {
    pass.tally.skipped += 1;
    return;
  }
  if (!entry.isDirectory() || !(await hasMarker(directory))) {
    pass.tally.refused += 1;
    return;
  }

  const record = await readSessionRecord(directory);
  if (!mayBeOrphan(record, entry.mtime, pass)) {
    pass.tally.skipped += 1;
    return;
  }
  if ((await endRecordedProcess(record, directory, pass)) === "KEPT") return;
  if ((await deleteSavedSessions(record, directory, pass)) === "KEPT") return;
  await removeOrKeep(directory, pass);
}

/**
 * Whether a directory may be an orphan yet. A record that names a process is judged by that process at once. A finished
 * record is an orphan. Any other record, and a directory without one, must be older than the unclaimed age, so a batch
 * that is still starting is not swept.
 */
function mayBeOrphan(record: SessionRecord | undefined, modifiedAt: Date, pass: Pass): boolean {
  if (record === undefined) return isOlderThan(modifiedAt, pass);
  if (record.pid !== null || record.state === "finished") return true;
  return isOlderThan(new Date(record.createdAt), pass);
}

/**
 * Makes sure the process that a record names is gone. A live process is stopped only when it works in this run directory,
 * so a pid that another process reused is never signalled. KEPT when the process cannot be identified or stopped.
 */
async function endRecordedProcess(
  record: SessionRecord | undefined,
  directory: string,
  pass: Pass,
): Promise<"ENDED" | "KEPT"> {
  const pid = record?.pid ?? null;
  if (pid === null || !pass.processes.isAlive(pid)) return "ENDED";
  const identity = await pass.processes.identify(pid, directory);
  if (identity === "OTHER") return "ENDED";
  if (identity === "UNKNOWN") return keep(directory, "IDENTITY_UNCONFIRMED", pass);
  if (!(await stopProcessGroup(pid, pass))) return keep(directory, "PROCESS_NOT_STOPPED", pass);
  pass.tally.terminated += 1;
  return "ENDED";
}

/** SIGTERM to the group, then SIGKILL after the grace period, each followed by a wait for the leader to exit. */
async function stopProcessGroup(pid: number, pass: Pass): Promise<boolean> {
  const { processes } = pass;
  processes.signalGroup(pid, "SIGTERM");
  if (!(await waitForExit(pid, pass))) {
    processes.signalGroup(pid, "SIGKILL");
    if (!(await waitForExit(pid, pass))) return false;
  }
  // Members of the group that ignored SIGTERM are stopped as well. A group with no members left is not an error.
  processes.signalGroup(pid, "SIGKILL");
  return true;
}

async function waitForExit(pid: number, pass: Pass): Promise<boolean> {
  const deadline = Date.now() + pass.killGraceMs;
  while (pass.processes.isAlive(pid)) {
    if (Date.now() >= deadline) return false;
    await delay(EXIT_POLL_MS);
  }
  return true;
}

/**
 * Deletes the CLI sessions of an orphan. A recorded id is used as it is. Without one, the CLI lists the sessions saved in
 * the run directory, and every session it lists belongs to that batch. Any answer that is not definite keeps the directory.
 */
async function deleteSavedSessions(
  record: SessionRecord | undefined,
  directory: string,
  pass: Pass,
): Promise<"DONE" | "KEPT"> {
  // Without a record the process cannot be ruled out, so the saved sessions are not touched either.
  if (record === undefined) return keep(directory, "RECORD_UNREADABLE", pass);
  const cli = pass.kiroCli;
  if (cli === undefined) return keep(directory, "CLI_NOT_CONFIGURED", pass);

  const command = commandIn(cli, directory);
  const sessionIds =
    record.kiroSessionId === null ? await listKiroSessions(command) : [record.kiroSessionId];
  if (sessionIds === undefined) return keep(directory, "SESSION_LISTING_UNAVAILABLE", pass);
  if (sessionIds.length === 0) {
    pass.tally.notObserved += 1;
    return "DONE";
  }
  for (const sessionId of sessionIds) {
    const deletion = await requestKiroSessionDeletion({ ...command, sessionId });
    if (deletion !== "DELETE_REQUESTED") {
      pass.tally.failed += 1;
      return keep(directory, "SESSION_DELETE_FAILED", pass);
    }
    pass.tally.requested += 1;
  }
  return "DONE";
}

/** The saved-session command for one run directory. The directory is its working directory. */
function commandIn(cli: OrphanKiroCli, directory: string): KiroCommandRequest {
  return {
    command: cli.command,
    env: cli.env,
    workingDirectory: directory,
    timeoutMs: cli.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
  };
}

async function removeOrKeep(directory: string, pass: Pass): Promise<void> {
  const cleanup = await removeRunDirectory(pass.runtimeRoot, directory);
  if (cleanup === "REMOVED" || cleanup === "ABSENT") pass.tally.removed += 1;
  else if (cleanup === "REFUSED") pass.tally.refused += 1;
  else await keep(directory, "REMOVAL_FAILED", pass);
}

/**
 * Keeps a directory for a person and writes the reason into it. The next pass judges the directory again, so a kept
 * directory is reported on every pass until it is settled.
 */
async function keep(directory: string, reason: ManualActionReason, pass: Pass): Promise<"KEPT"> {
  pass.tally.manualAction += 1;
  const note = { schema: MANUAL_ACTION_SCHEMA, reason, recordedAt: pass.now.toISOString() };
  await writeFile(join(directory, MANUAL_ACTION_FILE), `${JSON.stringify(note)}\n`, { mode: 0o600 }).catch(
    () => undefined,
  );
  return "KEPT";
}

function reportOf(tally: Tally): OrphanSweepReport {
  return {
    removed: tally.removed,
    skipped: tally.skipped,
    refused: tally.refused,
    terminated: tally.terminated,
    manualAction: tally.manualAction,
    kiroSessions: { requested: tally.requested, failed: tally.failed, notObserved: tally.notObserved },
  };
}

async function lstatOrUndefined(path: string) {
  try {
    return await lstat(path);
  } catch {
    return undefined;
  }
}

async function hasMarker(directory: string): Promise<boolean> {
  try {
    return (await lstat(join(directory, RUN_MARKER_FILE))).isFile();
  } catch {
    return false;
  }
}

function isOlderThan(at: Date, pass: Pass): boolean {
  return pass.now.getTime() - at.getTime() > pass.unclaimedAfterMs;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
