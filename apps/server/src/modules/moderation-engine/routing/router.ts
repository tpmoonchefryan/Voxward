import {
  type ChannelEvent,
  createVerdict,
  type DownstreamVerdict,
  type InternalClassification,
  type PenaltyHit,
  type ScoringEngine,
  type Verdict,
} from "@voxward/contracts";
import type { MessageVerdict } from "../rules/engine.js";
import type { ReviewReason, RuleHit } from "../rules/groups.js";
import { classifyDeterministicNoise } from "./classification.js";
import { type ExceptionQueue, type ExceptionResolution, exceptionKeyOf } from "./exception-queue.js";
import {
  type CompletionSource,
  completeState,
  isTerminal,
  type ProcessingState,
  type ReviewStep,
  transitionState,
} from "./states.js";
import { planRoute, type RoutePlan, type SettlementState, type TaskKind } from "./truth-table.js";

/** The basic check the router needs. The moderation checker from `createModerationChecker` satisfies it. */
export interface BaseChecker {
  check(event: ChannelEvent): Promise<MessageVerdict>;
}

/** The scoring port: the contract's ScoringEngine, narrowed to the one entry point the router calls. */
export type ScoringPort = Pick<ScoringEngine, "applyVerdict">;

export interface RoutingOptions {
  /** Score at or above which a normal message is fast-passed (proposal section 5.1). Null turns the lane off. */
  readonly fastPassThreshold: number | null;
}

/** Facts the caller supplies. The router does not read storage, so each fact has one named source (S006 design 9). */
export interface RoutingFacts {
  /** The subject is on the scoring-exception list in this channel. */
  readonly exceptionMarked: boolean;
  /** The message is a paid text (Super Chat) or a membership message with custom text. */
  readonly paidText: boolean;
  /** The subject is on the whitelist. */
  readonly whitelisted: boolean;
  /** The subject's current score in this channel. Null when it is not known. */
  readonly score: number | null;
}

/** Where a final verdict came from. These are the values the verdicts table accepts. */
export type DecisionSource = "BASE_RULE" | "FAST_PASS" | "MODEL" | "MANUAL";

/** What the router keeps while a review is open. The caller passes it back to the next step. */
export interface ReviewContext {
  readonly state: ProcessingState;
  readonly taskKind: TaskKind;
  readonly exceptionMarked: boolean;
  /** Deductions of the rule groups that hit the message, one per group. Used only when the review decides BLOCK. */
  readonly penaltyHits: readonly PenaltyHit[];
}

export type ScoringStatus =
  | { readonly status: "APPLIED"; readonly delta: number }
  | { readonly status: "REFUSED"; readonly reason: "EXCEPTION_ACTIVE" }
  | { readonly status: "NOT_CALLED"; readonly reason: "FAST_PASS" | "NO_VERDICT" };

export interface RouteOutcome {
  readonly state: ProcessingState;
  readonly plan: RoutePlan | null;
  readonly source: DecisionSource | null;
  readonly settlement: SettlementState;
  readonly verdict: Verdict | null;
  /** The only downstream values. Null while the item is still open. */
  readonly downstream: DownstreamVerdict | null;
  readonly scoring: ScoringStatus;
  /** The open review to keep. Null once the item is terminal, or for a step that carries no review. */
  readonly review: ReviewContext | null;
  readonly ruleVersion: string | null;
  readonly reasons: readonly ReviewReason[];
}

/** A model or a person decides the final classification of an open item. */
export interface CompletionDecision {
  readonly source: CompletionSource;
  readonly classification: InternalClassification;
}

export interface ReviewRouter {
  /** Routes a new event: registers an exception, runs the basic check, and applies the truth table. */
  route(event: ChannelEvent, facts: RoutingFacts): Promise<RouteOutcome>;
  /** Moves an open item by one review step. */
  transition(event: ChannelEvent, review: ReviewContext, step: ReviewStep): Promise<RouteOutcome>;
  /** Records the final verdict of a RUNNING (model) or taken-over (human) item, then scores it. */
  complete(event: ChannelEvent, review: ReviewContext, decision: CompletionDecision): Promise<RouteOutcome>;
}

export interface ReviewRouterDeps {
  readonly checker: BaseChecker;
  readonly scoring: ScoringPort;
  readonly exceptionQueue: ExceptionQueue;
  readonly options: RoutingOptions;
}

/**
 * Builds the router. Scoring receives each final verdict together with the rule deductions that hit the message, so the
 * largest applicable deduction takes effect on the realtime path (S006 Q22). A fast pass is never scored.
 */
export function createReviewRouter(deps: ReviewRouterDeps): ReviewRouter {
  return {
    async route(event, facts) {
      const key = exceptionKeyOf(event);
      if (facts.exceptionMarked) deps.exceptionQueue.register(key, event.correlationId);

      const base = await deps.checker.check(event);
      const penaltyHits = penaltyHitsOf(base.hits);
      const plan = planRoute({
        baseRoute: base.route,
        exceptionMarked: facts.exceptionMarked,
        paidText: facts.paidText,
        whitelisted: facts.whitelisted,
        noise: classifyDeterministicNoise(event.body) === "NOISE",
        scoreReachesFastPass: reachesFastPass(facts.score, deps.options.fastPassThreshold),
      });

      if (plan.kind === "REVIEW") {
        return {
          state: "QUEUED",
          plan,
          source: null,
          settlement: "NONE",
          verdict: null,
          downstream: null,
          scoring: { status: "NOT_CALLED", reason: "NO_VERDICT" },
          review: { state: "QUEUED", taskKind: plan.taskKind, exceptionMarked: facts.exceptionMarked, penaltyHits },
          ruleVersion: base.ruleVersion,
          reasons: base.reasons,
        };
      }

      const verdict = createVerdict(plan.classification, plan.classification === "BLOCK" ? penaltyHits : []);
      const scoring = await scoreVerdict(deps.scoring, event, verdict, plan.verdictSource);
      if (facts.exceptionMarked) deps.exceptionQueue.settle(key, resolutionOf(plan.verdictSource));
      return {
        state: "DONE",
        plan,
        source: plan.verdictSource,
        settlement: plan.settlement,
        verdict,
        downstream: verdict.downstream,
        scoring,
        review: null,
        ruleVersion: base.ruleVersion,
        reasons: base.reasons,
      };
    },

    async transition(event, review, step) {
      const state = transitionState(review.state, step);
      if (state === "DISCARDED" && review.exceptionMarked) {
        deps.exceptionQueue.settle(exceptionKeyOf(event), "DISCARDED");
      }
      return {
        state,
        plan: null,
        source: null,
        settlement: "NONE",
        verdict: null,
        downstream: null,
        scoring: { status: "NOT_CALLED", reason: "NO_VERDICT" },
        review: isTerminal(state) ? null : { ...review, state },
        ruleVersion: null,
        reasons: [],
      };
    },

    async complete(event, review, decision) {
      const state = completeState(review.state, decision.source);
      const verdict = createVerdict(
        decision.classification,
        decision.classification === "BLOCK" ? review.penaltyHits : [],
      );
      const scoring = await scoreVerdict(deps.scoring, event, verdict, decision.source);
      if (review.exceptionMarked) deps.exceptionQueue.settle(exceptionKeyOf(event), decision.source);
      return {
        state,
        plan: null,
        source: decision.source,
        settlement: "NONE",
        verdict,
        downstream: verdict.downstream,
        scoring,
        review: null,
        ruleVersion: null,
        reasons: [],
      };
    },
  };
}

function reachesFastPass(score: number | null, threshold: number | null): boolean {
  return score !== null && threshold !== null && score >= threshold;
}

/** One deduction per deducting group. The scoring module takes the largest of them, so repeats add nothing. */
function penaltyHitsOf(hits: readonly RuleHit[]): PenaltyHit[] {
  const points = new Map<string, number>();
  for (const hit of hits) {
    if (hit.action.kind === "DEDUCT") points.set(hit.groupId, hit.action.deduction);
  }
  return [...points].map(([code, value]) => ({ code, points: value }));
}

function resolutionOf(source: DecisionSource): ExceptionResolution {
  switch (source) {
    case "BASE_RULE":
      return "BASE_BLOCK";
    case "MODEL":
      return "MODEL";
    case "MANUAL":
      return "MANUAL";
    case "FAST_PASS":
      // The truth table never fast-passes an exception message, so this is unreachable. It is refused rather than guessed.
      throw new Error("a fast pass cannot close an exception entry");
  }
}

/** A fast pass has no verdict to score. Any other verdict goes to the scoring port, and a refusal is reported, not thrown. */
async function scoreVerdict(
  scoring: ScoringPort,
  event: ChannelEvent,
  verdict: Verdict,
  source: DecisionSource,
): Promise<ScoringStatus> {
  if (source === "FAST_PASS") return { status: "NOT_CALLED", reason: "FAST_PASS" };
  try {
    const change = await scoring.applyVerdict(event, verdict);
    return { status: "APPLIED", delta: change.delta };
  } catch (error) {
    if (isExceptionRefusal(error)) return { status: "REFUSED", reason: "EXCEPTION_ACTIVE" };
    throw error;
  }
}

/**
 * The scoring module throws an error with code SCORING_REFUSED when the subject is on the exception list. The router
 * cannot import that class, because modules may import only the contracts and their own files, so it reads the code.
 */
function isExceptionRefusal(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, reason } = error as { code?: unknown; reason?: unknown };
  return code === "SCORING_REFUSED" && reason === "EXCEPTION_ACTIVE";
}
