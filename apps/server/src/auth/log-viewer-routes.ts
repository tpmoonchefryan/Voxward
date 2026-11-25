import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { LogViewer, ViewerFailureCode, ViewerResult } from "@voxward/contracts";
import { z } from "zod";
import { readIntegrationLogs } from "../db/channel-settings-store.js";
import type { VoxwardDatabase } from "../db/client.js";
import { authenticateRequest } from "./guard.js";
import { channelAllowsCapability } from "./rbac-enforce.js";

export interface LogViewerRoutesOptions {
  readonly database: VoxwardDatabase;
  readonly viewer: LogViewer;
}

/** A refusal with a fixed code. The error handler sends the code and nothing else. */
class ViewerRouteFailure extends Error {
  readonly status: 400 | 401 | 403 | 404;
  readonly code: string;

  constructor(status: 400 | 401 | 403 | 404, code: string) {
    super(code);
    this.name = "ViewerRouteFailure";
    this.status = status;
    this.code = code;
  }
}

const LIST_QUERY = z.object({ cursor: z.string().max(256).optional(), limit: z.coerce.number().int().min(1).max(100).optional() }).strict();
const CHANGE_QUERY = LIST_QUERY.extend({ correlationId: z.string().max(128).optional() }).strict();

const STATUS_BY_FAILURE: Readonly<Record<ViewerFailureCode, 400 | 403 | 404>> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_REQUEST: 400,
};

/**
 * Internal viewer routes. They are the only log routes, they are GET only, and they take a session cookie. A downstream
 * output credential is a bearer token with no log capability, so it is refused here. Every answer is `no-store`.
 */
export const logViewerRoutes: FastifyPluginAsync<LogViewerRoutesOptions> = async (app: FastifyInstance, options) => {
  const { database, viewer } = options;

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ViewerRouteFailure) return reply.code(error.status).send({ error: error.code });
    const clientStatus = clientErrorStatus(error);
    if (clientStatus !== undefined) {
      request.log.warn({ errorCode: errorCodeOf(error) }, "log viewer route refused a request");
      return reply.code(clientStatus).send({ error: "INVALID_REQUEST" });
    }
    // Log only the error code. Driver messages can carry values from the request.
    request.log.error({ errorCode: errorCodeOf(error) }, "log viewer route failed");
    return reply.code(500).send({ error: "INTERNAL_ERROR" });
  });

  app.get<{ Params: { channelId: string } }>("/internal/channels/:channelId/logs/change", async (request, reply) => {
    const actorRef = sessionAccountOf(database, request);
    const query = parseQuery(CHANGE_QUERY, request.query);
    return send(
      reply,
      viewer.listChanges(actorRef, request.params.channelId, {
        cursor: query.cursor ?? null,
        limit: query.limit ?? null,
        correlationId: query.correlationId ?? null,
      }),
    );
  });

  app.get<{ Params: { channelId: string } }>("/internal/channels/:channelId/logs/technical", async (request, reply) => {
    const actorRef = sessionAccountOf(database, request);
    const query = parseQuery(LIST_QUERY, request.query);
    return send(
      reply,
      viewer.listTechnical(actorRef, request.params.channelId, { cursor: query.cursor ?? null, limit: query.limit ?? null }),
    );
  });

  app.get<{ Params: { channelId: string; logId: string } }>(
    "/internal/channels/:channelId/logs/technical/:logId",
    async (request, reply) => {
      const actorRef = sessionAccountOf(database, request);
      return send(reply, viewer.readTechnical(actorRef, request.params.channelId, request.params.logId));
    },
  );

  app.get<{ Params: { channelId: string; correlationId: string } }>(
    "/internal/channels/:channelId/logs/chains/:correlationId",
    async (request, reply) => {
      const actorRef = sessionAccountOf(database, request);
      const query = parseQuery(LIST_QUERY, request.query);
      return send(
        reply,
        viewer.readChain(actorRef, request.params.channelId, request.params.correlationId, {
          cursor: query.cursor ?? null,
          limit: query.limit ?? null,
        }),
      );
    },
  );

  app.get<{ Params: { channelId: string } }>(
    "/internal/channels/:channelId/logs/integration",
    async (request, reply) => {
      const actorRef = sessionAccountOf(database, request);
      if (!channelAllowsCapability(database, request.params.channelId, actorRef, "logs.view")) {
        throw new ViewerRouteFailure(403, "FORBIDDEN");
      }
      const query = parseQuery(CHANGE_QUERY, request.query);
      const all = readIntegrationLogs(database, request.params.channelId);
      const filtered = query.correlationId
        ? all.filter((item) => item.correlationId === query.correlationId)
        : all;
      const limit = query.limit ?? 50;
      const offset = query.cursor ? Math.max(0, Number.parseInt(query.cursor, 10) || 0) : 0;
      const page = filtered.slice(offset, offset + limit);
      const nextCursor = offset + page.length < filtered.length ? String(offset + page.length) : null;
      return reply.header("cache-control", "no-store").send({ items: page, nextCursor });
    },
  );
};

/** The signed-in account. A downstream credential, or no session at all, is refused before any viewer code runs. */
function sessionAccountOf(database: VoxwardDatabase, request: FastifyRequest): string {
  const allowed = authenticateRequest(database, { method: request.method, headers: request.headers, now: new Date() });
  if (!allowed.ok) throw new ViewerRouteFailure(allowed.status, allowed.code);
  if (allowed.principal.kind !== "account") throw new ViewerRouteFailure(403, "FORBIDDEN");
  return allowed.principal.accountId;
}

function parseQuery<T extends z.ZodType>(schema: T, raw: unknown): z.output<T> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ViewerRouteFailure(400, "INVALID_REQUEST");
  return parsed.data;
}

async function send<T>(reply: FastifyReply, result: ViewerResult<T>): Promise<FastifyReply> {
  if (!result.ok) throw new ViewerRouteFailure(STATUS_BY_FAILURE[result.code], result.code);
  return reply.header("cache-control", "no-store").send(result.value);
}

function clientErrorStatus(error: unknown): number | undefined {
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" && statusCode >= 400 && statusCode <= 499 ? statusCode : undefined;
}

function errorCodeOf(error: unknown): string | undefined {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
