import { CONTRACT_VERSION, type ChannelEvent, type ModerationEngine, type ModerationResult } from "@voxward/contracts";
import { type CheckEnvironment, type CheckLimits, DEFAULT_LIMITS, evaluateMessage, type MessageVerdict } from "./rules/engine.js";
import { compileRuleSet, type CompiledRuleSet, ModerationConfigError, type RuleSetInput } from "./rules/groups.js";
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
  readonly now?: () => number;
}

/** Checks a message and returns the detailed verdict, including hits and spans for audit. */
export interface ModerationChecker {
  check(event: ChannelEvent): Promise<MessageVerdict>;
}

const NO_NICKNAMES: NicknameSource = { displayNicknameOf: () => Promise.resolve(null) };

export function createModerationChecker(options: ModerationOptions = {}): ModerationChecker {
  const ruleSet = options.ruleSet === undefined ? null : compiledOrThrow(options.ruleSet);
  const env: CheckEnvironment = {
    ruleSet,
    transliterator: options.transliterator ?? createTableTransliterator(new Map()),
    limits: { ...DEFAULT_LIMITS, ...options.limits },
    now: options.now ?? (() => performance.now()),
  };
  const nicknames = options.nicknames ?? NO_NICKNAMES;
  return {
    async check(event) {
      const nickname = await nicknames.displayNicknameOf(event);
      return evaluateMessage(
        { subject: { channelId: event.channelId, senderRef: event.sender.senderRef }, nickname, body: event.body },
        env,
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

function compiledOrThrow(input: RuleSetInput): CompiledRuleSet {
  const result = compileRuleSet(input);
  if (!result.ok) throw new ModerationConfigError(result.issues);
  return result.ruleSet;
}
