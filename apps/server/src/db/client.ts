import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.js";

export type VoxwardOrm = BetterSQLite3Database<typeof schema>;

export interface VoxwardDatabase {
  readonly filePath: string;
  readonly sqlite: Database.Database;
  readonly orm: VoxwardOrm;
  close(): void;
}

export interface OpenDatabaseOptions {
  readonly filePath: string;
  /** Milliseconds a connection waits for a lock before it fails with SQLITE_BUSY. */
  readonly busyTimeoutMs?: number;
}

export const DEFAULT_BUSY_TIMEOUT_MS = 5000;

export class DatabaseSetupError extends Error {
  readonly code: "WAL_UNAVAILABLE";

  constructor(message: string, code: "WAL_UNAVAILABLE") {
    super(message);
    this.name = "DatabaseSetupError";
    this.code = code;
  }
}

/**
 * Opens the SQLite file in WAL mode. The open fails when WAL cannot be enabled, so the service never runs
 * on a journal mode it did not choose. Foreign keys are enforced on every connection.
 */
export function openDatabase({ filePath, busyTimeoutMs = DEFAULT_BUSY_TIMEOUT_MS }: OpenDatabaseOptions): VoxwardDatabase {
  const sqlite = new Database(filePath, { timeout: busyTimeoutMs });
  try {
    const journalMode = sqlite.pragma("journal_mode = WAL", { simple: true });
    if (journalMode !== "wal") {
      throw new DatabaseSetupError(`journal_mode is "${String(journalMode)}"; WAL is required`, "WAL_UNAVAILABLE");
    }
    // Durability over throughput. The choice is recorded in the spec; the trade-off has not been measured.
    sqlite.pragma("synchronous = FULL");
    sqlite.pragma("foreign_keys = ON");
  } catch (error) {
    sqlite.close();
    throw error;
  }

  return {
    filePath,
    sqlite,
    orm: drizzle(sqlite, { schema }),
    close: () => sqlite.close(),
  };
}
