import { type NicknameScopeStrategy, type ScopeCheck, type SubjectRef, subjectKey } from "../rules/engine.js";

/** Defaults for the in-process nickname cache. The values are S004 choices, not source requirements. */
export const NICKNAME_CACHE_DEFAULTS = {
  ttlMs: 60 * 60 * 1000,
  maxEntries: 10_000,
} as const;

export interface NicknameVerdictCacheOptions {
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly now: () => number;
}

/**
 * Stores the nickname-scope result of each internal subject. A stored result answers a lookup only while the
 * nickname digest, the rule version and the expiry all still match. A rename, a rule change or an expiry therefore
 * forces a fresh nickname check. The cache never records that a subject is safe; it records one nickname's check.
 */
export interface NicknameVerdictCache {
  lookup(subject: SubjectRef, digest: string, ruleVersion: string): ScopeCheck | undefined;
  store(subject: SubjectRef, digest: string, ruleVersion: string, scope: ScopeCheck): void;
  size(): number;
}

interface CacheEntry {
  readonly digest: string;
  readonly ruleVersion: string;
  readonly expiresAt: number;
  readonly scope: ScopeCheck;
}

export function createNicknameVerdictCache(options: NicknameVerdictCacheOptions): NicknameVerdictCache {
  if (!Number.isFinite(options.ttlMs) || options.ttlMs <= 0) {
    throw new TypeError("nickname cache: ttlMs must be a positive number");
  }
  if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) {
    throw new TypeError("nickname cache: maxEntries must be a positive integer");
  }

  // A Map keeps insertion order, so the first key is the least recently used one.
  const entries = new Map<string, CacheEntry>();
  return {
    lookup(subject, digest, ruleVersion) {
      const key = subjectKey(subject);
      const entry = entries.get(key);
      if (entry === undefined) return undefined;
      const usable = entry.digest === digest && entry.ruleVersion === ruleVersion && options.now() < entry.expiresAt;
      if (!usable) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key);
      entries.set(key, entry);
      return entry.scope;
    },
    store(subject, digest, ruleVersion, scope) {
      // A partial result, cut short by the budget, must not answer later messages.
      if (!scope.complete) return;
      const key = subjectKey(subject);
      entries.delete(key);
      entries.set(key, { digest, ruleVersion, expiresAt: options.now() + options.ttlMs, scope });
      while (entries.size > options.maxEntries) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        entries.delete(oldest.value);
      }
    },
    size() {
      return entries.size;
    },
  };
}

/** SHA-256 of the nickname as lower-case hex. The cache keys on this digest, not on the nickname text. */
export async function nicknameDigest(nickname: string): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(nickname));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The nickname scope with the cache in front. Only the nickname check is skipped on a hit. The body and the
 * combined checks run for every message, because the engine calls them outside this strategy.
 */
export function withNicknameVerdictCache(
  cache: NicknameVerdictCache,
  ruleVersion: string,
  digestOf: (nickname: string) => Promise<string> = nicknameDigest,
): NicknameScopeStrategy {
  return async (subject, nickname, runFresh) => {
    const digest = await digestOf(nickname);
    const stored = cache.lookup(subject, digest, ruleVersion);
    if (stored !== undefined) return stored;
    const fresh = runFresh();
    cache.store(subject, digest, ruleVersion, fresh);
    return fresh;
  };
}
