import type { VoxwardDatabase, VoxwardOrm } from "./client.js";

/** The handle a short transaction receives. Use it only inside the callback. */
export type ShortTransaction = Parameters<Parameters<VoxwardOrm["transaction"]>[0]>[0];

export class AsyncTransactionError extends Error {
  readonly code = "TRANSACTION_ASYNC_WORK";

  constructor() {
    super("transaction work must be synchronous; network and model calls belong outside transactions");
    this.name = "AsyncTransactionError";
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as { then?: unknown } | null)?.then === "function";
}

/**
 * Runs `work` in one IMMEDIATE transaction. The write lock is taken when the transaction starts, so a
 * writer never waits for a lock partway through. `work` must be synchronous. If it returns a promise, the
 * transaction rolls back and AsyncTransactionError is thrown.
 */
export function runShortTransaction<T>(database: VoxwardDatabase, work: (tx: ShortTransaction) => T): T {
  return database.orm.transaction(
    (tx) => {
      const result = work(tx);
      if (isThenable(result)) {
        // The async work may keep running after the rollback. Swallow its later rejection so it is not an
        // unhandled rejection. The thrown error below already reports the failure.
        Promise.resolve(result).catch(() => undefined);
        throw new AsyncTransactionError();
      }
      return result;
    },
    { behavior: "immediate" },
  );
}
