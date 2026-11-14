import { eq } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { ScoreExceptionStore } from "./repository.js";
import { dataRequests } from "./schema/index.js";
import { runShortTransaction } from "./transaction.js";

export interface ExceptionReinstatement {
  readonly id: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly requestId: string;
  readonly at: string;
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
