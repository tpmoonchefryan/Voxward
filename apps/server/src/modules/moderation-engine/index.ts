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
import { DEFAULT_NORMALIZE_OPTIONS } from "./rules/normalize.js";
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
  const normalization = ruleSet?.normalization ?? DEFAULT_NORMALIZE_OPTIONS;
  const transliterator = options.transliterator ?? createTableTransliterator(new Map(), normalization);
  if (ruleSet !== null && transliterator.normalization.stripCombiningMarks !== normalization.stripCombiningMarks) {
    // The table is checked and read with its own options. They must be the rule set's, or a reading would not match.
    throw new ModerationConfigError([{ code: "NORMALIZATION_MISMATCH", ref: "transliterator" }]);
  }
  const now = options.now ?? (() => performance.now());
  const cache = createNicknameVerdictCache({
    ttlMs: options.nicknameCache?.ttlMs ?? NICKNAME_CACHE_DEFAULTS.ttlMs,
    maxEntries: options.nicknameCache?.maxEntries ?? NICKNAME_CACHE_DEFAULTS.maxEntries,
    now,
  });
  const env: CheckEnvironment = {
    ruleSet,
    transliterator,
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

export {
  createChannelModerationCache,
  type CachedRuleSetEntry,
  type ChannelModerationCache,
  type ChannelModerationCacheOptions,
} from "./channel-cache.js";
export { classifyDeterministicNoise, type DeterministicClass } from "./routing/classification.js";
export {
  createInMemoryExceptionQueue,
  type ExceptionEntry,
  type ExceptionQueue,
  type ExceptionResolution,
  exceptionKeyOf,
} from "./routing/exception-queue.js";
export {
  type BaseChecker,
  type CompletionDecision,
  createReviewRouter,
  type DecisionSource,
  type ReviewContext,
  type ReviewRouter,
  type ReviewRouterDeps,
  type RouteOutcome,
  type RoutingFacts,
  type RoutingOptions,
  type ScoringPort,
  type ScoringStatus,
} from "./routing/router.js";
export {
  type CompletionSource,
  PROCESSING_STATES,
  type ProcessingState,
  ProcessingTransitionError,
  REVIEW_STEPS,
  type ReviewStep,
  toStoredTaskStatus,
} from "./routing/states.js";
export {
  planRoute,
  type PlanInput,
  type PlanReason,
  type RoutePlan,
  type SettlementState,
  type TaskKind,
} from "./routing/truth-table.js";

/* Fast-lane review (S011, VW-SUB021). The runner receives the coordinator, the model, the scoring port and the storage. */
export {
  type BatchOutcome,
  createReviewRunner,
  type CycleOutcome,
  type ItemOutcome,
  type ReviewRunner,
  type ReviewRunnerDeps,
} from "./review/runner.js";
export {
  DEFAULT_REVIEW_POLICY,
  decideReviewTrigger,
  REVIEW_TRIGGERS,
  ReviewConfigError,
  resolveReviewPolicy,
  type ReviewPolicy,
  type ReviewTrigger,
  type TriggerFacts,
} from "./review/triggers.js";
export {
  eligibilityOf,
  INELIGIBLE_REASONS,
  type IneligibleReason,
  selectForReview,
  type Selection,
  type SelectionSkip,
} from "./review/selection.js";
export { createTaskAliasTable, type TaskAliasTable } from "./review/author-alias.js";
export {
  type BackgroundCoordinatorPort,
  type CandidateProposal,
  type CandidateProposalPort,
  type PendingScoring,
  type ReviewBatchLease,
  type ReviewCandidate,
  type ReviewModelPort,
  type ReviewQueuePort,
  type ReviewRecord,
  type ReviewStorePort,
  SCORING_STATES,
  type ScoringState,
  SETTLEMENT_STATES,
  type SettlementCommit,
  type SettlementWrite,
  type StoredSettlementState,
} from "./review/ports.js";

/* Candidate-term cards (S011, VW-SUB022). Confirming or rejecting needs `list.edit`; a proposal never changes the rule set. */
export {
  CANDIDATE_STATUSES,
  type CandidateCard,
  type CandidateRulePort,
  type CandidateStatus,
  type CandidateStore,
  type CandidateStoreOptions,
  type ConfirmResult,
  createCandidateStore,
  type RejectResult,
} from "./candidates/store.js";
export {
  type CandidateActor,
  type CandidateRouteResponse,
  type CandidateRoutes,
  createCandidateRoutes,
  LIST_EDIT_CAPABILITY,
  QUEUE_READ_CAPABILITY,
} from "./candidates/routes.js";
