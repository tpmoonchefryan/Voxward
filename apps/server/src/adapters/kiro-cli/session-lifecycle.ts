import { mkdir, mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Name prefix of every one-time run directory. Cleanup only ever touches directories that carry this prefix. */
export const RUN_DIRECTORY_PREFIX = "run-";
/** Marker file that says a directory was made by this adapter. Cleanup refuses a directory without it. */
export const RUN_MARKER_FILE = ".voxward-session";
/** Metadata record of one run. It holds state and identifiers only, never prompt, item-id map or output text. */
export const SESSION_RECORD_FILE = "session.json";

export const RUN_MARKER_SCHEMA = "voxward.kiro-run.v1";
export const SESSION_RECORD_SCHEMA = "voxward.kiro-session.v1";

export type SessionState = "created" | "running" | "finished";

export interface SessionRecord {
  readonly schema: typeof SESSION_RECORD_SCHEMA;
  readonly batchId: string;
  readonly state: SessionState;
  /** The error code or SUCCEEDED once finished, otherwise null. */
  readonly outcome: string | null;
  /** Process id of the CLI while it may run, otherwise null. */
  readonly pid: number | null;
  /** Saved CLI session id, when the run stream named one in the accepted shape. */
  readonly kiroSessionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RunSession {
  readonly directory: string;
  markRunning(pid: number): Promise<void>;
  recordKiroSession(kiroSessionId: string): Promise<void>;
  finish(outcome: string): Promise<void>;
}

/**
 * Creates the one-time directory of a batch. The directory gets a marker file and a metadata record, and no content:
 * the prompt travels on stdin and the output stays in memory.
 */
export async function openRunSession(runtimeRoot: string, batchId: string, now: Date): Promise<RunSession> {
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(runtimeRoot, RUN_DIRECTORY_PREFIX));
  await writeFile(join(directory, RUN_MARKER_FILE), `${JSON.stringify({ schema: RUN_MARKER_SCHEMA })}\n`, {
    mode: 0o600,
  });

  let record: SessionRecord = {
    schema: SESSION_RECORD_SCHEMA,
    batchId,
    state: "created",
    outcome: null,
    pid: null,
    kiroSessionId: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await writeRecord(directory, record);

  const update = async (patch: Partial<SessionRecord>, at: Date): Promise<void> => {
    record = { ...record, ...patch, updatedAt: at.toISOString() };
    await writeRecord(directory, record);
  };
  return {
    directory,
    markRunning: (pid) => update({ state: "running", pid }, new Date()),
    recordKiroSession: (kiroSessionId) => update({ kiroSessionId }, new Date()),
    finish: (outcome) => update({ state: "finished", outcome, pid: null }, new Date()),
  };
}

/** Reads a record. Returns undefined for a missing or unreadable record, so the caller can treat the directory as unclaimed. */
export async function readSessionRecord(directory: string): Promise<SessionRecord | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(join(directory, SESSION_RECORD_FILE), "utf8"));
    return isSessionRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function writeRecord(directory: string, record: SessionRecord): Promise<void> {
  const target = join(directory, SESSION_RECORD_FILE);
  const staging = `${target}.tmp`;
  await writeFile(staging, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  await rename(staging, target);
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<Record<keyof SessionRecord, unknown>>;
  return (
    record.schema === SESSION_RECORD_SCHEMA &&
    typeof record.batchId === "string" &&
    (record.state === "created" || record.state === "running" || record.state === "finished") &&
    (record.pid === null || typeof record.pid === "number") &&
    typeof record.createdAt === "string"
  );
}
