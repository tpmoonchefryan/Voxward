import { executeRequest } from "./cleanup-executor.js";
import { listRequestViews, mayHandleData, FORBIDDEN, recordVerification, registerRequest, requestDetail } from "./requests.js";
import { subjectPanel } from "./subject-lookup.js";
import type { DataActor, DataDeps, RouteResponse } from "./types.js";
import { parseOpaqueId, parseRegisterBody, parseVerificationBody } from "./validate.js";

const BAD_REQUEST: RouteResponse = { status: 400, body: { error: "INVALID_REQUEST" } };

/**
 * The data-panel routes as plain functions. The HTTP binding resolves the actor and writes the response. Every route
 * checks `data.handle` before it reads or validates its input, so a caller without the capability learns nothing from
 * the response shape.
 */
export interface DataRoutes {
  capabilities(actor: DataActor): RouteResponse;
  subject(actor: DataActor, subjectRef: unknown): RouteResponse;
  listRequests(actor: DataActor, subjectRef: unknown): RouteResponse;
  getRequest(actor: DataActor, requestId: unknown): RouteResponse;
  createRequest(actor: DataActor, body: unknown): RouteResponse;
  decideVerification(actor: DataActor, requestId: unknown, body: unknown): RouteResponse;
  /** Starts or resumes a verified request: a deletion is cleaned surface by surface, a RESUME_SCORING lifts the exception. */
  execute(actor: DataActor, requestId: unknown): RouteResponse;
}

export function createDataRoutes(deps: DataDeps): DataRoutes {
  return {
    capabilities: (actor) => ({ status: 200, body: { dataHandle: mayHandleData(actor) } }),

    subject(actor, subjectRef) {
      if (!mayHandleData(actor)) return FORBIDDEN;
      const ref = parseOpaqueId(subjectRef);
      return ref === undefined ? BAD_REQUEST : subjectPanel(deps, actor, ref);
    },

    listRequests(actor, subjectRef) {
      if (!mayHandleData(actor)) return FORBIDDEN;
      const ref = parseOpaqueId(subjectRef);
      return ref === undefined ? BAD_REQUEST : listRequestViews(deps, actor, ref);
    },

    getRequest(actor, requestId) {
      if (!mayHandleData(actor)) return FORBIDDEN;
      const id = parseOpaqueId(requestId);
      return id === undefined ? BAD_REQUEST : requestDetail(deps, actor, id);
    },

    createRequest(actor, body) {
      if (!mayHandleData(actor)) return FORBIDDEN;
      const parsed = parseRegisterBody(body);
      return parsed.ok ? registerRequest(deps, actor, parsed.value) : BAD_REQUEST;
    },

    decideVerification(actor, requestId, body) {
      if (!mayHandleData(actor)) return FORBIDDEN;
      const id = parseOpaqueId(requestId);
      const parsed = parseVerificationBody(body);
      if (id === undefined || !parsed.ok) return BAD_REQUEST;
      return recordVerification(deps, actor, id, parsed.value);
    },

    execute(actor, requestId) {
      if (!mayHandleData(actor)) return FORBIDDEN;
      const id = parseOpaqueId(requestId);
      return id === undefined ? BAD_REQUEST : executeRequest(deps, actor, id);
    },
  };
}
