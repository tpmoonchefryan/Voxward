import { CONTRACT_VERSION, type ChannelEvent, type ModerationEngine, type ModerationResult } from "@voxward/contracts";
import { createModerationChecker, type ModerationChecker, type NicknameSource } from "./index.js";
import type { CheckLimits, MessageVerdict } from "./rules/engine.js";
import { ModerationConfigError, type RuleSetInput } from "./rules/groups.js";
import type { Transliterator } from "./rules/transliterate.js";

export interface CachedRuleSetEntry {
  readonly version: number;
  readonly ruleSet: RuleSetInput;
}

export interface ChannelModerationCacheOptions {
  readonly loadRuleSet: (channelId: string) => CachedRuleSetEntry | null;
  readonly fallbackRuleSet?: RuleSetInput;
  readonly nicknames?: NicknameSource;
  readonly transliterator?: Transliterator;
  readonly limits?: Partial<CheckLimits>;
  readonly nicknameCache?: { readonly ttlMs?: number; readonly maxEntries?: number };
  readonly now?: () => number;
  readonly maxChannels?: number;
}

export interface ChannelModerationCache extends ModerationChecker, ModerationEngine {
  invalidate(channelId: string): void;
  size(): number;
}

const DEFAULT_MAX_CHANNELS = 128;

/**
 * Per-channel ModerationChecker cache keyed by (channelId, ruleVersion).
 * Preserves compiled regexes and each channel's NicknameVerdictCache across messages while
 * refreshing automatically when a newer rule version is published.
 */
export function createChannelModerationCache(options: ChannelModerationCacheOptions): ChannelModerationCache {
  const maxChannels = Math.max(1, options.maxChannels ?? DEFAULT_MAX_CHANNELS);
  const cache = new Map<string, { readonly version: number; readonly checker: ModerationChecker }>();
  const fallbackChecker = createModerationChecker({
    ruleSet: options.fallbackRuleSet,
    nicknames: options.nicknames,
    transliterator: options.transliterator,
    limits: options.limits,
    nicknameCache: options.nicknameCache,
    now: options.now,
  });

  function checkerFor(channelId: string): ModerationChecker {
    const loaded = options.loadRuleSet(channelId);
    if (loaded === null) {
      cache.delete(channelId);
      return fallbackChecker;
    }
    const existing = cache.get(channelId);
    if (existing !== undefined && existing.version === loaded.version) {
      // Refresh insertion order for bounded LRU eviction.
      cache.delete(channelId);
      cache.set(channelId, existing);
      return existing.checker;
    }
    try {
      const checker = createModerationChecker({
        ruleSet: loaded.ruleSet,
        nicknames: options.nicknames,
        transliterator: options.transliterator,
        limits: options.limits,
        nicknameCache: options.nicknameCache,
        now: options.now,
      });
      cache.delete(channelId);
      cache.set(channelId, { version: loaded.version, checker });
      if (cache.size > maxChannels) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return checker;
    } catch (error) {
      if (error instanceof ModerationConfigError) {
        cache.delete(channelId);
        return fallbackChecker;
      }
      throw error;
    }
  }

  async function check(event: ChannelEvent, checkOptions?: { readonly language?: string }): Promise<MessageVerdict> {
    return checkerFor(event.channelId).check(event, checkOptions);
  }

  return {
    moduleName: "ModerationEngine",
    contractVersion: CONTRACT_VERSION,
    check,
    async moderate(event): Promise<ModerationResult> {
      const verdict = await check(event);
      return {
        contractVersion: CONTRACT_VERSION,
        correlationId: event.correlationId,
        route: verdict.route,
      };
    },
    invalidate(channelId) {
      cache.delete(channelId);
    },
    size() {
      return cache.size;
    },
  };
}
