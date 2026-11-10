import { CONTRACT_VERSION, type ChannelEvent, type ModerationEngine, type ModerationResult } from "@voxward/contracts";
import {
  createNicknameVerdictCache,
  NICKNAME_CACHE_DEFAULTS,
  withNicknameVerdictCache,
} from "./nickname-cache/cache.js";
import {
  createInProcessSafeAliases,
  type NicknameReading,
  resolveNicknameReading,
  type SafeAliasPort,
} from "./nickname-cache/safe-alias.js";
import {
  type CheckEnvironment,
  type CheckLimits,
  DEFAULT_LIMITS,
  evaluateMessage,
  type MessageVerdict,
  type NicknameScopeStrategy,
} from "./rules/engine.js";
import { type CompiledRuleSet, compileRuleSet, ModerationConfigError, type RuleSetInput } from "./rules/groups.js";
import { createTableTransliterator, type Transliterator } from "./rules/transliterate.js";

/**
 * Supplies the display nickname of an event's sender from local data. The ChannelEvent contract does not carry it,
 * so the module takes it through this port. Returning null leaves the nickname unchecked, which routes to REVIEW.
 */
export interface NicknameSource {
  displayNicknameOf(event: ChannelEvent): Promise<string | null>;
}

export interface ModerationOptions {
  /** The published rule set. Without one, every message routes to REVIEW. An invalid set throws at creation. */
  readonly ruleSet?: RuleSetInput;
  /** Local reading source. The default has no table, so Chinese readings are incomplete. */
  readonly transliterator?: Transliterator;
  readonly nicknames?: NicknameSource;
  readonly limits?: Partial<CheckLimits>;
  readonly nicknameCache?: { readonly ttlMs?: number; readonly maxEntries?: number };
  readonly now?: () => number;
}

/** Checks a message and returns the detailed verdict, including hits and spans for audit. */
export interface ModerationChecker {
  check(event: ChannelEvent): Promise<MessageVerdict>;
}

export interface NicknameReaderOptions {
  readonly nicknames?: NicknameSource;
  readonly safeAliases?: SafeAliasPort;
  readonly transliterator?: Transliterator;
}

export interface NicknameReader {
  read(event: ChannelEvent): Promise<NicknameReading>;
}

const NO_NICKNAMES: NicknameSource = { displayNicknameOf: () => Promise.resolve(null) };

export function createModerationChecker(options: ModerationOptions = {}): ModerationChecker {
  const ruleSet = options.ruleSet === undefined ? null : compiledOrThrow(options.ruleSet);
  const now = options.now ?? (() => performance.now());
  const cache = createNicknameVerdictCache({
    ttlMs: options.nicknameCache?.ttlMs ?? NICKNAME_CACHE_DEFAULTS.ttlMs,
    maxEntries: options.nicknameCache?.maxEntries ?? NICKNAME_CACHE_DEFAULTS.maxEntries,
    now,
  });
  const env: CheckEnvironment = {
    ruleSet,
    transliterator: options.transliterator ?? createTableTransliterator(new Map()),
    limits: { ...DEFAULT_LIMITS, ...options.limits },
    now,
  };
  const nicknameScope: NicknameScopeStrategy | undefined =
    ruleSet === null ? undefined : withNicknameVerdictCache(cache, ruleSet.version);
  const nicknames = options.nicknames ?? NO_NICKNAMES;
  return {
    async check(event) {
      const nickname = await nicknames.displayNicknameOf(event);
      return evaluateMessage(
        { subject: { channelId: event.channelId, senderRef: event.sender.senderRef }, nickname, body: event.body },
        env,
        nicknameScope,
      );
    },
  };
}

/** The contract engine. Its result carries only the route; use `createModerationChecker` for hits and reasons. */
export function createModerationEngine(options: ModerationOptions = {}): ModerationEngine {
  const checker = createModerationChecker(options);
  return {
    moduleName: "ModerationEngine",
    contractVersion: CONTRACT_VERSION,
    async moderate(event) {
      const verdict = await checker.check(event);
      const result: ModerationResult = {
        contractVersion: CONTRACT_VERSION,
        correlationId: event.correlationId,
        route: verdict.route,
      };
      return result;
    },
  };
}

/** Reads how a sender's name should be announced: host-confirmed alias first, then a complete local transliteration. */
export function createNicknameReader(options: NicknameReaderOptions = {}): NicknameReader {
  const nicknames = options.nicknames ?? NO_NICKNAMES;
  const safeAliases = options.safeAliases ?? createInProcessSafeAliases();
  const transliterator = options.transliterator ?? createTableTransliterator(new Map());
  return {
    async read(event) {
      const nickname = await nicknames.displayNicknameOf(event);
      return resolveNicknameReading(
        { channelId: event.channelId, senderRef: event.sender.senderRef },
        nickname,
        { safeAliases, transliterator },
      );
    },
  };
}

function compiledOrThrow(input: RuleSetInput): CompiledRuleSet {
  const result = compileRuleSet(input);
  if (!result.ok) throw new ModerationConfigError(result.issues);
  return result.ruleSet;
}
