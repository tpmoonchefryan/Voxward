import { eq } from "drizzle-orm";
import { createAuditLogPort } from "../../src/db/audit-log.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { createDataRequestPort } from "../../src/db/data-request-store.js";
import { SubjectStore } from "../../src/db/repository.js";
import {
  channels,
  listEntries,
  scoreExceptions,
  scoreLedger,
  subjectIdentities,
  subjectNicknameChanges,
  subjectScores,
} from "../../src/db/schema/index.js";
import { createSubjectReadPort } from "../../src/db/subject-read.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { RETENTION_DAYS } from "../../src/modules/audit-store/content-policy.js";
import { createDataRoutes, type DataActor, type DataDeps, type DataRoutes } from "../../src/modules/data-lifecycle-service/index.js";
import { capabilitiesOf, type ChannelRole } from "../../src/auth/permissions.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

/** Every value here is synthetic. No real viewer, nickname or platform identifier appears. */
export const CHANNEL = "channel-1";
export const OTHER_CHANNEL = "channel-2";
export const SUBJECT = "subject-1";
export const TWIN = "subject-2";
export const OTHER_SUBJECT = "subject-3";
/** The nickname digest that SUBJECT and TWIN share. Two subjects with the same nickname are two subjects. */
export const SHARED_NICKNAME_HASH = "a".repeat(64);
export const FIXED_NOW = new Date(T0);

export interface DataFixture {
  readonly database: VoxwardDatabase;
  readonly deps: DataDeps;
  readonly routes: DataRoutes;
  readonly close: () => void;
}

/** A DATA_ADMIN in the test channel. It holds the capabilities that S003 grants to that role. */
export function actorFor(role: ChannelRole, channelId: string = CHANNEL, accountId = `${role.toLowerCase()}-1`): DataActor {
  return { accountId, channelId, capabilities: new Set<string>(capabilitiesOf(role)) };
}

/** Builds the module's ports on a real, migrated database. Ids count up from 1, so each test is deterministic. */
export function dataDepsFor(database: VoxwardDatabase): DataDeps {
  let counter = 0;
  return {
    requests: createDataRequestPort(database),
    subjects: createSubjectReadPort(database),
    logs: createAuditLogPort(database),
    newId: () => `id-${++counter}`,
    now: () => new Date(FIXED_NOW),
    retentionDays: RETENTION_DAYS,
    caches: { names: [], forgetSubject: () => 0 },
  };
}

/**
 * Two channels, three subjects. SUBJECT and TWIN share a nickname digest. SUBJECT has a score, an identity fact, a
 * scoring-exception marker and a ledger row. TWIN has a blacklist entry. OTHER_SUBJECT lives in the other channel.
 */
export function openDataFixture(prefix: string): DataFixture {
  const directory = scratchDirectory(prefix);
  const database = migratedDatabase(directory);
  runShortTransaction(database, (tx) => {
    for (const id of [CHANNEL, OTHER_CHANNEL]) {
      tx.insert(channels)
        .values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 })
        .run();
    }
    SubjectStore.create(tx, { id: SUBJECT, channelId: CHANNEL, platformSubjectKey: "synthetic-key-1", createdAt: T0 });
    SubjectStore.create(tx, { id: TWIN, channelId: CHANNEL, platformSubjectKey: "synthetic-key-2", createdAt: T0 });
    SubjectStore.create(tx, {
      id: OTHER_SUBJECT,
      channelId: OTHER_CHANNEL,
      platformSubjectKey: "synthetic-key-3",
      createdAt: T0,
    });
    for (const subjectId of [SUBJECT, TWIN]) {
      tx.insert(subjectNicknameChanges)
        .values({
          id: `nick-${subjectId}`,
          subjectId,
          previousNicknameHash: null,
          nextNicknameHash: SHARED_NICKNAME_HASH,
          changedAt: T0,
        })
        .run();
    }
    // SubjectStore.create already wrote a zero score row at version 0. This sets SUBJECT's synthetic score.
    tx.update(subjectScores).set({ currentScore: 12, version: 1 }).where(eq(subjectScores.subjectId, SUBJECT)).run();
    tx.insert(subjectIdentities)
      .values({
        id: "identity-1",
        subjectId: SUBJECT,
        identityKind: "MODERATOR",
        sourceEventRef: "synthetic-identity-1",
        effectiveFrom: T0,
        observedAt: T0,
      })
      .run();
    tx.insert(scoreLedger)
      .values({
        id: "ledger-1",
        subjectId: SUBJECT,
        idempotencyKey: "synthetic-ledger-1",
        reasonCode: "COMPLIANT_REWARD",
        requestedDelta: 1,
        actualDelta: 1,
        createdAt: T0,
      })
      .run();
    tx.insert(scoreExceptions)
      .values({
        id: "exception-1",
        channelId: CHANNEL,
        subjectId: SUBJECT,
        purposeCode: "SCORING_EXCEPTION_PREFERENCE",
        createdAt: T0,
      })
      .run();
    tx.insert(listEntries)
      .values({
        id: "list-1",
        channelId: CHANNEL,
        subjectId: TWIN,
        listKind: "BLACKLIST",
        createdAt: T0,
        createdByRef: "synthetic-owner",
      })
      .run();
  });
  const deps = dataDepsFor(database);
  return {
    database,
    deps,
    routes: createDataRoutes(deps),
    close: () => {
      database.close();
      removeDirectory(directory);
    },
  };
}

/** Row count of one table, read directly. Tests use it to show that a write did or did not touch a table. */
export function rowsIn(database: VoxwardDatabase, table: string): number {
  const row = database.sqlite.prepare(`select count(*) as n from ${table}`).get() as { n: number };
  return row.n;
}
