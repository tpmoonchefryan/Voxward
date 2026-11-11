import type {
  ChangeLogRow,
  DataRequestItemRecord,
  DataRequestPort,
  DataRequestRecord,
  DeletionItemState,
  DecisionOutcome,
  DeleteMode,
  ExecutionState,
  RequestSource,
  VerificationMethod,
  VerificationState,
} from "@voxward/contracts";
import { and, asc, desc, eq } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { changeLogs, dataRequestItems, dataRequests } from "./schema/index.js";
import { runShortTransaction, type ShortTransaction } from "./transaction.js";

type RequestRow = typeof dataRequests.$inferSelect;
type ItemRow = typeof dataRequestItems.$inferSelect;

/**
 * Database implementation of DataRequestPort. Each write is one short synchronous transaction, and the Change Log row
 * is written in the same transaction as the request it describes. Enumeration columns hold only values their CHECK
 * constraints allow, so the casts on read are safe.
 */
export function createDataRequestPort(database: VoxwardDatabase): DataRequestPort {
  return {
    insertRequest(record, change) {
      runShortTransaction(database, (tx) => {
        tx.insert(dataRequests).values(toRequestValues(record)).run();
        writeChange(tx, change);
      });
    },

    decideVerification(update, change) {
      return runShortTransaction(database, (tx): DecisionOutcome => {
        const current = tx
          .select({ channelId: dataRequests.channelId })
          .from(dataRequests)
          .where(eq(dataRequests.id, update.requestId))
          .get();
        if (current === undefined || current.channelId !== update.channelId) return "NOT_FOUND";

        // The condition repeats the PENDING check, so two writers cannot both decide the same request.
        const result = tx
          .update(dataRequests)
          .set({
            verificationState: update.verificationState,
            verificationMethod: update.verificationMethod,
            verifiedAt: update.verificationState === "VERIFIED" ? update.decidedAt : null,
            executionState: update.executionState,
            handledByRef: update.handledByRef,
            updatedAt: update.decidedAt,
          })
          .where(
            and(
              eq(dataRequests.id, update.requestId),
              eq(dataRequests.channelId, update.channelId),
              eq(dataRequests.verificationState, "PENDING"),
            ),
          )
          .run();
        if (result.changes !== 1) return "ALREADY_DECIDED";
        writeChange(tx, change);
        return "DECIDED";
      });
    },

    readRequest(channelId, requestId) {
      const row = database.orm
        .select()
        .from(dataRequests)
        .where(and(eq(dataRequests.id, requestId), eq(dataRequests.channelId, channelId)))
        .get();
      return row === undefined ? undefined : toRequestRecord(row);
    },

    listRequests(channelId, subjectId) {
      return database.orm
        .select()
        .from(dataRequests)
        .where(and(eq(dataRequests.channelId, channelId), eq(dataRequests.subjectId, subjectId)))
        .orderBy(desc(dataRequests.createdAt), desc(dataRequests.id))
        .all()
        .map(toRequestRecord);
    },

    readItems(requestId) {
      return database.orm
        .select()
        .from(dataRequestItems)
        .where(eq(dataRequestItems.requestId, requestId))
        .orderBy(asc(dataRequestItems.id))
        .all()
        .map(toItemRecord);
    },
  };
}

function writeChange(tx: ShortTransaction, change: ChangeLogRow): void {
  tx.insert(changeLogs).values(change).run();
}

function toRequestValues(record: DataRequestRecord) {
  return {
    id: record.id,
    channelId: record.channelId,
    subjectId: record.subjectId,
    requestKind: record.kind,
    requestSource: record.requestSource,
    verificationState: record.verificationState,
    verificationMethod: record.verificationMethod,
    mode: record.mode,
    executionState: record.executionState,
    // Deletion targets are added by the execution path (STORY-019). Registration stores an empty scope.
    scopeJson: "{}",
    createdAt: record.createdAt,
    verifiedAt: record.verifiedAt,
    completedAt: record.completedAt,
    updatedAt: record.updatedAt,
    handledByRef: record.handledByRef,
  };
}

function toRequestRecord(row: RequestRow): DataRequestRecord {
  if (row.subjectId === null) throw new Error("data request has no subject; the schema should prevent this");
  return {
    id: row.id,
    channelId: row.channelId,
    subjectId: row.subjectId,
    kind: row.requestKind as DataRequestRecord["kind"],
    mode: row.mode as DeleteMode | null,
    requestSource: row.requestSource as RequestSource,
    verificationState: row.verificationState as VerificationState,
    verificationMethod: row.verificationMethod as VerificationMethod | null,
    executionState: row.executionState as ExecutionState,
    createdAt: row.createdAt,
    verifiedAt: row.verifiedAt,
    completedAt: row.completedAt,
    updatedAt: row.updatedAt,
    handledByRef: row.handledByRef,
  };
}

function toItemRecord(row: ItemRow): DataRequestItemRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    targetKind: row.targetKind,
    targetRef: row.targetRef,
    itemState: row.itemState as DeletionItemState,
    errorCode: row.errorCode,
    attemptedAt: row.attemptedAt,
    completedAt: row.completedAt,
  };
}

