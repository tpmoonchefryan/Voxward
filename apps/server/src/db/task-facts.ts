import { and, eq } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { channelEvents, subjects } from "./schema/index.js";
import { runShortTransaction } from "./transaction.js";

export interface StoredTaskFacts {
  readonly eventVersion: number;
  readonly processingGeneration: number;
  readonly deleted: boolean;
}

export interface StoredExpectedFacts {
  readonly eventVersion: number;
  readonly processingGeneration: number;
}

export type StoredCommitOutcome =
  | { readonly status: "committed" }
  | { readonly status: "stale"; readonly reason: "DATA_DELETED" | "GENERATION_CHANGED" | "VERSION_SUPERSEDED" | "ALREADY_SETTLED" };

export interface SqliteTaskFactsPort {
  readFacts(key: { readonly channelId: string; readonly platformMessageId: string }): StoredTaskFacts;
  commitIfCurrent(
    key: { readonly channelId: string; readonly platformMessageId: string },
    expected: StoredExpectedFacts,
    apply: () => void,
  ): StoredCommitOutcome;
}

/**
 * SQLite-backed implementation of TaskCoordinator's `TaskFactsPort`.
 * Compares `channel_events.event_version` and `subjects.processing_generation` atomically inside one short transaction.
 */
export function createTaskFactsPort(database: VoxwardDatabase): SqliteTaskFactsPort {
  function readCurrent(
    tx: VoxwardDatabase["orm"],
    key: { readonly channelId: string; readonly platformMessageId: string },
  ): StoredTaskFacts {
    const row = tx
      .select({
        eventVersion: channelEvents.eventVersion,
        processingGeneration: subjects.processingGeneration,
      })
      .from(channelEvents)
      .innerJoin(subjects, eq(subjects.id, channelEvents.subjectId))
      .where(and(eq(channelEvents.channelId, key.channelId), eq(channelEvents.platformMessageRef, key.platformMessageId)))
      .get();
    if (row === undefined) {
      return { eventVersion: 0, processingGeneration: 0, deleted: true };
    }
    return {
      eventVersion: row.eventVersion,
      processingGeneration: row.processingGeneration,
      deleted: false,
    };
  }

  return {
    readFacts(key) {
      return readCurrent(database.orm, key);
    },

    commitIfCurrent(key, expected, apply) {
      return runShortTransaction(database, (tx) => {
        const current = readCurrent(tx, key);
        if (current.deleted) return { status: "stale", reason: "DATA_DELETED" };
        if (current.processingGeneration !== expected.processingGeneration) {
          return { status: "stale", reason: "GENERATION_CHANGED" };
        }
        if (current.eventVersion !== expected.eventVersion) {
          return { status: "stale", reason: "VERSION_SUPERSEDED" };
        }
        apply();
        return { status: "committed" };
      });
    },
  };
}
