import type { DeleteMode } from "@voxward/contracts";
import type { RegisterInput } from "./api";

/**
 * The delete confirmation as a pure state machine. A request is sent only after the user confirms, and a second
 * confirm while one is in flight is ignored, so a double click cannot register two requests.
 */
export type DeleteFlow =
  | { readonly phase: "idle" }
  | { readonly phase: "confirming"; readonly mode: DeleteMode; readonly errorCode: string | null }
  | { readonly phase: "submitting"; readonly mode: DeleteMode }
  | { readonly phase: "registered"; readonly mode: DeleteMode; readonly requestId: string };

export type DeleteFlowEvent =
  | { readonly type: "choose"; readonly mode: DeleteMode }
  | { readonly type: "cancel" }
  | { readonly type: "confirm" }
  | { readonly type: "registered"; readonly requestId: string }
  | { readonly type: "failed"; readonly code: string };

export const IDLE_FLOW: DeleteFlow = { phase: "idle" };

export function reduceDeleteFlow(state: DeleteFlow, event: DeleteFlowEvent): DeleteFlow {
  switch (event.type) {
    case "choose":
      return state.phase === "submitting" ? state : { phase: "confirming", mode: event.mode, errorCode: null };
    case "cancel":
      return state.phase === "submitting" ? state : IDLE_FLOW;
    case "confirm":
      return state.phase === "confirming" ? { phase: "submitting", mode: state.mode } : state;
    case "registered":
      return state.phase === "submitting" ? { phase: "registered", mode: state.mode, requestId: event.requestId } : state;
    case "failed":
      // A failed submission returns to the confirmation, so the user keeps the choice and sees the reason.
      return state.phase === "submitting" ? { phase: "confirming", mode: state.mode, errorCode: event.code } : state;
  }
}

/** The body for a deletion request. The operator initiates it from the panel, so the source is fixed. */
export function deleteRequestInput(subjectRef: string, mode: DeleteMode): RegisterInput {
  return { subjectRef, kind: "DELETE", mode, requestSource: "OPERATOR_INITIATED" };
}
