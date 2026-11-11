import { MODERATION_ROUTES, toDownstreamVerdict } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { type PlanInput, planRoute, type RoutePlan } from "../../../src/modules/moderation-engine/routing/truth-table.js";

function allInputs(): PlanInput[] {
  const inputs: PlanInput[] = [];
  for (const baseRoute of MODERATION_ROUTES) {
    for (const exceptionMarked of [false, true]) {
      for (const paidText of [false, true]) {
        for (const whitelisted of [false, true]) {
          for (const noise of [false, true]) {
            for (const scoreReachesFastPass of [false, true]) {
              inputs.push({ baseRoute, exceptionMarked, paidText, whitelisted, noise, scoreReachesFastPass });
            }
          }
        }
      }
    }
  }
  return inputs;
}

function label(input: PlanInput): string {
  const flags = [
    input.exceptionMarked && "exception",
    input.paidText && "paid",
    input.whitelisted && "whitelist",
    input.noise && "noise",
    input.scoreReachesFastPass && "score",
  ].filter(Boolean);
  return `${input.baseRoute} + ${flags.length === 0 ? "plain" : flags.join(" + ")}`;
}

describe("truth table invariants over all 96 input combinations", () => {
  const inputs = allInputs();

  it("enumerates exactly 3 x 2 x 2 x 2 x 2 x 2 = 96 combinations", () => {
    expect(inputs).toHaveLength(96);
  });

  it.each(inputs.map((input) => [label(input), input] as const))("%s", (_name, input) => {
    const plan: RoutePlan = planRoute(input);

    if (plan.kind === "FINAL") {
      // Only ALLOW or BLOCK reaches downstream, and an allow is never a model meaningful verdict.
      expect(["ALLOW", "BLOCK"]).toContain(toDownstreamVerdict(plan.classification));
      expect(plan.classification).not.toBe("ALLOW_MEANINGFUL");
    }

    if (input.baseRoute === "BLOCK") {
      expect(plan).toEqual({ kind: "FINAL", verdictSource: "BASE_RULE", classification: "BLOCK", settlement: "NONE", reason: "BASE_BLOCK" });
    }

    if (input.baseRoute !== "BLOCK" && input.exceptionMarked) {
      // An exception message is always reviewed, paid or not, and never fast-passed. The flowchart (proposal 4.2)
      // checks the exception before the paid text.
      expect(plan).toMatchObject({ kind: "REVIEW", taskKind: "REALTIME_REVIEW", exception: true, reason: "EXCEPTION" });
    }

    if (input.baseRoute !== "BLOCK" && !input.exceptionMarked && input.paidText) {
      // Paid text is not skipped by a fast lane, whatever else holds.
      expect(plan).toMatchObject({ kind: "REVIEW", taskKind: "PAID_TEXT_REVIEW", exception: false, reason: "PAID_TEXT" });
    }

    if (plan.kind === "FINAL" && plan.verdictSource === "FAST_PASS") {
      // A fast lane needs a passed basic check, and no paid text or exception.
      expect(input.baseRoute).toBe("PASS");
      expect(input.paidText).toBe(false);
      expect(input.exceptionMarked).toBe(false);
    }

    if (input.baseRoute === "REVIEW") {
      // A message the basic check did not pass is never finalized by the table; only a BLOCK is.
      expect(plan.kind).toBe("REVIEW");
    }

    if (plan.kind === "FINAL" && plan.settlement === "UNSETTLED_FAST_PASS") {
      // The score lane alone leaves a score effect to settle, and it adds no reward now.
      expect(plan.reason).toBe("SCORE_FAST_PASS");
      expect(plan.classification).toBe("ALLOW_NOISE");
    }

    if (plan.kind === "REVIEW") {
      expect(input.baseRoute === "BLOCK").toBe(false);
    }
  });
});

describe("truth table rows", () => {
  const plain = { baseRoute: "PASS", exceptionMarked: false, paidText: false, whitelisted: false, noise: false, scoreReachesFastPass: false } as const;

  it("R1: a basic-check BLOCK is final, even for an exception, paid text, a whitelist or a high score", () => {
    expect(planRoute({ ...plain, baseRoute: "BLOCK", exceptionMarked: true, paidText: true, whitelisted: true, scoreReachesFastPass: true })).toEqual({
      kind: "FINAL",
      verdictSource: "BASE_RULE",
      classification: "BLOCK",
      settlement: "NONE",
      reason: "BASE_BLOCK",
    });
  });

  it("R2: an exception message is reviewed, not noise and not whitelisted", () => {
    expect(planRoute({ ...plain, exceptionMarked: true, whitelisted: true, noise: true, scoreReachesFastPass: true })).toEqual({
      kind: "REVIEW",
      taskKind: "REALTIME_REVIEW",
      exception: true,
      reason: "EXCEPTION",
    });
  });

  it("R2: an exception message that is also paid text is reviewed as an exception, following the flowchart order", () => {
    expect(planRoute({ ...plain, exceptionMarked: true, paidText: true, whitelisted: true, scoreReachesFastPass: true })).toEqual({
      kind: "REVIEW",
      taskKind: "REALTIME_REVIEW",
      exception: true,
      reason: "EXCEPTION",
    });
  });

  it("R3: paid text goes to safety review even when the subject is whitelisted and above the fast-pass score", () => {
    expect(planRoute({ ...plain, paidText: true, whitelisted: true, scoreReachesFastPass: true })).toEqual({
      kind: "REVIEW",
      taskKind: "PAID_TEXT_REVIEW",
      exception: false,
      reason: "PAID_TEXT",
    });
  });

  it("R4: a message the basic check did not pass cannot be fast-passed", () => {
    expect(planRoute({ ...plain, baseRoute: "REVIEW", whitelisted: true, noise: true, scoreReachesFastPass: true })).toEqual({
      kind: "REVIEW",
      taskKind: "REALTIME_REVIEW",
      exception: false,
      reason: "BASE_REVIEW",
    });
  });

  it("R5: deterministic noise is an allow with no score effect", () => {
    expect(planRoute({ ...plain, noise: true, scoreReachesFastPass: true })).toEqual({
      kind: "FINAL",
      verdictSource: "FAST_PASS",
      classification: "ALLOW_NOISE",
      settlement: "NONE",
      reason: "NOISE",
    });
  });

  it("R6: a whitelisted message is an allow that is not counted as a model-checked meaningful one", () => {
    expect(planRoute({ ...plain, whitelisted: true, scoreReachesFastPass: true })).toEqual({
      kind: "FINAL",
      verdictSource: "FAST_PASS",
      classification: "ALLOW_NOISE",
      settlement: "NONE",
      reason: "WHITELIST",
    });
  });

  it("R7: a score at the fast-pass threshold is an allow with an unsettled marker and no reward", () => {
    expect(planRoute({ ...plain, scoreReachesFastPass: true })).toEqual({
      kind: "FINAL",
      verdictSource: "FAST_PASS",
      classification: "ALLOW_NOISE",
      settlement: "UNSETTLED_FAST_PASS",
      reason: "SCORE_FAST_PASS",
    });
  });

  it("R8: an ordinary passed message goes to AI review", () => {
    expect(planRoute(plain)).toEqual({ kind: "REVIEW", taskKind: "REALTIME_REVIEW", exception: false, reason: "NORMAL" });
  });
});
