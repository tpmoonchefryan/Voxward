import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, writeSync } from "node:fs";
import { join } from "node:path";

export const TOMBSTONE_FILE = "tombstones.jsonl";

/** What a restore needs to repeat a deletion. It holds ids and a mode, never content. */
export type TombstoneEntry =
  | {
      readonly kind: "DELETE";
      readonly requestId: string;
      readonly channelId: string;
      readonly subjectId: string;
      readonly mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT";
      readonly at: string;
    }
  | {
      /** The cleanup of the request finished. Only after this can the DELETE entry age out of the ledger. */
      readonly kind: "DONE" | "RESUME";
      readonly requestId: string;
      readonly channelId: string;
      readonly subjectId: string;
      readonly at: string;
    };

export class TombstoneLedgerError extends Error {
  readonly code: "LEDGER_UNREADABLE" | "LEDGER_WRITE_FAILED";

  constructor(code: "LEDGER_UNREADABLE" | "LEDGER_WRITE_FAILED") {
    super(code);
    this.name = "TombstoneLedgerError";
    this.code = code;
  }
}

export interface TombstoneLedger {
  /** Appends and flushes one entry. A repeated (kind, requestId) is not written twice. Throws when it cannot persist. */
  record(entry: TombstoneEntry): void;
  /** Every entry in write order. A malformed line is an error: a ledger that cannot be read must not be skipped. */
  read(): readonly TombstoneEntry[];
  /**
   * Drops the entries that no remaining backup can need: a DELETE whose DONE is at or before `cutoffIso` (the creation
   * time of the oldest remaining backup), its DONE, and RESUME entries of subjects left without a DELETE. A DELETE
   * without DONE is never dropped. Returns how many entries were dropped.
   */
  pruneBefore(cutoffIso: string): number;
}

/**
 * The tombstone ledger (S020, design §5). It lives in its own directory, outside the database and the backups, so a
 * restored snapshot never rolls it back. Append-only while running; `pruneBefore` rewrites it through a temporary file.
 */
export function createTombstoneLedger(directory: string): TombstoneLedger {
  const filePath = join(directory, TOMBSTONE_FILE);

  function read(): readonly TombstoneEntry[] {
    if (!existsSync(filePath)) return [];
    try {
      return readFileSync(filePath, "utf8")
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => parseEntry(JSON.parse(line) as unknown));
    } catch {
      throw new TombstoneLedgerError("LEDGER_UNREADABLE");
    }
  }

  return {
    read,
    record(entry) {
      try {
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        if (read().some((known) => known.kind === entry.kind && known.requestId === entry.requestId)) return;
        const descriptor = openSync(filePath, "a", 0o600);
        try {
          writeSync(descriptor, `${JSON.stringify(entry)}\n`);
          fsyncSync(descriptor);
        } finally {
          closeSync(descriptor);
        }
      } catch (error) {
        if (error instanceof TombstoneLedgerError) throw error;
        throw new TombstoneLedgerError("LEDGER_WRITE_FAILED");
      }
    },
    pruneBefore(cutoffIso) {
      const entries = read();
      const finished = new Set(
        entries.filter((entry) => entry.kind === "DONE" && entry.at <= cutoffIso).map((entry) => entry.requestId),
      );
      const afterDelete = entries.filter((entry) => !(entry.kind !== "RESUME" && finished.has(entry.requestId)));
      const live = new Set(afterDelete.filter((entry) => entry.kind === "DELETE").map((entry) => entry.subjectId));
      const kept = afterDelete.filter((entry) => entry.kind !== "RESUME" || live.has(entry.subjectId));
      if (kept.length === entries.length) return 0;
      const temporary = `${filePath}.tmp`;
      writeFileSync(temporary, kept.map((entry) => `${JSON.stringify(entry)}\n`).join(""), { mode: 0o600 });
      renameSync(temporary, filePath);
      return entries.length - kept.length;
    },
  };
}

function parseEntry(value: unknown): TombstoneEntry {
  const row = value as Record<string, unknown>;
  const text = (key: string): string => {
    const field = row[key];
    if (typeof field !== "string" || field.length === 0) throw new Error("bad entry");
    return field;
  };
  const base = { requestId: text("requestId"), channelId: text("channelId"), subjectId: text("subjectId"), at: text("at") };
  if (row.kind === "RESUME" || row.kind === "DONE") return { kind: row.kind, ...base };
  if (row.kind === "DELETE" && (row.mode === "DELETE_DATA_ONLY" || row.mode === "DELETE_AND_EXCEPT")) {
    return { kind: "DELETE", ...base, mode: row.mode };
  }
  throw new Error("bad entry");
}

/** The shape the data lifecycle module records. Validated into a ledger entry here, so the ledger never holds a bad line. */
export function ledgerRecorder(ledger: TombstoneLedger): { record(entry: { readonly kind: string; readonly requestId: string; readonly channelId: string; readonly subjectId: string; readonly mode?: string; readonly at: string }): void } {
  return { record: (entry) => ledger.record(parseEntry(entry)) };
}
