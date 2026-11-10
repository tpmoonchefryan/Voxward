/**
 * Queue of messages from scoring-exception subjects (proposal section 4.2). Every such message is registered before any
 * short circuit, so a base-check decision cannot skip the record. Storage is not assigned to a story yet (S006 design 9).
 */

/** How an entry was closed. BASE_BLOCK means the basic check finished it; MODEL and MANUAL mean a verdict decided it. */
export type ExceptionResolution = "BASE_BLOCK" | "MODEL" | "MANUAL" | "DISCARDED";

export interface ExceptionEntry {
  readonly key: string;
  readonly correlationId: string;
  readonly resolution: ExceptionResolution | null;
}

export type RegisterResult = "CREATED" | "EXISTING";

export interface ExceptionQueue {
  /** Registers one message. A repeated key changes nothing and returns EXISTING. */
  register(key: string, correlationId: string): RegisterResult;
  /** Closes an entry. The first resolution stands; a later call returns the entry unchanged. */
  settle(key: string, resolution: ExceptionResolution): ExceptionEntry;
  entry(key: string): ExceptionEntry | undefined;
  /** Entries still waiting, in registration order. */
  openEntries(): readonly ExceptionEntry[];
}

export class ExceptionQueueError extends Error {
  readonly code = "EXCEPTION_ENTRY_MISSING";

  constructor() {
    super("exception queue has no entry for this message");
    this.name = "ExceptionQueueError";
  }
}

/** Identity of one event in the queue. JSON keeps the channel and the platform message apart whatever characters they hold. */
export function exceptionKeyOf(event: { readonly channelId: string; readonly platformMessageId: string }): string {
  return JSON.stringify([event.channelId, event.platformMessageId]);
}

export function createInMemoryExceptionQueue(): ExceptionQueue {
  const entries = new Map<string, { correlationId: string; resolution: ExceptionResolution | null }>();

  const snapshotOf = (key: string): ExceptionEntry | undefined => {
    const stored = entries.get(key);
    return stored === undefined ? undefined : { key, correlationId: stored.correlationId, resolution: stored.resolution };
  };

  return {
    register(key, correlationId) {
      if (entries.has(key)) return "EXISTING";
      entries.set(key, { correlationId, resolution: null });
      return "CREATED";
    },
    settle(key, resolution) {
      const stored = entries.get(key);
      if (stored === undefined) throw new ExceptionQueueError();
      if (stored.resolution === null) stored.resolution = resolution;
      return snapshotOf(key) as ExceptionEntry;
    },
    entry: snapshotOf,
    openEntries() {
      return [...entries.keys()]
        .filter((key) => entries.get(key)?.resolution === null)
        .map((key) => snapshotOf(key) as ExceptionEntry);
    },
  };
}
