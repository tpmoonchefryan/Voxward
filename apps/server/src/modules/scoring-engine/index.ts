import {
  CONTRACT_VERSION,
  IDENTITY_KINDS,
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
import { decideIdentityTransition, identityIdempotencyKey, type IdentityTransition } from "./identity-events.js";
import { decideManualCorrection, manualIdempotencyKey, type ManualCorrection } from "./compensation.js";
import { commitScoring } from "./ledger.js";

export { DEFAULT_SCORING_CONFIG, type ScoringConfig, type ScoringConfigOverrides } from "./config.js";
export { ScoringConfigError, ScoringInputError, ScoringRefusedError } from "./errors.js";
export type { IdentityTransition } from "./identity-events.js";
export type { ManualCorrection } from "./compensation.js";

export interface ScoringOptions {
  /** Storage port. A server binding supplies the database implementation. */
  readonly ledger: ScoringLedgerPort;
  /** Overrides on top of DEFAULT_SCORING_CONFIG. Validated when the engine is created. */
  readonly config?: ScoringConfigOverrides;
  /** Time source for the committed-at column. Defaults to the system clock. */
  readonly clock?: () => Date;
}

/** The ScoringEngine contract plus the two ledger entry points that have no contract yet. */
export interface ScoringService extends ScoringEngine {
  /** Applies one identity change. A repeated source event reference changes nothing. */
  applyIdentityTransition(transition: IdentityTransition): Promise<ScoreChange>;
  /** Applies one operator correction. A repeated operation identifier changes nothing. */
  applyManualCorrection(correction: ManualCorrection): Promise<ScoreChange>;
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
  requireText(event.channelId, "channelId");
  requireText(event.platformMessageId, "platformMessageId");
  requireText(event.sender.senderRef, "senderRef");
  if (Number.isNaN(Date.parse(event.receivedAt))) throw new ScoringInputError("receivedAt");
}

function validateIdentityTransition(transition: IdentityTransition): void {
  requireText(transition.channelId, "channelId");
  requireText(transition.subjectKey, "subjectKey");
  requireText(transition.sourceEventRef, "sourceEventRef");
  if (!(IDENTITY_KINDS as readonly string[]).includes(transition.nextKind)) throw new ScoringInputError("nextKind");
  if (Number.isNaN(Date.parse(transition.effectiveFrom))) throw new ScoringInputError("effectiveFrom");
}

function validateManualCorrection(correction: ManualCorrection): void {
  requireText(correction.channelId, "channelId");
  requireText(correction.subjectKey, "subjectKey");
  requireText(correction.operationId, "operationId");
  requireText(correction.operatorRef, "operatorRef");
  if (!Number.isSafeInteger(correction.delta)) throw new ScoringInputError("delta");
}

function requireText(value: string, name: string): void {
  if (value.trim() === "") throw new ScoringInputError(name);
}

/**
 * Maps a storage result to the contract. A duplicate returns the original actual delta and changes nothing again.
 * An exception refusal throws, so the caller can tell a refusal apart from a zero change.
 */
export function toScoreChange(result: ScoreCommitResult, idempotencyKey: string): ScoreChange {
  if (result.status === "refused") throw new ScoringRefusedError(result.reason);
  const delta = result.status === "no_effect" ? 0 : result.actualDelta;
  return { contractVersion: CONTRACT_VERSION, subjectRef: result.subjectRef, delta, idempotencyKey };
}

/**
 * Creates the scoring module. Without options the module is not wired, and every entry point rejects with the
 * placeholder message the registry has always reported.
 */
export function createScoringEngine(options?: ScoringOptions): ScoringService {
  if (options === undefined) return unwiredScoringService();

  const config = resolveScoringConfig(options.config);
  const clock = options.clock ?? (() => new Date());
  return {
    moduleName: "ScoringEngine",
    contractVersion: CONTRACT_VERSION,

    async applyVerdict(event, verdict) {
      validateVerdictInput(event, verdict);
      const idempotencyKey = verdictIdempotencyKey(event);
      const result = commitScoring(options.ledger, {
        subject: { channelId: event.channelId, subjectKey: event.sender.senderRef },
        idempotencyKey,
        committedAt: clock().toISOString(),
        decide: (state) => decideVerdictChange(event, verdict, state, config),
      });
      return toScoreChange(result, idempotencyKey);
    },

    async applyIdentityTransition(transition) {
      validateIdentityTransition(transition);
      const idempotencyKey = identityIdempotencyKey(transition.sourceEventRef);
      const result = commitScoring(options.ledger, {
        subject: { channelId: transition.channelId, subjectKey: transition.subjectKey },
        idempotencyKey,
        identityEventRef: transition.sourceEventRef,
        committedAt: clock().toISOString(),
        decide: (state) => decideIdentityTransition(transition, state, config),
      });
      return toScoreChange(result, idempotencyKey);
    },

    async applyManualCorrection(correction) {
      validateManualCorrection(correction);
      const idempotencyKey = manualIdempotencyKey(correction.operationId);
      const result = commitScoring(options.ledger, {
        subject: { channelId: correction.channelId, subjectKey: correction.subjectKey },
        idempotencyKey,
        committedAt: clock().toISOString(),
        decide: (state) => decideManualCorrection(correction, state, config),
      });
      return toScoreChange(result, idempotencyKey);
    },
  };
}

function unwiredScoringService(): ScoringService {
  const notWired = (name: string) => () => Promise.reject(new Error(`MODULE_NOT_IMPLEMENTED: ScoringEngine.${name}`));
  return {
    moduleName: "ScoringEngine",
    contractVersion: CONTRACT_VERSION,
    applyVerdict: notWired("applyVerdict"),
    applyIdentityTransition: notWired("applyIdentityTransition"),
    applyManualCorrection: notWired("applyManualCorrection"),
  };
}
