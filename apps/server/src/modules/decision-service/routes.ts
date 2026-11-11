import {
  createVerdict,
  INTERNAL_CLASSIFICATIONS,
  type DecisionActor,
  type CommitOutcome,
  type DecisionService,
  type InternalClassification,
} from "@voxward/contracts";

/** A route result. The HTTP binding writes the status and the body, and nothing else. */
export interface RouteResponse {
  readonly status: number;
  readonly body: unknown;
}

const BAD_REQUEST: RouteResponse = { status: 400, body: { error: "INVALID_REQUEST" } };
const MAX_ID_LENGTH = 128;

/**
 * The decision routes as plain functions. The binding resolves the actor from the session and the channel membership, so
 * the capabilities come from the server, never from the request body.
 */
export interface DecisionRoutes {
  commitTask(actor: DecisionActor, taskId: unknown, body: unknown): Promise<RouteResponse>;
}

export function createDecisionRoutes(service: DecisionService): DecisionRoutes {
  return {
    async commitTask(actor, taskId, body) {
      const id = parseOpaqueId(taskId);
      const classification = parseClassification(body);
      if (id === undefined || classification === undefined) return BAD_REQUEST;
      const outcome = await service.commit(id, createVerdict(classification), { kind: "HUMAN", actor });
      return responseOf(outcome);
    },
  };
}

/** Maps a module outcome to a status. A conflict is 409 and carries the current decision, so the operator can see it. */
export function responseOf(outcome: CommitOutcome): RouteResponse {
  switch (outcome.status) {
    case "committed":
      return {
        status: 200,
        body: {
          status: "committed",
          seq: outcome.seq,
          verdict: outcome.intent.verdict,
          deliverySequence: outcome.intent.deliverySequence,
          validUntil: outcome.intent.validUntil,
          scoring: outcome.scoring,
        },
      };
    case "conflict":
      return { status: 409, body: { status: "conflict", reason: outcome.reason, current: outcome.current } };
    case "denied":
      return { status: 403, body: { error: "FORBIDDEN" } };
  }
}

function parseOpaqueId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.trim() === "" || value.length > MAX_ID_LENGTH) return undefined;
  return value;
}

function parseClassification(body: unknown): InternalClassification | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const value = (body as { classification?: unknown }).classification;
  return typeof value === "string" && (INTERNAL_CLASSIFICATIONS as readonly string[]).includes(value)
    ? (value as InternalClassification)
    : undefined;
}
