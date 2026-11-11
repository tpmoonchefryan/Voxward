import type {
  ActorKind,
  AuditLogPort,
  ChangeKind,
  ChangeLogRow,
  ChangeOutcome,
  EvidenceKind,
  EvidenceRow,
  StoredTechnicalLog,
  StoredTechnicalLogRow,
  SubjectLogScope,
  TechnicalData,
  TechnicalLevel,
  TechnicalLogRow,
  TechnicalStage,
  TechnicalStatus,
} from "@voxward/contracts";
import { and, asc, desc, eq, gt, inArray, max, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import type { VoxwardDatabase, VoxwardOrm } from "./client.js";
import { changeLogs, subjects, technicalLogEvidence, technicalLogs } from "./schema/index.js";
import { runShortTransaction, type ShortTransaction } from "./transaction.js";

/** A write names a subject that belongs to another channel than the log row. Nothing is written. */
export class AuditScopeError extends Error {
  readonly code = "AUDIT_SCOPE_MISMATCH";

  constructor() {
    super("subject belongs to another channel");
    this.name = "AuditScopeError";
  }
}

/**
 * Database implementation of AuditLogPort. Each write is one short synchronous transaction. Reads are plain queries,
 * as the S002 design sets out. The one exception is the deletion, which runs its reads and writes in one transaction.
 */
export function createAuditLogPort(database: VoxwardDatabase): AuditLogPort {
  return {
    insertChangeLog(row) {
      runShortTransaction(database, (tx) => {
        tx.insert(changeLogs).values(row).run();
      });
    },

    insertTechnicalLog(row, evidence) {
      return runShortTransaction(database, (tx) => {
        assertSubjectInChannel(tx, row);
        const sequence = nextSequence(tx, row.channelId, row.correlationId);
        tx.insert(technicalLogs).values({ ...toTechnicalLogValues(row), sequence }).run();
        for (const item of evidence) {
          tx.insert(technicalLogEvidence).values(toEvidenceValues(row.id, item)).run();
        }
        return { sequence };
      });
    },

    readChain(correlationId, channelIds) {
      if (channelIds.length === 0) return [];
      const rows = database.orm
        .select()
        .from(technicalLogs)
        .where(and(eq(technicalLogs.correlationId, correlationId), inArray(technicalLogs.channelId, [...channelIds])))
        .orderBy(asc(technicalLogs.sequence))
        .all();
      return attachEvidence(database.orm, rows);
    },

    readChangeLogs(correlationId, channelIds) {
      if (channelIds.length === 0) return [];
      return database.orm
        .select()
        .from(changeLogs)
        .where(and(eq(changeLogs.correlationId, correlationId), inArray(changeLogs.channelId, [...channelIds])))
        .orderBy(asc(changeLogs.occurredAt))
        .all()
        .map(toChangeLogRow);
    },

    pageChangeLogs(channelId, query) {
      const conditions: SQL[] = [eq(changeLogs.channelId, channelId), gt(changeLogs.expiresAt, query.notExpiredAt)];
      if (query.correlationId !== null) conditions.push(eq(changeLogs.correlationId, query.correlationId));
      if (query.after !== null) {
        conditions.push(keysetBefore(changeLogs.occurredAt, changeLogs.id, query.after.occurredAt, query.after.id));
      }
      return database.orm
        .select()
        .from(changeLogs)
        .where(and(...conditions))
        .orderBy(desc(changeLogs.occurredAt), desc(changeLogs.id))
        .limit(query.limit)
        .all()
        .map(toChangeLogRow);
    },

    pageTechnicalLogs(channelId, query) {
      const conditions: SQL[] = [eq(technicalLogs.channelId, channelId), gt(technicalLogs.expiresAt, query.notExpiredAt)];
      if (query.after !== null) {
        conditions.push(keysetBefore(technicalLogs.createdAt, technicalLogs.id, query.after.createdAt, query.after.id));
      }
      return database.orm
        .select()
        .from(technicalLogs)
        .where(and(...conditions))
        .orderBy(desc(technicalLogs.createdAt), desc(technicalLogs.id))
        .limit(query.limit)
        .all()
        .map(toStoredRow);
    },

    readTechnicalLog(channelId, logId, notExpiredAt) {
      const row = database.orm
        .select()
        .from(technicalLogs)
        .where(
          and(
            eq(technicalLogs.id, logId),
            eq(technicalLogs.channelId, channelId),
            gt(technicalLogs.expiresAt, notExpiredAt),
          ),
        )
        .get();
      if (row === undefined) return undefined;
      return attachEvidence(database.orm, [row])[0];
    },

    pageChain(channelId, correlationId, query) {
      const conditions: SQL[] = [
        eq(technicalLogs.channelId, channelId),
        eq(technicalLogs.correlationId, correlationId),
        gt(technicalLogs.expiresAt, query.notExpiredAt),
      ];
      if (query.afterSequence !== null) conditions.push(gt(technicalLogs.sequence, query.afterSequence));
      return database.orm
        .select()
        .from(technicalLogs)
        .where(and(...conditions))
        .orderBy(asc(technicalLogs.sequence))
        .limit(query.limit)
        .all()
        .map(toStoredRow);
    },

    locateSubjectLogs(subjectId) {
      return locateScope(database.orm, subjectId);
    },

    removeSubjectLogs(subjectId, certificateSummary) {
      return runShortTransaction(database, (tx) => {
        const scope = locateScope(tx, subjectId);
        if (scope.logIds.length > 0) {
          tx.delete(technicalLogEvidence).where(inArray(technicalLogEvidence.logId, [...scope.logIds])).run();
          tx.delete(technicalLogs).where(inArray(technicalLogs.id, [...scope.logIds])).run();
        }
        if (scope.changeLogIds.length > 0) {
          tx.update(changeLogs)
            .set({ summary: certificateSummary })
            .where(inArray(changeLogs.id, [...scope.changeLogIds]))
            .run();
        }
        return scope;
      });
    },
  };
}

/**
 * Rows that come after a keyset position in (time DESC, id DESC) order. The values are bound as parameters. The
 * column names are fixed by the schema.
 */
function keysetBefore(time: SQLWrapper, id: SQLWrapper, timeValue: string, idValue: string): SQL {
  return sql`(${time} < ${timeValue} or (${time} = ${timeValue} and ${id} < ${idValue}))`;
}

function assertSubjectInChannel(tx: ShortTransaction, row: TechnicalLogRow): void {
  if (row.subjectId === null) return;
  const subject = tx
    .select({ channelId: subjects.channelId })
    .from(subjects)
    .where(eq(subjects.id, row.subjectId))
    .get();
  if (subject === undefined || subject.channelId !== row.channelId) throw new AuditScopeError();
}

/** The next position in the chain, counted from 0. The unique index on (channel, correlation, sequence) backs this. */
function nextSequence(tx: ShortTransaction, channelId: string, correlationId: string): number {
  const top = tx
    .select({ top: max(technicalLogs.sequence) })
    .from(technicalLogs)
    .where(and(eq(technicalLogs.channelId, channelId), eq(technicalLogs.correlationId, correlationId)))
    .get();
  return top?.top === null || top?.top === undefined ? 0 : top.top + 1;
}

function toTechnicalLogValues(row: TechnicalLogRow) {
  return {
    id: row.id,
    channelId: row.channelId,
    correlationId: row.correlationId,
    batchId: row.batchId,
    taskId: row.taskId,
    attempt: row.attempt,
    level: row.level,
    dataJson: row.data === null ? null : JSON.stringify(row.data),
    stage: row.stage,
    status: row.status,
    errorCode: row.errorCode,
    providerRef: row.providerRef,
    modelRef: row.modelRef,
    ruleTemplateVersion: row.ruleTemplateVersion,
    latencyMs: row.latencyMs,
    subjectId: row.subjectId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

function toEvidenceValues(logId: string, item: EvidenceRow) {
  return {
    id: item.id,
    logId,
    evidenceKind: item.kind,
    payload: item.payload,
    payloadBytes: new TextEncoder().encode(item.payload).byteLength,
    expiresAt: item.expiresAt,
  };
}

type TechnicalLogRecord = typeof technicalLogs.$inferSelect;
type EvidenceRecord = typeof technicalLogEvidence.$inferSelect;
type ChangeLogRecord = typeof changeLogs.$inferSelect;

/** Enumeration columns hold only values that their CHECK constraints allow, so the casts are safe. */
function toStoredRow(row: TechnicalLogRecord): StoredTechnicalLogRow {
  return {
    id: row.id,
    channelId: row.channelId,
    correlationId: row.correlationId,
    sequence: row.sequence,
    batchId: row.batchId,
    taskId: row.taskId,
    attempt: row.attempt,
    level: row.level as TechnicalLevel,
    stage: row.stage as TechnicalStage,
    status: row.status as TechnicalStatus,
    errorCode: row.errorCode,
    providerRef: row.providerRef,
    modelRef: row.modelRef,
    ruleTemplateVersion: row.ruleTemplateVersion,
    latencyMs: row.latencyMs,
    subjectId: row.subjectId,
    data: row.dataJson === null ? null : (JSON.parse(row.dataJson) as TechnicalData),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

function toEvidenceRow(row: EvidenceRecord): EvidenceRow {
  return { id: row.id, kind: row.evidenceKind as EvidenceKind, payload: row.payload, expiresAt: row.expiresAt };
}

function toChangeLogRow(row: ChangeLogRecord): ChangeLogRow {
  return {
    id: row.id,
    channelId: row.channelId,
    occurredAt: row.occurredAt,
    actorKind: row.actorKind as ActorKind,
    actorRef: row.actorRef,
    changeKind: row.changeKind as ChangeKind,
    summary: row.summary,
    outcome: row.outcome as ChangeOutcome,
    correlationId: row.correlationId,
    expiresAt: row.expiresAt,
  };
}

function attachEvidence(orm: VoxwardOrm, rows: readonly TechnicalLogRecord[]): readonly StoredTechnicalLog[] {
  if (rows.length === 0) return [];
  const evidence = orm
    .select()
    .from(technicalLogEvidence)
    .where(inArray(technicalLogEvidence.logId, rows.map((row) => row.id)))
    .all();
  return rows.map((row) => ({
    log: toStoredRow(row),
    evidence: evidence.filter((item) => item.logId === row.id).map(toEvidenceRow),
  }));
}

/** Where one subject's controlled content sits. Works on the database or inside a transaction. */
function locateScope(db: Pick<VoxwardOrm, "select">, subjectId: string): SubjectLogScope {
  const logs = db
    .select({ id: technicalLogs.id, correlationId: technicalLogs.correlationId })
    .from(technicalLogs)
    .where(eq(technicalLogs.subjectId, subjectId))
    .all();
  const logIds = logs.map((log) => log.id);
  const correlationIds = [...new Set(logs.map((log) => log.correlationId))];
  const evidenceIds =
    logIds.length === 0
      ? []
      : db
          .select({ id: technicalLogEvidence.id })
          .from(technicalLogEvidence)
          .where(inArray(technicalLogEvidence.logId, logIds))
          .all()
          .map((row) => row.id);
  const changeLogIds =
    correlationIds.length === 0
      ? []
      : db
          .select({ id: changeLogs.id })
          .from(changeLogs)
          .where(inArray(changeLogs.correlationId, correlationIds))
          .all()
          .map((row) => row.id);
  return { logIds, correlationIds, evidenceIds, changeLogIds };
}
