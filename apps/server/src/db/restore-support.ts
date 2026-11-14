import { randomUUID } from "node:crypto";
import type { AuditLogPort, SubjectCleanupPort } from "@voxward/contracts";
import { eq } from "drizzle-orm";
import { createAuditLogPort } from "./audit-log.js";
import { restoreBackup, type ReplayOutcome } from "./backup-store.js";
import type { VoxwardDatabase } from "./client.js";
import { ScoreExceptionStore } from "./repository.js";
import { dataRequests } from "./schema/index.js";
import { createSubjectCleanupPort } from "./subject-cleanup.js";
import type { TombstoneEntry, TombstoneLedger } from "./tombstone-ledger.js";
import { runShortTransaction } from "./transaction.js";

export interface ExceptionReinstatement {
  readonly id: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly requestId: string;
  readonly at: string;
}

/**
 * Ports that `replayTombstones` needs on a staged database. Defined in the db zone so `restore-support.ts` does not
 * import the business module directly (scripts/check-deps.mjs).
 */
export interface RestoreReplayPorts {
  readonly cleanup: SubjectCleanupPort;
  readonly logs: Pick<AuditLogPort, "certifySubjectChangeLogs" | "removeSubjectEvidence" | "removeSubjectTechnicalRows">;
  readonly reinstateException: (input: Omit<ExceptionReinstatement, "id">) => void;
  readonly certificateSummary: string;
  readonly now: () => Date;
}

export interface RestorePortsOptions {
  readonly certificateSummary: string;
  readonly newId?: () => string;
  readonly now?: () => Date;
}

export interface RestoreWithPortsOptions {
  readonly backupPath: string;
  readonly targetPath: string;
  readonly ledger: TombstoneLedger;
  readonly certificateSummary: string;
  readonly newId?: () => string;
  readonly now?: () => Date;
  readonly replayWith: (ports: RestoreReplayPorts, tombstones: readonly TombstoneEntry[]) => ReplayOutcome;
}

/**
 * Re-creates the scoring-exception marker of a DELETE_AND_EXCEPT tombstone on a restored snapshot that predates it. A
 * marker that is already active is left alone (S020, R-S020-10).
 */
export function reinstateException(database: VoxwardDatabase, input: ExceptionReinstatement): void {
  runShortTransaction(database, (tx) => {
    // A snapshot that predates the request has no row for it, and the marker's source is a foreign key.
    const known = tx.select({ id: dataRequests.id }).from(dataRequests).where(eq(dataRequests.id, input.requestId)).get();
    ScoreExceptionStore.ensureActive(tx, {
      id: input.id,
      channelId: input.channelId,
      subjectId: input.subjectId,
      sourceRequestId: known === undefined ? null : input.requestId,
      createdAt: input.at,
    });
  });
}

/** Binds the real SQLite ports on a staged database for tombstone replay. */
export function createRestoreReplayPorts(staged: VoxwardDatabase, options: RestorePortsOptions): RestoreReplayPorts {
  const newId = options.newId ?? randomUUID;
  return {
    cleanup: createSubjectCleanupPort(staged),
    logs: createAuditLogPort(staged),
    reinstateException: (input) => reinstateException(staged, { ...input, id: newId() }),
    certificateSummary: options.certificateSummary,
    now: options.now ?? (() => new Date()),
  };
}

/** Runs `restoreBackup` in isolation and binds the staged database ports for the caller's replay function. */
export function restoreDatabaseWithPorts(options: RestoreWithPortsOptions): void {
  restoreBackup({
    backupPath: options.backupPath,
    targetPath: options.targetPath,
    ledger: options.ledger,
    replay: (staged, tombstones) =>
      options.replayWith(
        createRestoreReplayPorts(staged, {
          certificateSummary: options.certificateSummary,
          newId: options.newId,
          now: options.now,
        }),
        tombstones,
      ),
  });
}
