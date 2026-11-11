import type {
  ChangeLogRow,
  DataRequestItemRecord,
  DataRequestPort,
  DataRequestRecord,
  DecisionOutcome,
  DeletionItemState,
  DeletionStartOutcome,
  DeleteMode,
  ExceptionResumeOutcome,
  ExecutionState,
  RequestSource,
  VerificationMethod,
  VerificationState,
} from "@voxward/contracts";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { changeLogs, dataRequestItems, dataRequests, scoreExceptions } from "./schema/index.js";
import { ScoreExceptionStore, SubjectStore } from "./repository.js";
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

    startDeletion(start) {
      return runShortTransaction(database, (tx): DeletionStartOutcome => {
        const row = tx
          .select()
          .from(dataRequests)
          .where(and(eq(dataRequests.id, start.requestId), eq(dataRequests.channelId, start.channelId)))
          .get();
        if (row === undefined) return { status: "NOT_FOUND" };
        if (row.requestKind !== "DELETE") return { status: "NOT_ELIGIBLE", reason: "NOT_DELETE" };
        if (row.verificationState !== "VERIFIED") return { status: "NOT_ELIGIBLE", reason: "NOT_VERIFIED" };
        // A repeated start finds the request already running (or finished) and writes nothing.
        if (row.executionState !== "PENDING") {
          return { status: "ALREADY_STARTED", executionState: row.executionState as ExecutionState };
        }
        if (row.subjectId !== start.subjectId) throw new Error("deletion start names a subject other than the request's");

        // Design §5: the exception first (for DELETE_AND_EXCEPT), then the generation, then the targets. All in this one
        // transaction, so a failure anywhere leaves none of them written.
        let exceptionCreated = false;
        if (start.mode === "DELETE_AND_EXCEPT") {
          if (start.exceptionChange === null) throw new Error("DELETE_AND_EXCEPT needs an exception change row");
          const ensured = ScoreExceptionStore.ensureActive(tx, {
            id: start.exceptionId,
            channelId: start.channelId,
            subjectId: start.subjectId,
            sourceRequestId: start.requestId,
            createdAt: start.at,
          });
          if (ensured.status === "created") {
            exceptionCreated = true;
            writeChange(tx, start.exceptionChange);
          }
        }

        const generation = SubjectStore.bumpGeneration(tx, start.subjectId);
        if (generation === undefined) throw new Error("the subject of the deletion request does not exist");

        for (const target of start.targets) {
          tx.insert(dataRequestItems)
            .values({
              id: target.id,
              requestId: start.requestId,
              targetKind: target.targetKind,
              targetRef: target.targetRef,
              itemState: "PENDING",
              errorCode: null,
              attemptedAt: null,
              completedAt: null,
            })
            .run();
        }

        tx.update(dataRequests)
          .set({ executionState: "RUNNING", updatedAt: start.at })
          .where(eq(dataRequests.id, start.requestId))
          .run();
        writeChange(tx, start.startChange);
        return { status: "STARTED", generation, exceptionCreated };
      });
    },

    markItem(mark) {
      runShortTransaction(database, (tx) => {
        tx.update(dataRequestItems)
          .set({
            itemState: mark.state,
            errorCode: mark.errorCode,
            attemptedAt: mark.at,
            completedAt: mark.state === "DONE" ? mark.at : null,
          })
          .where(
            and(
              eq(dataRequestItems.requestId, mark.requestId),
              eq(dataRequestItems.targetKind, mark.targetKind),
              eq(dataRequestItems.targetRef, mark.targetRef),
            ),
          )
          .run();
      });
    },

    finishExecution(finish) {
      runShortTransaction(database, (tx) => {
        const result = tx
          .update(dataRequests)
          .set({
            executionState: finish.executionState,
            completedAt: finish.executionState === "COMPLETED" ? finish.at : null,
            updatedAt: finish.at,
          })
          .where(and(eq(dataRequests.id, finish.requestId), eq(dataRequests.channelId, finish.channelId)))
          .run();
        if (result.changes !== 1) throw new Error("deletion request not found in the channel");
        writeChange(tx, finish.change);
      });
    },

    resumeException(resume): ExceptionResumeOutcome {
      return runShortTransaction(database, (tx): ExceptionResumeOutcome => {
        const request = tx
          .select()
          .from(dataRequests)
          .where(and(eq(dataRequests.id, resume.requestId), eq(dataRequests.channelId, resume.channelId)))
          .get();
        const eligible =
          request !== undefined &&
          request.requestKind === "RESUME_SCORING" &&
          request.verificationState === "VERIFIED" &&
          request.subjectId === resume.subjectId &&
          request.executionState === "PENDING";
        if (!eligible) return { status: "REQUEST_NOT_ELIGIBLE" };

        const active = tx
          .select({ id: scoreExceptions.id })
          .from(scoreExceptions)
          .where(
            and(
              eq(scoreExceptions.channelId, resume.channelId),
              eq(scoreExceptions.subjectId, resume.subjectId),
              isNull(scoreExceptions.removedAt),
            ),
          )
          .get();
        if (active !== undefined) {
          tx.update(scoreExceptions)
            .set({ removedAt: resume.at, removedReasonCode: "RESUME_REQUESTED" })
            .where(eq(scoreExceptions.id, active.id))
            .run();
        }
        tx.update(dataRequests)
          .set({ executionState: "COMPLETED", completedAt: resume.at, updatedAt: resume.at })
          .where(eq(dataRequests.id, resume.requestId))
          .run();
        writeChange(tx, resume.change);
        return active === undefined ? { status: "NO_ACTIVE_EXCEPTION" } : { status: "RESUMED" };
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
    // The deletion scope is written when the deletion starts. Registration stores an empty scope.
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
