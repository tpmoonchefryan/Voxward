import type { IdentityKind, ListKind, SubjectFacts, SubjectReadPort } from "@voxward/contracts";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { listEntries, scoreExceptions, scoreLedger, subjectIdentities, subjectScores, subjects } from "./schema/index.js";

/**
 * Database implementation of SubjectReadPort. Reads only. A subject that belongs to another channel reads as absent,
 * so the caller cannot tell it apart from an unknown subject.
 */
export function createSubjectReadPort(database: VoxwardDatabase): SubjectReadPort {
  return {
    readSubject(channelId, subjectId) {
      const { orm } = database;
      const subject = orm
        .select({ id: subjects.id })
        .from(subjects)
        .where(and(eq(subjects.id, subjectId), eq(subjects.channelId, channelId)))
        .get();
      if (subject === undefined) return undefined;

      const score = orm
        .select({ currentScore: subjectScores.currentScore })
        .from(subjectScores)
        .where(eq(subjectScores.subjectId, subjectId))
        .get();
      const identity = orm
        .select({ kind: subjectIdentities.identityKind, effectiveFrom: subjectIdentities.effectiveFrom })
        .from(subjectIdentities)
        .where(eq(subjectIdentities.subjectId, subjectId))
        .orderBy(desc(subjectIdentities.effectiveFrom), desc(subjectIdentities.id))
        .limit(1)
        .get();
      const list = orm
        .select({ listKind: listEntries.listKind })
        .from(listEntries)
        .where(and(eq(listEntries.channelId, channelId), eq(listEntries.subjectId, subjectId), isNull(listEntries.removedAt)))
        .limit(1)
        .get();
      const exception = orm
        .select({ createdAt: scoreExceptions.createdAt })
        .from(scoreExceptions)
        .where(
          and(
            eq(scoreExceptions.channelId, channelId),
            eq(scoreExceptions.subjectId, subjectId),
            isNull(scoreExceptions.removedAt),
          ),
        )
        .limit(1)
        .get();
      const ledger = orm.select({ n: count() }).from(scoreLedger).where(eq(scoreLedger.subjectId, subjectId)).get();

      const facts: SubjectFacts = {
        subjectId,
        channelId,
        currentScore: score?.currentScore ?? null,
        identity:
          identity === undefined ? null : { kind: identity.kind as IdentityKind, effectiveFrom: identity.effectiveFrom },
        list: list === undefined ? null : (list.listKind as ListKind),
        exception: exception === undefined ? null : { createdAt: exception.createdAt },
        ledgerEntryCount: ledger?.n ?? 0,
      };
      return facts;
    },
  };
}
