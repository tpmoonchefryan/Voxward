/**
 * Platform message IDs that the intake has already taken. The default store is bounded and lives in memory. A deployment
 * that must survive a restart binds a store backed by the channel_events unique index (design.md, section 5).
 */
export interface MessageIdStore {
  /** True when the ID is already recorded. */
  has(id: string): boolean;
  /** Records the ID. The store may forget its oldest entries once it is full. */
  add(id: string): void;
}

export function createInMemoryMessageIdStore(capacity: number): MessageIdStore {
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer");
  // A Map keeps insertion order, so its first key is the oldest entry.
  const ids = new Map<string, true>();
  return {
    has(id) {
      return ids.has(id);
    },
    add(id) {
      if (ids.has(id)) return;
      ids.set(id, true);
      if (ids.size > capacity) {
        const oldest = ids.keys().next().value;
        if (oldest !== undefined) ids.delete(oldest);
      }
    },
  };
}

/** Takes an ID once. The first call returns NEW and records it. Later calls return DUPLICATE and change nothing. */
export function claimMessageId(store: MessageIdStore, id: string): "NEW" | "DUPLICATE" {
  if (store.has(id)) return "DUPLICATE";
  store.add(id);
  return "NEW";
}
