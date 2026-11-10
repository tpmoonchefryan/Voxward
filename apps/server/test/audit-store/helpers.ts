import type { AuditLogPort, EvidenceRow, TechnicalLogRow } from "@voxward/contracts";
import { createAuditLogPort } from "../../src/db/audit-log.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { channels } from "../../src/db/schema/index.js";
import { ChannelEventStore, SubjectStore, TaskStore } from "../../src/db/repository.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { createAuditStore, type AuditService } from "../../src/modules/audit-store/index.js";
import { redactText } from "../../src/security/redaction.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

/** Fixed clock for every test, so expiry and timestamp assertions are exact. */
export const NOW = new Date("2026-11-10T10:00:00.000Z");
export const CHANNEL_ID = "channel-audit";
export const SUBJECT_A = "subject-a";
export const SUBJECT_B = "subject-b";

export interface Fixture {
  readonly database: VoxwardDatabase;
  readonly port: AuditLogPort;
  readonly service: AuditService;
  readonly close: () => void;
}

/**
 * One channel with two subjects, a real database in $KIROCREW_SCRATCH, the real redactText, and a counter for ids.
 * Every value is synthetic.
 */
export function openFixture(prefix: string): Fixture {
  const directory = scratchDirectory(prefix);
  const database = migratedDatabase(directory);
  runShortTransaction(database, (tx) => {
    tx.insert(channels)
      .values({
        id: CHANNEL_ID,
        platform: "youtube",
        platformChannelRef: "UC-synthetic-audit",
        displayName: "synthetic channel",
        createdAt: T0,
        updatedAt: T0,
      })
      .run();
    SubjectStore.create(tx, { id: SUBJECT_A, channelId: CHANNEL_ID, platformSubjectKey: "synthetic-subject-a", createdAt: T0 });
    SubjectStore.create(tx, { id: SUBJECT_B, channelId: CHANNEL_ID, platformSubjectKey: "synthetic-subject-b", createdAt: T0 });
  });
  let counter = 0;
  const port = createAuditLogPort(database);
  const service = createAuditStore({
    port,
    sanitize: redactText,
    newId: () => `id-${++counter}`,
    clock: () => NOW,
  });
  return {
    database,
    port,
    service,
    close: () => {
      database.close();
      removeDirectory(directory);
    },
  };
}

/** Creates a channel event for one synthetic message, plus its processing task. Returns the task id. */
export function createTask(fixture: Fixture, messageRef: string, subjectId: string): string {
  const eventId = `event-${messageRef}`;
  runShortTransaction(fixture.database, (tx) =>
    ChannelEventStore.recordIfNew(tx, {
      id: eventId,
      channelId: CHANNEL_ID,
      subjectId,
      platformMessageRef: messageRef,
      platformOrder: 1,
      receivedAt: T0,
      correlationId: `corr-${messageRef}`,
      exceptionMarked: false,
      createdAt: T0,
    }),
  );
  const taskId = `task-${messageRef}`;
  runShortTransaction(fixture.database, (tx) =>
    TaskStore.create(tx, { id: taskId, eventId, kind: "REALTIME_REVIEW", deadlineAt: T0, createdAt: T0 }),
  );
  return taskId;
}

/** Counts rows that match a SQL condition. Used to check what a write did or did not store. */
export function countWhere(database: VoxwardDatabase, table: string, condition: string, params: unknown[] = []): number {
  const row = database.sqlite.prepare(`select count(*) as n from ${table} where ${condition}`).get(...params) as { n: number };
  return row.n;
}

/** A recording port that stores nothing. Lets a test check that a refused write never reaches storage. */
export function recordingPort(): AuditLogPort & { readonly calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    insertChangeLog: () => {
      calls.push("insertChangeLog");
    },
    insertTechnicalLog: (_row: TechnicalLogRow, _evidence: readonly EvidenceRow[]) => {
      calls.push("insertTechnicalLog");
      return { sequence: 0 };
    },
    readChain: () => [],
    readChangeLogs: () => [],
    locateSubjectLogs: () => ({ logIds: [], correlationIds: [], evidenceIds: [], changeLogIds: [] }),
    removeSubjectLogs: () => ({ logIds: [], correlationIds: [], evidenceIds: [], changeLogIds: [] }),
  };
}

/** A module on top of a recording port, with the same clock, sanitizer and id counter as the fixture. */
export function serviceOn(port: AuditLogPort): AuditService {
  let counter = 0;
  return createAuditStore({ port, sanitize: redactText, newId: () => `probe-${++counter}`, clock: () => NOW });
}
