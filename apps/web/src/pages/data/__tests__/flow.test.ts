import type { DeleteMode } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { IDLE_FLOW, deleteRequestInput, reduceDeleteFlow, type DeleteFlow } from "../flow";

const DATA_ONLY: DeleteMode = "DELETE_DATA_ONLY";
const EXCEPT: DeleteMode = "DELETE_AND_EXCEPT";

function confirmingFor(mode: DeleteMode): DeleteFlow {
  return reduceDeleteFlow(IDLE_FLOW, { type: "choose", mode });
}

describe("delete confirmation flow (VW-SUB034-AC001: both options are clear before anything is sent)", () => {
  it("sends nothing until the user confirms a chosen option", () => {
    const chosen = confirmingFor(DATA_ONLY);
    expect(chosen).toEqual({ phase: "confirming", mode: DATA_ONLY, errorCode: null });
    expect(reduceDeleteFlow(chosen, { type: "confirm" })).toEqual({ phase: "submitting", mode: DATA_ONLY });
  });

  it("ignores a second confirm while a request is in flight, so a double click registers once", () => {
    const submitting = reduceDeleteFlow(confirmingFor(EXCEPT), { type: "confirm" });
    expect(reduceDeleteFlow(submitting, { type: "confirm" })).toBe(submitting);
  });

  it("keeps the chosen option and the reason when the submission is refused", () => {
    const submitting = reduceDeleteFlow(confirmingFor(EXCEPT), { type: "confirm" });
    expect(reduceDeleteFlow(submitting, { type: "failed", code: "FORBIDDEN" })).toEqual({
      phase: "confirming",
      mode: EXCEPT,
      errorCode: "FORBIDDEN",
    });
  });

  it("cancels back to idle, but a cancel cannot interrupt a request that is in flight", () => {
    expect(reduceDeleteFlow(confirmingFor(DATA_ONLY), { type: "cancel" })).toBe(IDLE_FLOW);
    const submitting = reduceDeleteFlow(confirmingFor(DATA_ONLY), { type: "confirm" });
    expect(reduceDeleteFlow(submitting, { type: "cancel" })).toBe(submitting);
  });

  it("records the request id only once the submission has been accepted", () => {
    const submitting = reduceDeleteFlow(confirmingFor(EXCEPT), { type: "confirm" });
    expect(reduceDeleteFlow(submitting, { type: "registered", requestId: "req-1" })).toEqual({
      phase: "registered",
      mode: EXCEPT,
      requestId: "req-1",
    });
    expect(reduceDeleteFlow(IDLE_FLOW, { type: "registered", requestId: "req-2" })).toBe(IDLE_FLOW);
  });

  it("builds a different request body for each option, with the operator as the source", () => {
    expect(deleteRequestInput("subject-1", DATA_ONLY)).toEqual({
      subjectRef: "subject-1",
      kind: "DELETE",
      mode: DATA_ONLY,
      requestSource: "OPERATOR_INITIATED",
    });
    expect(deleteRequestInput("subject-1", EXCEPT).mode).toBe(EXCEPT);
    expect(deleteRequestInput("subject-1", DATA_ONLY)).not.toEqual(deleteRequestInput("subject-1", EXCEPT));
  });
});
