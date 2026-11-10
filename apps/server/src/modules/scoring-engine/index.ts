import {
  CONTRACT_VERSION,
  INTERNAL_CLASSIFICATIONS,
  toDownstreamVerdict,
  type ChannelEvent,
  type ScoreChange,
  type ScoreCommitResult,
  type ScoringEngine,
  type ScoringLedgerPort,
  type Verdict,
} from "@voxward/contracts";
import { resolveScoringConfig, type ScoringConfigOverrides } from "./config.js";
import { decideVerdictChange } from "./engine.js";
import { ScoringInputError, ScoringRefusedError } from "./errors.js";

export { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "./config.js";
export { ScoringConfigError, ScoringInputError, ScoringRefusedError } from "./errors.js";

export interface ScoringOptions {
  /** Storage port. A server binding supplies the database implementation. */
  readonly ledger: ScoringLedgerPort;
  /** Overrides on top of DEFAULT_SCORING_CONFIG. Validated when the engine is created. */
  readonly config?: ScoringConfigOverrides;
  /** Time source for the committed-at column. Defaults to the system clock. */
  readonly clock?: () => Date;
}

/** One event is scored at most once. The key is the channel plus the platform message reference. */
export function verdictIdempotencyKey(event: ChannelEvent): string {
  return `event:${event.channelId}:${event.platformMessageId}`;
}

/** Rejects input that cannot be scored, before any storage call. A failed model output lands here. */
export function validateVerdictInput(event: ChannelEvent, verdict: Verdict): void {
  if (!(INTERNAL_CLASSIFICATIONS as readonly string[]).includes(verdict.classification)) {
    throw new ScoringInputError("classification");
  }
  if (verdict.downstream !== toDownstreamVerdict(verdict.classification)) {
    throw new ScoringInputError("downstream");
  }
  if (event.channelId === "" || event.platformMessageId === "" || event.sender.senderRef === "") {
    throw new ScoringInputError("event identity");
  }
  if (Number.isNaN(Date.parse(event.receivedAt))) throw new ScoringInputError("receivedAt");
}

/**
 * Maps a storage result to the contract. A duplicate returns the original actual delta and changes nothing again.
 * An exception-refused result throws, so the caller can tell a refusal apart from a zero change.
 */
export function toScoreChange(result: ScoreCommitResult, idempotencyKey: string): ScoreChange {
  if (result.status === "refused") throw new ScoringRefusedError(result.reason);
  const delta = result.status === "no_effect" ? 0 : result.actualDelta;
  return { contractVersion: CONTRACT_VERSION, subjectRef: result.subjectRef, delta, idempotencyKey };
}

/**
 * Creates the scoring module. Without options the module is not wired, and every call rejects with the same
 * placeholder message the registry has always reported.
 */
export function createScoringEngine(options?: ScoringOptions): ScoringEngine {
  if (options === undefined) return unwiredScoringEngine();

  const config = resolveScoringConfig(options.config);
  const clock = options.clock ?? (() => new Date());
  return {
    moduleName: "ScoringEngine",
    contractVersion: CONTRACT_VERSION,
    async applyVerdict(event, verdict) {
      validateVerdictInput(event, verdict);
      const idempotencyKey = verdictIdempotencyKey(event);
      const result = options.ledger.commitScoreDecision({
        subject: { channelId: event.channelId, subjectKey: event.sender.senderRef },
        idempotencyKey,
        committedAt: clock().toISOString(),
        decide: (state) => decideVerdictChange(event, verdict, state, config),
      });
      return toScoreChange(result, idempotencyKey);
    },
  };
}

function unwiredScoringEngine(): ScoringEngine {
  return {
    moduleName: "ScoringEngine",
    contractVersion: CONTRACT_VERSION,
    applyVerdict: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: ScoringEngine.applyVerdict")),
  };
}
