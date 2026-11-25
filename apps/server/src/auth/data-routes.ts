import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { VoxwardDatabase } from "../db/client.js";
import { authenticateRequest } from "./guard.js";
import { resolveChannelCapabilities } from "./rbac-enforce.js";

/**
 * HTTP binding for the data-panel routes. The module that implements them is bound by the composition layer, so this
 * zone never imports it. The handler types below match the module's shapes by structure.
 */
export interface DataRouteActor {
  readonly accountId: string;
  readonly channelId: string;
  readonly capabilities: ReadonlySet<string>;
}

export interface DataRouteResponse {
  readonly status: number;
  readonly body: unknown;
}

export interface DataRouteHandlers {
  capabilities(actor: DataRouteActor): DataRouteResponse;
  subject(actor: DataRouteActor, subjectRef: unknown): DataRouteResponse;
  listRequests(actor: DataRouteActor, subjectRef: unknown): DataRouteResponse;
  getRequest(actor: DataRouteActor, requestId: unknown): DataRouteResponse;
  createRequest(actor: DataRouteActor, body: unknown): DataRouteResponse;
  decideVerification(actor: DataRouteActor, requestId: unknown, body: unknown): DataRouteResponse;
  execute(actor: DataRouteActor, requestId: unknown): DataRouteResponse;
}

export interface DataLifecycleRoutesOptions {
  readonly database: VoxwardDatabase;
  readonly routes: DataRouteHandlers;
}

/** A refusal with a fixed code. The error handler writes the code and nothing else. */
class DataRouteFailure extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "DataRouteFailure";
    this.status = status;
    this.code = code;
  }
}

/**
 * Resolves the caller for one channel. A downstream output credential is never a member, so it is refused. An account
 * must hold an active membership in that channel. Its capabilities come from its role, and the module checks them.
 */
function actorFor(database: VoxwardDatabase, request: FastifyRequest, channelId: string): DataRouteActor {
  const allowed = authenticateRequest(database, { method: request.method, headers: request.headers, now: new Date() });
  if (!allowed.ok) throw new DataRouteFailure(allowed.status, allowed.code);
  if (allowed.principal.kind !== "account") throw new DataRouteFailure(403, "FORBIDDEN");
  const capabilities = resolveChannelCapabilities(database, channelId, allowed.principal.accountId);
  if (capabilities === null) throw new DataRouteFailure(403, "FORBIDDEN");
  return {
    accountId: allowed.principal.accountId,
    channelId,
    capabilities,
  };
}

function send(reply: FastifyReply, response: DataRouteResponse) {
  return reply.code(response.status).header("cache-control", "no-store").send(response.body);
}

/** Data-panel routes. Every response is no-store, and every refusal carries a fixed code. */
export const dataLifecycleRoutes: FastifyPluginAsync<DataLifecycleRoutesOptions> = async (
  app: FastifyInstance,
  options,
) => {
  const { database, routes } = options;

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DataRouteFailure) return reply.code(error.status).send({ error: error.code });
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode <= 499) {
      return reply.code(statusCode).send({ error: "INVALID_REQUEST" });
    }
    // Log only the error's code. Its message can repeat a value from the request.
    request.log.error({ errorCode: (error as { code?: unknown }).code }, "data route failed");
    return reply.code(500).send({ error: "INTERNAL_ERROR" });
  });

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/data/capabilities", async (request, reply) => {
    const actor = actorFor(database, request, request.params.channelId);
    return send(reply, routes.capabilities(actor));
  });

  app.get<{ Params: { channelId: string; subjectRef: string } }>(
    "/channels/:channelId/data/subjects/:subjectRef",
    async (request, reply) => {
      const actor = actorFor(database, request, request.params.channelId);
      return send(reply, routes.subject(actor, request.params.subjectRef));
    },
  );

  app.get<{ Params: { channelId: string }; Querystring: { subjectRef?: unknown } }>(
    "/channels/:channelId/data/requests",
    async (request, reply) => {
      const actor = actorFor(database, request, request.params.channelId);
      return send(reply, routes.listRequests(actor, request.query.subjectRef));
    },
  );

  app.get<{ Params: { channelId: string; requestId: string } }>(
    "/channels/:channelId/data/requests/:requestId",
    async (request, reply) => {
      const actor = actorFor(database, request, request.params.channelId);
      return send(reply, routes.getRequest(actor, request.params.requestId));
    },
  );

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/data/requests",
    async (request, reply) => {
      const actor = actorFor(database, request, request.params.channelId);
      return send(reply, routes.createRequest(actor, request.body));
    },
  );

  app.post<{ Params: { channelId: string; requestId: string }; Body: unknown }>(
    "/channels/:channelId/data/requests/:requestId/verification",
    async (request, reply) => {
      const actor = actorFor(database, request, request.params.channelId);
      return send(reply, routes.decideVerification(actor, request.params.requestId, request.body));
    },
  );

  app.post<{ Params: { channelId: string; requestId: string } }>(
    "/channels/:channelId/data/requests/:requestId/execute",
    async (request, reply) => {
      const actor = actorFor(database, request, request.params.channelId);
      return send(reply, routes.execute(actor, request.params.requestId));
    },
  );
};
