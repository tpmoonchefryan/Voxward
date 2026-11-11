import type { CleanupFacts, CleanSurfaceInput, SubjectCleanupPort } from "@voxward/contracts";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createAuditLogPort } from "./audit-log.js";
import type { VoxwardDatabase } from "./client.js";
import {
  channelEvents,
  deliveries,
  scoreLedger,
  scoreOutcomes,
  subjectIdentities,
  subjectNicknameChanges,
  subjectScores,
  subjects,
  tasks,
  verdicts,
} from "./schema/index.js";
import { runShortTransaction, type ShortTransaction } from "./transaction.js";

/**
 * Database implementation of SubjectCleanupPort (S019, SUB-036). Each surface is one short transaction and is idempotent.
 * The subject row and the scoring-exception marker stay (design §6). Their rows are the foreign-key anchors of the
 * deletion record, and the marker is the exception that the deletion must keep.
 */
export function createSubjectCleanupPort(database: VoxwardDatabase): SubjectCleanupPort {
  return {
    readCleanupFacts(channelId, subjectId): CleanupFacts | undefined {
      const subject = database.orm
        .select({ platformSubjectKey: subjects.platformSubjectKey })
        .from(subjects)
        .where(and(eq(subjects.id, subjectId), eq(subjects.channelId, channelId)))
        .get();
      if (subject === undefined) return undefined;
      const scope = createAuditLogPort(database).locateSubjectLogs(subjectId);
      return { platformSubjectKey: subject.platformSubjectKey, correlationIds: [...scope.correlationIds].sort() };
    },

    cleanSurface(input) {
      return runShortTransaction(database, (tx) => cleanOne(tx, input));
    },
  };
}

function cleanOne(tx: ShortTransaction, input: CleanSurfaceInput): number {
  switch (input.targetKind) {
    case "SCORE_OUTCOME":
      return tx.delete(scoreOutcomes).where(eq(scoreOutcomes.subjectId, input.subjectId)).run().changes;
    case "SCORE_LEDGER":
      return tx.delete(scoreLedger).where(eq(scoreLedger.subjectId, input.subjectId)).run().changes;
    case "SUBJECT_IDENTITY":
      return tx.delete(subjectIdentities).where(eq(subjectIdentities.subjectId, input.subjectId)).run().changes;
    case "NICKNAME_CHANGE":
      return tx.delete(subjectNicknameChanges).where(eq(subjectNicknameChanges.subjectId, input.subjectId)).run().changes;
    case "SUBJECT_SCORE":
      return resetScore(tx, input);
    case "DELIVERY":
      return deleteForEvents(tx, input, (eventIds) =>
        tx.delete(deliveries).where(inArray(deliveries.eventId, eventIds)).run().changes,
      );
    case "VERDICT":
      return deleteForEvents(tx, input, (eventIds) =>
        tx.delete(verdicts).where(inArray(verdicts.eventId, eventIds)).run().changes,
      );
    case "TASK":
      return deleteForEvents(tx, input, (eventIds) =>
        tx.delete(tasks).where(inArray(tasks.eventId, eventIds)).run().changes,
      );
    case "CHANNEL_EVENT":
      return tx
        .delete(channelEvents)
        .where(and(eq(channelEvents.channelId, input.channelId), eq(channelEvents.subjectId, input.subjectId)))
        .run().changes;
    default:
      throw new Error(`no database surface for ${input.targetKind}`);
  }
}

/**
 * Resets the subject's score row to zero and raises its version, so a write that read the old score is refused. The row
 * stays, because the score commit reads it and expects it to exist (design §6, step 9).
 */
function resetScore(tx: ShortTransaction, input: CleanSurfaceInput): number {
  return tx
    .update(subjectScores)
    .set({
      identityBaseScore: 0,
      behaviorAdjustTotal: 0,
      currentScore: 0,
      version: sql`${subjectScores.version} + 1`,
      lastRewardAt: null,
      updatedAt: input.at,
    })
    .where(eq(subjectScores.subjectId, input.subjectId))
    .run().changes;
}

/** Runs one delete over the event ids of the subject. A subject with no event has nothing to delete. */
function deleteForEvents(
  tx: ShortTransaction,
  input: CleanSurfaceInput,
  remove: (eventIds: string[]) => number,
): number {
  const eventIds = tx
    .select({ id: channelEvents.id })
    .from(channelEvents)
    .where(and(eq(channelEvents.channelId, input.channelId), eq(channelEvents.subjectId, input.subjectId)))
    .all()
    .map((row) => row.id);
  return eventIds.length === 0 ? 0 : remove(eventIds);
}
