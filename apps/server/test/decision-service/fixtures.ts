import { CONTRACT_VERSION, type DecisionActor, type DecisionService } from "@voxward/contracts";
import { and, eq } from "drizzle-orm";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { createDecisionStorePort } from "../../src/db/decision-store.js";
import { ChannelEventStore, SubjectStore, TaskStore } from "../../src/db/repository.js";
import { channels, subjects } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { createDecisionService } from "../../src/modules/decision-service/index.js";
import { DEFAULT_DECISION_LIMITS, type DecisionDeps } from "../../src/modules/decision-service/service.js";
import { createScoringPlanner } from "../../src/modules/scoring-engine/index.js";
import { ENABLED } from "../scoring-engine/ledger/helpers.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

/** Synthetic times. The decision is made ten seconds after the message was received. */
export const DECIDED_AT = "2026-11-10T10:00:10.000Z";
export const DEADLINE = "2026-11-10T10:05:00.000Z";
export const CHANGE_EXPIRES_AT = "2026-12-10T10:00:00.000Z";

export interface OpenDatabase {
  readonly database: VoxwardDatabase;
  close(): void;
}

/** A fresh migrated database in a scratch directory. The directory is removed when the test closes it. */
export function openDecisionDatabase(prefix: string): OpenDatabase {
  const directory = scratchDirectory(prefix);
  const database = migratedDatabase(directory);
  return {
    database,
    close() {
      database.close();
      removeDirectory(directory);
    },
  };
}

export function seedChannel(database: VoxwardDatabase, channelId: string): void {
  runShortTransaction(database, (tx) => {
    tx.insert(channels)
      .values({ id: channelId, platform: "youtube", platformChannelRef: `UC-${channelId}`, displayName: channelId, createdAt: T0, updatedAt: T0 })
      .run();
  });
}

export interface TaskSeed {
  readonly channelId: string;
  readonly subjectKey: string;
  readonly subjectId: string;
  readonly eventId: string;
  readonly platformMessageRef: string;
  readonly taskId: string;
  readonly platformOrder?: number;
}

/** One open task for one event. The subject is created on first use and keeps its score row. */
export function seedOpenTask(database: VoxwardDatabase, seed: TaskSeed): void {
  runShortTransaction(database, (tx) => {
    const existing = tx
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.channelId, seed.channelId), eq(subjects.platformSubjectKey, seed.subjectKey)))
      .get();
    const subjectId = existing?.id ?? seed.subjectId;
    if (existing === undefined) {
      SubjectStore.create(tx, { id: subjectId, channelId: seed.channelId, platformSubjectKey: seed.subjectKey, createdAt: T0 });
    }
    ChannelEventStore.recordIfNew(tx, {
      id: seed.eventId,
      channelId: seed.channelId,
      subjectId,
      platformMessageRef: seed.platformMessageRef,
      platformOrder: seed.platformOrder ?? 1,
      receivedAt: T0,
      correlationId: `corr-${seed.eventId}`,
      exceptionMarked: false,
      createdAt: T0,
    });
    TaskStore.create(tx, { id: seed.taskId, eventId: seed.eventId, kind: "REALTIME_REVIEW", deadlineAt: DEADLINE, createdAt: T0 });
  });
}

/**
 * The decision dependencies over a real database. The clock is fixed, and identifiers come from one counter, so the tests
 * can read them back.
 */
export function decisionDeps(database: VoxwardDatabase, options: { now?: string } = {}): DecisionDeps {
  let sequence = 0;
  const newId = () => `id-${++sequence}`;
  return {
    store: createDecisionStorePort(database, {
      planner: createScoringPlanner(ENABLED),
      newId,
      changeLogExpiresAt: () => CHANGE_EXPIRES_AT,
    }),
    newId,
    now: () => new Date(options.now ?? DECIDED_AT),
    limits: DEFAULT_DECISION_LIMITS,
  };
}

export function decisionService(database: VoxwardDatabase, options: { now?: string } = {}): DecisionService {
  return createDecisionService(decisionDeps(database, options));
}

export function actor(accountRef: string, capabilities: readonly string[], channelId = "channel-a"): DecisionActor {
  return { contractVersion: CONTRACT_VERSION, accountRef, channelId, capabilities: new Set(capabilities) };
}

/** A moderator: may review and decide, and may edit lists. */
export function moderator(accountRef: string, channelId = "channel-a"): DecisionActor {
  return actor(accountRef, ["review.decide", "list.edit", "queue.read"], channelId);
}

/** A data administrator: may handle data, but not decide or edit lists. */
export function dataAdmin(accountRef: string, channelId = "channel-a"): DecisionActor {
  return actor(accountRef, ["subject.evidence", "data.handle"], channelId);
}

export function scoreOf(database: VoxwardDatabase, channelId: string, subjectKey: string): number | undefined {
  const row = database.sqlite
    .prepare(
      `SELECT s.current_score AS score FROM subject_scores s
       JOIN subjects j ON j.id = s.subject_id
       WHERE j.channel_id = ? AND j.platform_subject_key = ?`,
    )
    .get(channelId, subjectKey) as { score: number } | undefined;
  return row?.score;
}

export function countWhere(database: VoxwardDatabase, sql: string, params: readonly unknown[] = []): number {
  return (database.sqlite.prepare(sql).get(...params) as { n: number }).n;
}
