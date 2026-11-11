import type { StoredTechnicalLog } from "@voxward/contracts";
import type { InvalidationBus, InvalidationEvent } from "../invalidation.js";

/** Entries the cache keeps at most. The bound is an implementation choice. */
export const DEFAULT_CACHE_ENTRIES = 256;

/**
 * Caches the raw rows of single Technical Log entries. Only single entries are cached. A chain page or a list can gain
 * a new row at any time, and this module has no insert event to invalidate them, so those reads always go to storage.
 * Permissions are checked on every read, before the cache is consulted, and the cache holds no filtered view.
 */
export interface ViewerCache {
  /** The cached row, or undefined on a miss. An entry at or past its expiry is dropped and reported as a miss. */
  readDetail(channelId: string, logId: string, now: Date): StoredTechnicalLog | undefined;
  /** Stores one row. It expires with the earliest expiry among its metadata and its evidence. */
  writeDetail(channelId: string, stored: StoredTechnicalLog): void;
  /** Number of entries held. */
  size(): number;
  /** Stops listening to the invalidation bus and empties the cache. */
  dispose(): void;
}

interface CacheEntry {
  readonly stored: StoredTechnicalLog;
  readonly expiresAtMs: number;
}

/**
 * Creates a cache that drops every entry whose log id or correlation id appears in an invalidation event. The
 * change-log ids of an event are not needed here, because this cache holds no change-log rows.
 */
export function createViewerCache(bus: InvalidationBus, maxEntries: number = DEFAULT_CACHE_ENTRIES): ViewerCache {
  const entries = new Map<string, CacheEntry>();
  const unsubscribe = bus.subscribe((event) => dropMatching(entries, event));

  return {
    readDetail(channelId, logId, now) {
      const key = detailKey(channelId, logId);
      const entry = entries.get(key);
      if (entry === undefined) return undefined;
      if (now.getTime() >= entry.expiresAtMs) {
        entries.delete(key);
        return undefined;
      }
      return entry.stored;
    },

    writeDetail(channelId, stored) {
      const key = detailKey(channelId, stored.log.id);
      entries.delete(key);
      entries.set(key, { stored, expiresAtMs: earliestExpiry(stored) });
      evictOldest(entries, maxEntries);
    },

    size() {
      return entries.size;
    },

    dispose() {
      unsubscribe();
      entries.clear();
    },
  };
}

function detailKey(channelId: string, logId: string): string {
  return JSON.stringify([channelId, logId]);
}

function earliestExpiry(stored: StoredTechnicalLog): number {
  return Math.min(Date.parse(stored.log.expiresAt), ...stored.evidence.map((item) => Date.parse(item.expiresAt)));
}

function dropMatching(entries: Map<string, CacheEntry>, event: InvalidationEvent): void {
  const logIds = new Set(event.logIds);
  const correlationIds = new Set(event.correlationIds);
  for (const [key, entry] of entries) {
    if (logIds.has(entry.stored.log.id) || correlationIds.has(entry.stored.log.correlationId)) entries.delete(key);
  }
}

/** Map keeps insertion order, so the first key is the entry written longest ago. */
function evictOldest(entries: Map<string, CacheEntry>, maxEntries: number): void {
  while (entries.size > maxEntries) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) return;
    entries.delete(oldest);
  }
}
