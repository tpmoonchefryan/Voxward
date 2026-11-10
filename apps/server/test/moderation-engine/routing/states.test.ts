import { TASK_STATUSES } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  completeState,
  isTerminal,
  PROCESSING_STATES,
  ProcessingTransitionError,
  type ProcessingState,
  REVIEW_STEPS,
  type ReviewStep,
  toStoredTaskStatus,
  transitionState,
} from "../../../src/modules/moderation-engine/routing/states.js";

/** Every (step, from) pair the design allows. Any other pair must be refused. */
const ALLOWED: ReadonlyArray<readonly [ReviewStep, ProcessingState, ProcessingState]> = [
  ["START", "QUEUED", "RUNNING"],
  ["SYSTEM_FAILURE", "RUNNING", "SYSTEM_FAILED"],
  ["RETRY", "SYSTEM_FAILED", "QUEUED"],
  ["ESCALATE", "SYSTEM_FAILED", "PENDING_REVIEW"],
  ["TAKE_OVER", "QUEUED", "MANUAL_TAKEOVER"],
  ["TAKE_OVER", "SYSTEM_FAILED", "MANUAL_TAKEOVER"],
  ["TAKE_OVER", "PENDING_REVIEW", "MANUAL_TAKEOVER"],
  ["RELEASE", "MANUAL_TAKEOVER", "PENDING_REVIEW"],
  ["DISCARD", "QUEUED", "DISCARDED"],
  ["DISCARD", "RUNNING", "DISCARDED"],
  ["DISCARD", "PENDING_REVIEW", "DISCARDED"],
  ["DISCARD", "SYSTEM_FAILED", "DISCARDED"],
  ["DISCARD", "MANUAL_TAKEOVER", "DISCARDED"],
];

describe("review step transitions", () => {
  it.each(ALLOWED)("%s moves %s to %s", (step, from, to) => {
    expect(transitionState(from, step)).toBe(to);
  });

  it("refuses every other state and step pair, and names the state it refused from", () => {
    const allowed = new Set(ALLOWED.map(([step, from]) => `${step}:${from}`));
    for (const step of REVIEW_STEPS) {
      for (const state of PROCESSING_STATES) {
        if (allowed.has(`${step}:${state}`)) continue;
        expect(() => transitionState(state, step), `${step} from ${state}`).toThrow(ProcessingTransitionError);
      }
    }
  });

  it("keeps DONE and DISCARDED terminal: no step leaves them", () => {
    for (const state of ["DONE", "DISCARDED"] as const) {
      expect(isTerminal(state)).toBe(true);
      for (const step of REVIEW_STEPS) {
        expect(() => transitionState(state, step)).toThrow(ProcessingTransitionError);
      }
    }
    for (const state of ["QUEUED", "RUNNING", "PENDING_REVIEW", "SYSTEM_FAILED", "MANUAL_TAKEOVER"] as const) {
      expect(isTerminal(state)).toBe(false);
    }
  });
});

describe("final decisions", () => {
  it("lets a model verdict finish only a RUNNING item", () => {
    expect(completeState("RUNNING", "MODEL")).toBe("DONE");
    for (const state of ["QUEUED", "SYSTEM_FAILED", "PENDING_REVIEW", "MANUAL_TAKEOVER", "DONE", "DISCARDED"] as const) {
      expect(() => completeState(state, "MODEL"), state).toThrow(ProcessingTransitionError);
    }
  });

  it("lets a human verdict finish only a taken-over item", () => {
    expect(completeState("MANUAL_TAKEOVER", "MANUAL")).toBe("DONE");
    for (const state of ["QUEUED", "RUNNING", "PENDING_REVIEW", "SYSTEM_FAILED", "DONE"] as const) {
      expect(() => completeState(state, "MANUAL"), state).toThrow(ProcessingTransitionError);
    }
  });
});

describe("storage status", () => {
  it("maps every state onto a status that the tasks table accepts", () => {
    for (const state of PROCESSING_STATES) {
      expect(TASK_STATUSES).toContain(toStoredTaskStatus(state));
    }
  });

  it("stores a system failure as waiting for review, and a takeover as work in progress", () => {
    expect(toStoredTaskStatus("SYSTEM_FAILED")).toBe("PENDING_REVIEW");
    expect(toStoredTaskStatus("MANUAL_TAKEOVER")).toBe("RUNNING");
    expect(toStoredTaskStatus("DONE")).toBe("DONE");
    expect(toStoredTaskStatus("DISCARDED")).toBe("DISCARDED");
  });
});
