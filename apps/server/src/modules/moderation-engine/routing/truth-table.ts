import type { InternalClassification, ModerationRoute } from "@voxward/contracts";

/** Whether a final ALLOW has a provisional score effect still to settle (proposal section 5.4). */
export type SettlementState = "NONE" | "UNSETTLED_FAST_PASS";

/** Work an open item needs: model or safety review, or the realtime review of an exception or uncertain message. */
export type TaskKind = "REALTIME_REVIEW" | "PAID_TEXT_REVIEW";

/** Why the plan chose its row. Each reason names one row of the truth table. */
export type PlanReason =
  | "BASE_BLOCK"
  | "PAID_TEXT"
  | "EXCEPTION"
  | "BASE_REVIEW"
  | "NOISE"
  | "WHITELIST"
  | "SCORE_FAST_PASS"
  | "NORMAL";

/** The facts a plan needs. The router derives `noise` and `scoreReachesFastPass`; the rest come from the caller. */
export interface PlanInput {
  readonly baseRoute: ModerationRoute;
  readonly exceptionMarked: boolean;
  readonly paidText: boolean;
  readonly whitelisted: boolean;
  readonly noise: boolean;
  readonly scoreReachesFastPass: boolean;
}

/**
 * FINAL is decided at routing time, by the basic check or by a fast lane. REVIEW waits for a model or a person; its
 * verdict comes later through the router's completion. A FINAL plan never carries MODEL or MANUAL as its source.
 */
export type RoutePlan =
  | {
      readonly kind: "FINAL";
      readonly verdictSource: "BASE_RULE" | "FAST_PASS";
      readonly classification: InternalClassification;
      readonly settlement: SettlementState;
      readonly reason: PlanReason;
    }
  | {
      readonly kind: "REVIEW";
      readonly taskKind: TaskKind;
      readonly exception: boolean;
      readonly reason: PlanReason;
    };

/**
 * The unified routing truth table (proposal section 4.2; S006 design 4.3). Rows are evaluated in order, and the first
 * matching row decides. The order follows the proposal flowchart: a basic-check BLOCK is final, an exception subject
 * is reviewed before paid text is considered, and paid text is never skipped. No fast lane applies to an exception
 * subject or to a message the basic check did not pass.
 */
export function planRoute(input: PlanInput): RoutePlan {
  if (input.baseRoute === "BLOCK") return final("BASE_RULE", "BLOCK", "NONE", "BASE_BLOCK");
  if (input.exceptionMarked) return review("REALTIME_REVIEW", true, "EXCEPTION");
  if (input.paidText) return review("PAID_TEXT_REVIEW", false, "PAID_TEXT");
  if (input.baseRoute === "REVIEW") return review("REALTIME_REVIEW", false, "BASE_REVIEW");
  if (input.noise) return final("FAST_PASS", "ALLOW_NOISE", "NONE", "NOISE");
  if (input.whitelisted) return final("FAST_PASS", "ALLOW_NOISE", "NONE", "WHITELIST");
  if (input.scoreReachesFastPass) {
    return final("FAST_PASS", "ALLOW_NOISE", "UNSETTLED_FAST_PASS", "SCORE_FAST_PASS");
  }
  return review("REALTIME_REVIEW", false, "NORMAL");
}

function final(
  verdictSource: "BASE_RULE" | "FAST_PASS",
  classification: InternalClassification,
  settlement: SettlementState,
  reason: PlanReason,
): RoutePlan {
  return { kind: "FINAL", verdictSource, classification, settlement, reason };
}

function review(taskKind: TaskKind, exception: boolean, reason: PlanReason): RoutePlan {
  return { kind: "REVIEW", taskKind, exception, reason };
}
