import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { openDatabase, type VoxwardDatabase } from "./client.js";
import { runMigrations } from "./migrate.js";
import { createRetentionStore } from "./retention-store.js";
import type { TombstoneEntry, TombstoneLedger } from "./tombstone-ledger.js";

const BACKUP_PREFIX = "voxward-";
const BACKUP_SUFFIX = ".sqlite3";
const DAY_MS = 86_400_000;

/** Every limit is required: a backup directory without a bound is the thing this module exists to prevent. */
export interface BackupLimits {
  readonly maxCount: number;
  readonly maxTotalBytes: number;
  readonly maxAgeDays: number;
}

export interface BackupInfo {
  readonly path: string;
  readonly name: string;
  readonly createdAt: string;
  readonly bytes: number;
}

export interface BackupResult {
  readonly created: BackupInfo;
  readonly pruned: readonly string[];
}

export class BackupError extends Error {
  readonly code:
    | "INVALID_LIMITS"
    | "BACKUP_EXISTS"
    | "RESTORE_REPLAY_INCOMPLETE"
    | "RESTORE_CHECK_FAILED"
    | "RESTORE_COMPACT_FAILED"
    | "BACKUP_NOT_FOUND";

  constructor(code: BackupError["code"]) {
    super(code);
    this.name = "BackupError";
    this.code = code;
  }
}

function assertLimits(limits: BackupLimits): void {
  const ok = (value: number): boolean => Number.isFinite(value) && value > 0;
  if (!ok(limits.maxCount) || !Number.isInteger(limits.maxCount) || !ok(limits.maxTotalBytes) || !ok(limits.maxAgeDays)) {
    throw new BackupError("INVALID_LIMITS");
  }
}

function nameOf(nowIso: string): string {
  return `${BACKUP_PREFIX}${nowIso.replace(/[-:]/g, "")}${BACKUP_SUFFIX}`;
}

function createdAtOf(name: string): string | undefined {
  const match = /^voxward-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z\.sqlite3$/.exec(name);
  if (match === null) return undefined;
  const [, y, mo, d, h, mi, s, ms] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}Z`;
}

/** Backups newest first. Names that are not backups (temporary files, other files) are ignored. */
export function listBackups(directory: string): readonly BackupInfo[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .flatMap((name): BackupInfo[] => {
      const createdAt = createdAtOf(name);
      if (createdAt === undefined) return [];
      const path = join(directory, name);
      return [{ path, name, createdAt, bytes: statSync(path).size }];
    })
    .sort((a, b) => (a.name < b.name ? 1 : -1));
}

/**
 * Takes a consistent copy of the live database with VACUUM INTO (S020, SUB-038), then prunes by the explicit limits.
 * The copy is written under a temporary name and renamed, so a crash never leaves a half file that looks like a backup.
 */
export function createBackup(
  database: VoxwardDatabase,
  options: { readonly directory: string; readonly limits: BackupLimits; readonly nowIso: string },
): BackupResult {
  assertLimits(options.limits);
  mkdirSync(options.directory, { recursive: true, mode: 0o700 });
  removeTemporaryFiles(options.directory);
  const name = nameOf(options.nowIso);
  if (createdAtOf(name) === undefined) throw new RangeError("nowIso must be a UTC ISO timestamp with milliseconds");
  const finalPath = join(options.directory, name);
  if (existsSync(finalPath)) throw new BackupError("BACKUP_EXISTS");
  const temporaryPath = `${finalPath}.tmp`;
  database.sqlite.prepare("VACUUM INTO ?").run(temporaryPath);
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, finalPath);
  const pruned = pruneBackups(options.directory, options.limits, options.nowIso);
  const created = listBackups(options.directory).find((info) => info.name === name);
  if (created === undefined) throw new BackupError("BACKUP_NOT_FOUND");
  return { created, pruned };
}

/** Removes backups older than the age limit, then the oldest beyond the count and size limits. The newest one stays. */
export function pruneBackups(directory: string, limits: BackupLimits, nowIso: string): readonly string[] {
  assertLimits(limits);
  const newestFirst = listBackups(directory);
  const cutoff = new Date(Date.parse(nowIso) - limits.maxAgeDays * DAY_MS).toISOString();
  const kept: BackupInfo[] = [];
  let total = 0;
  const pruned: string[] = [];
  newestFirst.forEach((info, index) => {
    const keep =
      index === 0 || (info.createdAt > cutoff && kept.length < limits.maxCount && total + info.bytes <= limits.maxTotalBytes);
    if (keep) {
      kept.push(info);
      total += info.bytes;
    } else {
      rmSync(info.path, { force: true });
      pruned.push(info.name);
    }
  });
  return pruned;
}

/** The creation time of the oldest remaining backup, or undefined when there is none. */
export function oldestBackupTime(directory: string): string | undefined {
  return listBackups(directory).at(-1)?.createdAt;
}

/** Keeps the ledger as small as the backups allow (R-S020-11). With no backup left, every finished tombstone can go. */
export function pruneLedgerForBackups(ledger: TombstoneLedger, directory: string, nowIso: string): number {
  return ledger.pruneBefore(oldestBackupTime(directory) ?? nowIso);
}

function removeTemporaryFiles(directory: string): void {
  for (const name of readdirSync(directory)) {
    if (name.startsWith(BACKUP_PREFIX) && name.endsWith(`${BACKUP_SUFFIX}.tmp`)) rmSync(join(directory, name), { force: true });
  }
}

export interface ReplayOutcome {
  readonly complete: boolean;
}

export interface RestoreOptions {
  readonly backupPath: string;
  /** The live database file. It is replaced only after every check has passed. */
  readonly targetPath: string;
  readonly ledger: TombstoneLedger;
  /** Clock used for staged expiry sweep before promoting the restored database. */
  readonly now?: () => Date;
  /** Repeats the tombstones on the staged database. Wired by the composition to the data lifecycle module. */
  readonly replay: (staged: VoxwardDatabase, tombstones: readonly TombstoneEntry[]) => ReplayOutcome;
}

/**
 * Restores a backup in isolation (design §5). The service must be stopped: the live file is not opened here. The snapshot
 * is copied to a staging file next to the target, migrated, replayed against the tombstone ledger and checked. Only a
 * clean result replaces the live file; any failure removes the staging file and leaves the live file as it was.
 */
export function restoreBackup(options: RestoreOptions): void {
  if (!existsSync(options.backupPath)) throw new BackupError("BACKUP_NOT_FOUND");
  const stagingPath = `${options.targetPath}.restoring`;
  removeFileSet(stagingPath);
  copyFileSync(options.backupPath, stagingPath);
  try {
    const staged = openDatabase({ filePath: stagingPath });
    try {
      runMigrations(staged);
      const outcome = options.replay(staged, options.ledger.read());
      if (!outcome.complete) throw new BackupError("RESTORE_REPLAY_INCOMPLETE");
      const nowIso = (options.now ?? (() => new Date()))().toISOString();
      const retention = createRetentionStore(staged);
      for (;;) {
        const swept = retention.sweepExpired({ nowIso });
        if (swept.removed.evidence === 0 && swept.removed.technicalLogs === 0 && swept.removed.changeLogs === 0) {
          break;
        }
      }
      const compacted = retention.compact();
      if (!compacted.compacted) throw new BackupError("RESTORE_COMPACT_FAILED");
      if (!isConsistent(staged)) throw new BackupError("RESTORE_CHECK_FAILED");
      staged.sqlite.pragma("wal_checkpoint(TRUNCATE)");
    } finally {
      staged.close();
    }
    removeFileSet(options.targetPath, true);
    renameSync(stagingPath, options.targetPath);
  } catch (error) {
    removeFileSet(stagingPath);
    throw error;
  }
}

function isConsistent(database: VoxwardDatabase): boolean {
  const integrity = database.sqlite.pragma("integrity_check") as { integrity_check: string }[];
  const foreignKeys = database.sqlite.pragma("foreign_key_check") as unknown[];
  return integrity.length === 1 && integrity[0]?.integrity_check === "ok" && foreignKeys.length === 0;
}

/** Removes a database file and its -wal and -shm companions. `companionsOnly` keeps the main file. */
function removeFileSet(path: string, companionsOnly = false): void {
  if (!companionsOnly) rmSync(path, { force: true });
  rmSync(`${path}-wal`, { force: true });
  rmSync(`${path}-shm`, { force: true });
}
