import type { TaskStatus } from "@voxward/contracts";

/**
 * Processing states of one event after it has been routed (proposal section 4.1 and section 7). The downstream
 * receives only ALLOW or BLOCK; these states say what is still open. DONE and DISCARDED are terminal.
 */
export const PROCESSING_STATES = [
  "QUEUED",
  "RUNNING",
  "PENDING_REVIEW",
  "SYSTEM_FAILED",
  "MANUAL_TAKEOVER",
  "DONE",
  "DISCARDED",
] as const;

export type ProcessingState = (typeof PROCESSING_STATES)[number];

/** A step that moves an open review item from one state to another. */
export const REVIEW_STEPS = ["START", "SYSTEM_FAILURE", "RETRY", "ESCALATE", "TAKE_OVER", "RELEASE", "DISCARD"] as const;

export type ReviewStep = (typeof REVIEW_STEPS)[number];

/** Who decided the final verdict. A model verdict finishes a RUNNING item; a human verdict finishes a taken-over one. */
export type CompletionSource = "MODEL" | "MANUAL";

const STEP_TABLE: Readonly<Record<ReviewStep, { readonly from: readonly ProcessingState[]; readonly to: ProcessingState }>> =
  {
    START: { from: ["QUEUED"], to: "RUNNING" },
    SYSTEM_FAILURE: { from: ["RUNNING"], to: "SYSTEM_FAILED" },
    RETRY: { from: ["SYSTEM_FAILED"], to: "QUEUED" },
    ESCALATE: { from: ["SYSTEM_FAILED"], to: "PENDING_REVIEW" },
    TAKE_OVER: { from: ["QUEUED", "SYSTEM_FAILED", "PENDING_REVIEW"], to: "MANUAL_TAKEOVER" },
    RELEASE: { from: ["MANUAL_TAKEOVER"], to: "PENDING_REVIEW" },
    DISCARD: { from: ["QUEUED", "RUNNING", "PENDING_REVIEW", "SYSTEM_FAILED", "MANUAL_TAKEOVER"], to: "DISCARDED" },
  };

const COMPLETION_FROM: Readonly<Record<CompletionSource, ProcessingState>> = {
  MODEL: "RUNNING",
  MANUAL: "MANUAL_TAKEOVER",
};

export class ProcessingTransitionError extends Error {
  readonly code = "PROCESSING_TRANSITION_INVALID";
  readonly from: ProcessingState;
  readonly step: string;

  constructor(from: ProcessingState, step: string) {
    super(`processing transition refused: ${step} from ${from}`);
    this.name = "ProcessingTransitionError";
    this.from = from;
    this.step = step;
  }
}

export function isTerminal(state: ProcessingState): boolean {
  return state === "DONE" || state === "DISCARDED";
}

/** Returns the state after one step, or throws and leaves the caller's state unchanged. */
export function transitionState(from: ProcessingState, step: ReviewStep): ProcessingState {
  const rule = STEP_TABLE[step];
  if (!rule.from.includes(from)) throw new ProcessingTransitionError(from, step);
  return rule.to;
}

/** A final decision moves the item to DONE. Only the source that owns the item may decide it. */
export function completeState(from: ProcessingState, source: CompletionSource): ProcessingState {
  if (from !== COMPLETION_FROM[source]) throw new ProcessingTransitionError(from, `COMPLETE_${source}`);
  return "DONE";
}

/**
 * The value stored in `tasks.status`, whose CHECK allows only the contract's TASK_STATUSES. A system failure waits for a
 * retry or a person, so it is stored as PENDING_REVIEW. A takeover is work in progress, so it is stored as RUNNING
 * (S006 design 4.5, a self-chosen mapping).
 */
export function toStoredTaskStatus(state: ProcessingState): TaskStatus {
  switch (state) {
    case "QUEUED":
      return "QUEUED";
    case "RUNNING":
    case "MANUAL_TAKEOVER":
      return "RUNNING";
    case "PENDING_REVIEW":
    case "SYSTEM_FAILED":
      return "PENDING_REVIEW";
    case "DONE":
      return "DONE";
    case "DISCARDED":
      return "DISCARDED";
  }
}
