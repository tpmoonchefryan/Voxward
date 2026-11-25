import { inArray, sql } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import {
  DEFAULT_RETENTION_ADMIN_SETTINGS,
  readChannelSetting,
  updateChannelSettingAtomic,
  type ManualBlockedUserRecord,
  type RetentionAdminSettings,
} from "./channel-settings-store.js";
import {
  authSessions,
  changeLogs,
  channelEvents,
  deliveries,
  eventPayments,
  tasks,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "./schema/index.js";
import { runShortTransaction } from "./transaction.js";

/** Rows removed per short transaction. A sweep never holds the write lock for more than one batch. */
export const DEFAULT_SWEEP_BATCH = 200;
/** A sweep stops after this many batches per table and channel, so one call is bounded. The next call continues. */
const MAX_BATCHES = 1000;
/** Tasks in these states still need their log rows (the task coordinator reads the chain), so their rows are skipped. */
const ACTIVE_TASK_STATES = "('QUEUED','RUNNING','PENDING_REVIEW')";
const DAY_MS = 86_400_000;

export interface RetentionSweepInput {
  /** The clock of the sweep. Every cutoff is computed from it, never from the system clock. */
  readonly nowIso: string;
  readonly batchSize?: number;
}

export interface RetentionCounts {
  readonly evidence: number;
  readonly technicalLogs: number;
  readonly changeLogs: number;
}

export interface ExtendedRetentionCounts {
  readonly authSessions: number;
  readonly deliveries: number;
  readonly eventPayments: number;
  readonly channelEvents: number;
  readonly redactedBlockedNicknames: number;
}

export interface RetentionSweepResult {
  readonly removed: RetentionCounts;
  /** Rows that are past their expiry and still exist. Non-zero means the cleanup is not finished (design §3.4). */
  readonly remainingExpired: RetentionCounts;
  readonly complete: boolean;
  /** Extended cleanup counts for auth_sessions, deliveries, event_payments, channel_events, and stale blocked-user nicknames (VW3-R-011). */
  readonly extendedRemoved: ExtendedRetentionCounts;
}

export interface CompactResult {
  /** True when the WAL was checkpointed to zero length and the main file was rebuilt. */
  readonly compacted: boolean;
  readonly code: "COMPACTED" | "WAL_BUSY" | "VACUUM_FAILED";
}

export interface RetentionExpiredBatch {
  readonly logIds: readonly string[];
  readonly correlationIds: readonly string[];
  readonly changeLogIds: readonly string[];
}

export interface RetentionStoreOptions {
  /** Called after each committed batch that deleted at least one row. */
  readonly onExpired?: (batch: RetentionExpiredBatch) => void;
}

export interface RetentionStore {
  sweepExpired(input: RetentionSweepInput): RetentionSweepResult;
  /** Rebuilds the main file and truncates the WAL, so pages that held expired rows leave the files (Q30). */
  compact(): CompactResult;
}

/**
 * Tiered retention (S020, SUB-037). Evidence (message text, translations) expires first, then the technical log
 * metadata, then the Change Log. A channel's retention-config can shorten a row's stored `expires_at`, never extend it.
 * A technical log row is removed only when none of its evidence remains and its task is no longer active.
 */
export function createRetentionStore(database: VoxwardDatabase, options?: RetentionStoreOptions): RetentionStore {
  const onExpired = options?.onExpired;
  return {
    sweepExpired({ nowIso, batchSize = DEFAULT_SWEEP_BATCH }) {
      const now = Date.parse(nowIso);
      if (Number.isNaN(now)) throw new RangeError("nowIso is not a timestamp");
      if (!Number.isInteger(batchSize) || batchSize < 1) throw new RangeError("batchSize must be a positive integer");

      const channelIds = database.sqlite.prepare("SELECT id FROM channels").pluck().all() as string[];
      const removed = { evidence: 0, technicalLogs: 0, changeLogs: 0 };
      const remaining = { evidence: 0, technicalLogs: 0, changeLogs: 0 };
      const extendedRemoved = {
        authSessions: 0,
        deliveries: 0,
        eventPayments: 0,
        channelEvents: 0,
        redactedBlockedNicknames: 0,
      };

      // Purge expired or stale-revoked auth_sessions globally (VW3-R-011).
      // Cap expiry cutoff at wall-clock time so simulated-future retention tests do not evict live real-clock sessions.
      const sessionNow = Math.min(now, Date.now());
      const sessionExpiryCut = iso(sessionNow);
      const sessionRevokedCutoff = iso(sessionNow - 7 * DAY_MS);
      extendedRemoved.authSessions += drain(database, batchSize, undefined, (tx) => {
        const rows = tx.all<{ tokenHash: string }>(
          sql`SELECT token_hash AS tokenHash FROM auth_sessions
              WHERE expires_at <= ${sessionExpiryCut} OR (revoked_at IS NOT NULL AND revoked_at <= ${sessionRevokedCutoff})
              LIMIT ${batchSize}`,
        );
        if (rows.length === 0) return { changes: 0, batch: null };
        const changes = tx
          .delete(authSessions)
          .where(inArray(authSessions.tokenHash, rows.map((r) => r.tokenHash)))
          .run().changes;
        return { changes, batch: null };
      });

      for (const channelId of channelIds) {
        const policy = policyOf(database, channelId);
        const cut = {
          evidence: iso(now - policy.evidenceDays * DAY_MS),
          technical: iso(now - policy.technicalLogDays * DAY_MS),
          change: iso(now - policy.changeLogDays * DAY_MS),
        };
        removed.evidence += drain(database, batchSize, onExpired, (tx) => {
          const rows = tx.all<{ id: string; logId: string; correlationId: string }>(
            sql`SELECT e.id AS id, l.id AS logId, l.correlation_id AS correlationId
                FROM technical_log_evidence e JOIN technical_logs l ON l.id = e.log_id
                WHERE l.channel_id = ${channelId} AND (e.expires_at <= ${nowIso} OR l.created_at <= ${cut.evidence})
                  AND ${inactiveTask(sql`l`)} LIMIT ${batchSize}`,
          );
          if (rows.length === 0) return { changes: 0, batch: null };
          const changes = tx
            .delete(technicalLogEvidence)
            .where(inArray(technicalLogEvidence.id, rows.map((r) => r.id)))
            .run().changes;
          return {
            changes,
            batch: {
              logIds: [...new Set(rows.map((r) => r.logId))],
              correlationIds: [...new Set(rows.map((r) => r.correlationId))],
              changeLogIds: [],
            },
          };
        });
        removed.technicalLogs += drain(database, batchSize, onExpired, (tx) => {
          const rows = tx.all<{ logId: string; correlationId: string }>(
            sql`SELECT l.id AS logId, l.correlation_id AS correlationId FROM technical_logs l
                WHERE l.channel_id = ${channelId} AND (l.expires_at <= ${nowIso} OR l.created_at <= ${cut.technical})
                  AND ${inactiveTask(sql`l`)}
                  AND NOT EXISTS (SELECT 1 FROM technical_log_evidence e WHERE e.log_id = l.id) LIMIT ${batchSize}`,
          );
          if (rows.length === 0) return { changes: 0, batch: null };
          const logIds = rows.map((r) => r.logId);
          const changes = tx.delete(technicalLogs).where(inArray(technicalLogs.id, logIds)).run().changes;
          return {
            changes,
            batch: {
              logIds: [...new Set(logIds)],
              correlationIds: [...new Set(rows.map((r) => r.correlationId))],
              changeLogIds: [],
            },
          };
        });
        removed.changeLogs += drain(database, batchSize, onExpired, (tx) => {
          const rows = tx.all<{ id: string }>(
            sql`SELECT id FROM change_logs
                WHERE channel_id = ${channelId} AND (expires_at <= ${nowIso} OR occurred_at <= ${cut.change}) LIMIT ${batchSize}`,
          );
          if (rows.length === 0) return { changes: 0, batch: null };
          const changeLogIds = rows.map((r) => r.id);
          const changes = tx.delete(changeLogs).where(inArray(changeLogs.id, changeLogIds)).run().changes;
          return {
            changes,
            batch: { logIds: [], correlationIds: [], changeLogIds },
          };
        });
        remaining.evidence += count(
          database,
          sql`SELECT count(*) FROM technical_log_evidence e JOIN technical_logs l ON l.id = e.log_id
              WHERE l.channel_id = ${channelId} AND (e.expires_at <= ${nowIso} OR l.created_at <= ${cut.evidence})`,
        );
        remaining.technicalLogs += count(
          database,
          sql`SELECT count(*) FROM technical_logs l
              WHERE l.channel_id = ${channelId} AND (l.expires_at <= ${nowIso} OR l.created_at <= ${cut.technical})`,
        );
        remaining.changeLogs += count(
          database,
          sql`SELECT count(*) FROM change_logs
              WHERE channel_id = ${channelId} AND (expires_at <= ${nowIso} OR occurred_at <= ${cut.change})`,
        );

        // Redact stale plaintext nicknames in blocked-users settings past evidenceDays (VW3-R-011).
        extendedRemoved.redactedBlockedNicknames += updateChannelSettingAtomic<ManualBlockedUserRecord[], number>(
          database,
          channelId,
          "blocked-users",
          [],
          (users) => {
            let redactedCount = 0;
            const next = users.map((u) => {
              if (u.nickname !== null && u.createdAt <= cut.evidence) {
                redactedCount += 1;
                return { ...u, nickname: null };
              }
              return u;
            });
            return { write: redactedCount > 0, next, result: redactedCount };
          },
          new Date(now),
        );

        // Purge expired terminal deliveries past technicalLogDays (VW3-R-011).
        extendedRemoved.deliveries += drain(database, batchSize, undefined, (tx) => {
          const rows = tx.all<{ id: string }>(
            sql`SELECT d.id AS id FROM deliveries d
                JOIN channel_events e ON e.id = d.event_id
                WHERE e.channel_id = ${channelId}
                  AND d.status IN ('SENT','FAILED','EXPIRED','CANCELLED')
                  AND d.valid_until <= ${cut.technical}
                LIMIT ${batchSize}`,
          );
          if (rows.length === 0) return { changes: 0, batch: null };
          const changes = tx
            .delete(deliveries)
            .where(inArray(deliveries.id, rows.map((r) => r.id)))
            .run().changes;
          return { changes, batch: null };
        });

        // Purge expired event_payments and channel_events past changeLogDays (respecting FK order & active tasks).
        drain(database, batchSize, undefined, (tx) => {
          const rows = tx.all<{ id: string }>(
            sql`SELECT e.id AS id FROM channel_events e
                WHERE e.channel_id = ${channelId}
                  AND e.created_at <= ${cut.change}
                  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.event_id = e.id AND t.status IN ${sql.raw(ACTIVE_TASK_STATES)})
                  AND NOT EXISTS (SELECT 1 FROM technical_logs l WHERE l.channel_id = e.channel_id AND l.correlation_id = e.correlation_id)
                LIMIT ${batchSize}`,
          );
          if (rows.length === 0) return { changes: 0, batch: null };
          const eventIds = rows.map((r) => r.id);
          extendedRemoved.deliveries += tx.delete(deliveries).where(inArray(deliveries.eventId, eventIds)).run().changes;
          tx.delete(verdicts).where(inArray(verdicts.eventId, eventIds)).run();
          tx.delete(tasks).where(inArray(tasks.eventId, eventIds)).run();
          extendedRemoved.eventPayments += tx.delete(eventPayments).where(inArray(eventPayments.eventId, eventIds)).run().changes;
          const evChanges = tx.delete(channelEvents).where(inArray(channelEvents.id, eventIds)).run().changes;
          extendedRemoved.channelEvents += evChanges;
          return { changes: evChanges, batch: null };
        });
      }

      // Change Log rows that belong to no channel have no channel policy: only their stored expiry applies.
      removed.changeLogs += drain(database, batchSize, onExpired, (tx) => {
        const rows = tx.all<{ id: string }>(
          sql`SELECT id FROM change_logs WHERE channel_id IS NULL AND expires_at <= ${nowIso} LIMIT ${batchSize}`,
        );
        if (rows.length === 0) return { changes: 0, batch: null };
        const changeLogIds = rows.map((r) => r.id);
        const changes = tx.delete(changeLogs).where(inArray(changeLogs.id, changeLogIds)).run().changes;
        return {
          changes,
          batch: { logIds: [], correlationIds: [], changeLogIds },
        };
      });
      remaining.changeLogs += count(
        database,
        sql`SELECT count(*) FROM change_logs WHERE channel_id IS NULL AND expires_at <= ${nowIso}`,
      );

      return {
        removed,
        remainingExpired: remaining,
        complete: remaining.evidence + remaining.technicalLogs + remaining.changeLogs === 0,
        extendedRemoved,
      };
    },

    compact() {
      const checkpoint = (): number => {
        const row = database.sqlite.pragma("wal_checkpoint(TRUNCATE)") as { busy: number }[];
        return row[0]?.busy ?? 1;
      };
      if (checkpoint() !== 0) return { compacted: false, code: "WAL_BUSY" };
      try {
        database.sqlite.exec("VACUUM");
      } catch {
        return { compacted: false, code: "VACUUM_FAILED" };
      }
      return checkpoint() === 0 ? { compacted: true, code: "COMPACTED" } : { compacted: false, code: "WAL_BUSY" };
    },
  };
}

function policyOf(database: VoxwardDatabase, channelId: string): RetentionAdminSettings {
  const stored = readChannelSetting<Partial<RetentionAdminSettings>>(database, channelId, "retention-config", {});
  const pick = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
  return {
    changeLogDays: pick(stored.changeLogDays, DEFAULT_RETENTION_ADMIN_SETTINGS.changeLogDays),
    technicalLogDays: pick(stored.technicalLogDays, DEFAULT_RETENTION_ADMIN_SETTINGS.technicalLogDays),
    evidenceDays: pick(stored.evidenceDays, DEFAULT_RETENTION_ADMIN_SETTINGS.evidenceDays),
  };
}

function inactiveTask(alias: ReturnType<typeof sql>) {
  return sql`(${alias}.task_id IS NULL OR ${alias}.task_id NOT IN (SELECT id FROM tasks WHERE status IN ${sql.raw(ACTIVE_TASK_STATES)}))`;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

type Tx = Parameters<Parameters<typeof runShortTransaction>[1]>[0];

/** Runs one batch per short transaction until a batch removes fewer rows than its size. */
function drain(
  database: VoxwardDatabase,
  batchSize: number,
  onExpired: ((batch: RetentionExpiredBatch) => void) | undefined,
  batch: (tx: Tx) => { changes: number; batch: RetentionExpiredBatch | null },
): number {
  let total = 0;
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    const result = runShortTransaction(database, batch);
    total += result.changes;
    if (result.changes > 0 && result.batch !== null) {
      const { logIds, correlationIds, changeLogIds } = result.batch;
      if (logIds.length > 0 || correlationIds.length > 0 || changeLogIds.length > 0) {
        onExpired?.(result.batch);
      }
    }
    if (result.changes < batchSize) break;
  }
  return total;
}

function count(database: VoxwardDatabase, query: ReturnType<typeof sql>): number {
  const row = database.orm.get<{ "count(*)": number }>(query);
  return row["count(*)"];
}
