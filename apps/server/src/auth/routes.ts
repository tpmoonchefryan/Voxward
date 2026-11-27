import fastifyRateLimit from "@fastify/rate-limit";
import { OUTPUT_GRANT_KINDS, type OutputGrantKind } from "@voxward/contracts";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { VoxwardDatabase } from "../db/client.js";
import { readShellPreferences, writeShellPreferences } from "../db/channel-settings-store.js";
import { createApprovedContentPort, revokeOutputGrant } from "../db/output-store.js";
import { authAccounts, CHANNEL_ROLES, channelEvents, deliveries, verdicts } from "../db/schema/index.js";
import { runShortTransaction } from "../db/transaction.js";
import { issueOutputToken, revokeOutputToken } from "./downstream-tokens.js";
import { issueNativeGrant } from "./output-grants.js";
import { createLoginRateLimiter, login, ScryptOverloadedError, type LoginRateLimiter } from "./login.js";
import {
  findActiveMembership,
  grantMembership,
  listActiveMembers,
  revokeMembership,
  wouldLeaveChannelWithoutOwner,
} from "./members.js";
import {
  authenticateRequest,
  authorizeBatch,
  authorizeChannel,
  SESSION_COOKIE,
  type Allowed,
  type Principal,
} from "./guard.js";
import { capabilitiesOfMembership, type Capability, type ChannelRole } from "./permissions.js";
import {
  buildRouteRateLimitConfig,
  DEFAULT_HTTP_RATE_LIMITS,
  ROUTE_RATE_LIMIT_PLUGIN_OPTIONS,
  type HttpRateLimitSettings,
} from "./rate-limit.js";
import { resolveChannelAccess } from "./rbac-enforce.js";
import { DEFAULT_SESSION_TTL_MS, revokeSession } from "./session.js";

export interface AuthRoutesOptions {
  readonly database: VoxwardDatabase;
  /** Runs after a native output grant is revoked, so the consumers it opened are closed at once. */
  readonly onOutputGrantRevoked?: (grantId: string) => void;
  /** Optional custom login brute-force limiter (defaults to createLoginRateLimiter()). */
  readonly loginRateLimiter?: LoginRateLimiter;
  /** Optional HTTP route rate-limit overrides (primarily for deterministic testing). */
  readonly httpRateLimits?: HttpRateLimitSettings;
}

/** A refusal with a stable code. The error handler turns it into a JSON body with no detail beyond the code. */
class RouteFailure extends Error {
  readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 503;
  readonly code: string;
  readonly index?: number;
  readonly retryAfterSeconds?: number;

  constructor(status: 400 | 401 | 403 | 404 | 409 | 429 | 503, code: string, index?: number, retryAfterSeconds?: number) {
    super(code);
    this.name = "RouteFailure";
    this.status = status;
    this.code = code;
    this.index = index;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Fastify's own refusals of a request body, by Fastify error code. Any other 4xx refusal is INVALID_REQUEST. */
const FASTIFY_REFUSAL_CODES = new Map<string, string>([
  ["FST_ERR_CTP_INVALID_JSON_BODY", "INVALID_JSON"],
  ["FST_ERR_CTP_EMPTY_JSON_BODY", "INVALID_JSON"],
  ["FST_ERR_CTP_INVALID_MEDIA_TYPE", "UNSUPPORTED_MEDIA_TYPE"],
  ["FST_ERR_CTP_BODY_TOO_LARGE", "PAYLOAD_TOO_LARGE"],
]);

function errorCodeOf(error: unknown): string | undefined {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** Returns the status and fixed code for a Fastify error that means the client sent something unacceptable. */
function fastifyRefusal(error: unknown): { readonly status: number; readonly code: string } | undefined {
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof statusCode !== "number" || statusCode < 400 || statusCode > 499) return undefined;
  const code = errorCodeOf(error);
  return { status: statusCode, code: (code === undefined ? undefined : FASTIFY_REFUSAL_CODES.get(code)) ?? "INVALID_REQUEST" };
}

const ID = z.string().min(1).max(128);
const ROLE = z.enum(CHANNEL_ROLES);

const LOGIN_BODY = z
  .object({ loginName: z.string().min(1).max(64), password: z.string().min(1).max(512) })
  .strict();
const MEMBER_BODY = z.object({ accountId: ID, role: ROLE, logAccess: z.boolean(), dataAdmin: z.boolean().optional() }).strict();
const BATCH_BODY = z
  .object({
    items: z
      .array(z.object({ channelId: ID, accountId: ID, role: ROLE, logAccess: z.boolean(), dataAdmin: z.boolean().optional() }).strict())
      .min(1)
      .max(100),
  })
  .strict();
const SHELL_PREF_QUERY = z
  .object({
    product: z.string().min(1).max(64).optional(),
    tenant: z.string().min(1).max(64).optional(),
  })
  .strict();
const SHELL_PREF_BODY = z
  .object({
    product: z.string().min(1).max(64).optional(),
    tenant: z.string().min(1).max(64).optional(),
    pins: z.array(z.string().min(1).max(64)).max(24),
    rightPins: z.array(z.string().min(1).max(64)).max(24).optional(),
    theme: z.enum(["light", "dark", "halloween"]).optional(),
    locale: z.enum(["en", "zh-CN", "ja", "ko", "fr"]).optional(),
    density: z.enum(["compact", "comfortable"]).optional(),
  })
  .strict()
  .refine((b) => new Set(b.pins).size === b.pins.length, { message: "duplicate pins rejected" });

function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new RouteFailure(400, "INVALID_REQUEST");
  return parsed.data;
}

function principalOf(database: VoxwardDatabase, request: FastifyRequest): Allowed {
  const result = authenticateRequest(database, { method: request.method, headers: request.headers, now: new Date() });
  if (!result.ok) throw new RouteFailure(result.status, result.code);
  return result;
}

function requireDelegationAllowed(
  database: VoxwardDatabase,
  allowed: Allowed,
  channelId: string,
  target: {
    readonly accountId: string;
    readonly nextRole: ChannelRole | null;
    readonly logAccess: boolean;
    readonly dataAdmin: boolean;
  },
): void {
  if (allowed.principal.kind !== "account") {
    throw new RouteFailure(403, "FORBIDDEN");
  }
  const actorAccess = resolveChannelAccess(database, channelId, allowed.principal.accountId);
  if (actorAccess === null) {
    throw new RouteFailure(403, "FORBIDDEN");
  }
  if (actorAccess.membership.role === "CHANNEL_OWNER") {
    return;
  }
  const existingTarget = findActiveMembership(database, channelId, target.accountId);
  if (existingTarget?.role === "CHANNEL_OWNER") {
    throw new RouteFailure(403, "FORBIDDEN");
  }
  if (target.nextRole !== null) {
    if (target.nextRole === "CHANNEL_OWNER") {
      throw new RouteFailure(403, "FORBIDDEN");
    }
    const targetCaps = capabilitiesOfMembership({
      role: target.nextRole,
      logAccess: target.logAccess,
      dataAdmin: target.dataAdmin,
    });
    if (targetCaps.some((cap) => !actorAccess.capabilities.has(cap))) {
      throw new RouteFailure(403, "FORBIDDEN");
    }
  }
}

function requireCapability(database: VoxwardDatabase, allowed: Allowed, channelId: string, capability: Capability): void {
  const scope = authorizeChannel(database, allowed.principal, { channelId, capability });
  if (!scope.ok) throw new RouteFailure(403, "FORBIDDEN");
}

/** Session-only routes. A downstream credential is not a session, so it is refused here. */
function requireSession(allowed: Allowed): { accountId: string; displayName: string; sessionToken: string; csrfToken: string } {
  const principal: Principal = allowed.principal;
  if (principal.kind !== "account" || allowed.sessionToken === undefined || allowed.csrfToken === undefined) {
    throw new RouteFailure(403, "FORBIDDEN");
  }
  return {
    accountId: principal.accountId,
    displayName: principal.displayName,
    sessionToken: allowed.sessionToken,
    csrfToken: allowed.csrfToken,
  };
}

function requireKnownAccount(database: VoxwardDatabase, accountId: string): void {
  const row = database.orm.select({ id: authAccounts.id }).from(authAccounts).where(eq(authAccounts.id, accountId)).get();
  if (row === undefined) throw new RouteFailure(400, "ACCOUNT_NOT_FOUND");
}

const SESSION_COOKIE_ATTRIBUTES = "Path=/; HttpOnly; Secure; SameSite=Strict";

function setSessionCookie(reply: FastifyReply, token: string): void {
  const maxAge = Math.floor(DEFAULT_SESSION_TTL_MS / 1000);
  void reply.header("set-cookie", `${SESSION_COOKIE}=${token}; ${SESSION_COOKIE_ATTRIBUTES}; Max-Age=${maxAge}`);
}

function clearSessionCookie(reply: FastifyReply): void {
  void reply.header("set-cookie", `${SESSION_COOKIE}=; ${SESSION_COOKIE_ATTRIBUTES}; Max-Age=0`);
}

/**
 * Authentication routes and the channel administration routes they protect. Every route that changes state
 * runs its check before the write, and every write is one short transaction.
 */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app: FastifyInstance, options) => {
  const { database } = options;
  const loginLimiter = options.loginRateLimiter ?? createLoginRateLimiter();
  const approvedContent = createApprovedContentPort(database);
  const windowMs = options.httpRateLimits?.windowMs ?? DEFAULT_HTTP_RATE_LIMITS.windowMs;
  const loginRateConfig = buildRouteRateLimitConfig(
    options.httpRateLimits?.loginMax ?? DEFAULT_HTTP_RATE_LIMITS.loginMax,
    windowMs,
    "TOO_MANY_ATTEMPTS",
  );
  const batchMembersRateConfig = buildRouteRateLimitConfig(
    options.httpRateLimits?.batchMembersMax ?? DEFAULT_HTTP_RATE_LIMITS.batchMembersMax,
    windowMs,
    "RATE_LIMITED",
  );

  await app.register(fastifyRateLimit, ROUTE_RATE_LIMIT_PLUGIN_OPTIONS);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof RouteFailure) {
      if (error.retryAfterSeconds !== undefined) {
        void reply.header("retry-after", String(error.retryAfterSeconds));
      }
      const body = error.index === undefined ? { error: error.code } : { error: error.code, index: error.index };
      return reply.code(error.status).send(body);
    }
    if ((error as { statusCode?: unknown }).statusCode === 429) {
      const code = (error as { error?: unknown }).error;
      return reply.code(429).send({ error: typeof code === "string" ? code : "RATE_LIMITED" });
    }
    const refusal = fastifyRefusal(error);
    if (refusal !== undefined) {
      // A client error is a warning, not a server failure. The body is never logged.
      request.log.warn({ errorCode: errorCodeOf(error) }, "auth route refused a request");
      return reply.code(refusal.status).send({ error: refusal.code });
    }
    // Log only the error code. Messages from the driver can carry values from the request.
    request.log.error({ errorCode: errorCodeOf(error) }, "auth route failed");
    return reply.code(500).send({ error: "INTERNAL_ERROR" });
  });

  app.post(
    "/auth/login",
    {
      onRequest: app.rateLimit(loginRateConfig),
      config: { rateLimit: loginRateConfig },
    },
    async (request, reply) => {
    const body = parseBody(LOGIN_BODY, request.body);
    const now = new Date();
    const ip = request.ip || "unknown";
    const verdict = loginLimiter.check({ ip, loginName: body.loginName, nowMs: now.getTime() });
    if (!verdict.allowed) {
      throw new RouteFailure(429, "TOO_MANY_ATTEMPTS", undefined, verdict.retryAfterSeconds ?? 60);
    }
    let result;
    try {
      result = await login(database, { loginName: body.loginName, password: body.password, now });
    } catch (error) {
      if (error instanceof ScryptOverloadedError) {
        throw new RouteFailure(503, "AUTH_BUSY", undefined, 5);
      }
      throw error;
    }
    if (!result.ok) {
      loginLimiter.recordFailure({ ip, loginName: body.loginName, nowMs: now.getTime() });
      throw new RouteFailure(401, "INVALID_CREDENTIALS");
    }
    loginLimiter.recordSuccess({ ip, loginName: body.loginName });
    setSessionCookie(reply, result.session.token);
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({ accountId: result.accountId, displayName: result.displayName, csrfToken: result.session.csrfToken });
  });

  app.post("/auth/logout", async (request, reply) => {
    const session = requireSession(principalOf(database, request));
    runShortTransaction(database, (tx) => {
      revokeSession(tx, session.sessionToken, new Date());
    });
    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get("/auth/session", async (request, reply) => {
    const session = requireSession(principalOf(database, request));
    return reply
      .header("cache-control", "no-store")
      .send({ accountId: session.accountId, displayName: session.displayName, csrfToken: session.csrfToken });
  });

  app.get("/auth/shell-preferences", async (request, reply) => {
    const session = requireSession(principalOf(database, request));
    const parsedQuery = SHELL_PREF_QUERY.safeParse(request.query ?? {});
    if (!parsedQuery.success) throw new RouteFailure(400, "INVALID_REQUEST");
    const tenant = parsedQuery.data.tenant ?? "default";
    const product = parsedQuery.data.product ?? "voxward";
    const state = readShellPreferences(database, { accountId: session.accountId, tenant, product });
    return reply.header("cache-control", "no-store").send({
      accountId: session.accountId,
      tenant,
      product,
      ...state,
    });
  });

  app.put("/auth/shell-preferences", async (request, reply) => {
    const session = requireSession(principalOf(database, request));
    const body = parseBody(SHELL_PREF_BODY, request.body);
    const tenant = body.tenant ?? "default";
    const product = body.product ?? "voxward";
    const current = readShellPreferences(database, { accountId: session.accountId, tenant, product });
    const saved = writeShellPreferences(database, {
      accountId: session.accountId,
      tenant,
      product,
      state: {
        pins: body.pins,
        rightPins: body.rightPins ?? current.rightPins,
        theme: body.theme ?? current.theme,
        locale: body.locale ?? current.locale,
        density: body.density ?? current.density,
      },
      now: new Date(),
    });
    return reply.header("cache-control", "no-store").send({
      accountId: session.accountId,
      tenant,
      product,
      ...saved,
    });
  });

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/members", async (request) => {
    const allowed = principalOf(database, request);
    const { channelId } = request.params;
    requireCapability(database, allowed, channelId, "members.manage");
    return listActiveMembers(database, channelId);
  });

  app.post<{ Params: { channelId: string } }>("/channels/:channelId/members", async (request, reply) => {
    const allowed = principalOf(database, request);
    const { channelId } = request.params;
    requireCapability(database, allowed, channelId, "members.manage");
    const body = parseBody(MEMBER_BODY, request.body);
    requireDelegationAllowed(database, allowed, channelId, {
      accountId: body.accountId,
      nextRole: body.role,
      logAccess: body.logAccess,
      dataAdmin: body.dataAdmin ?? false,
    });
    requireKnownAccount(database, body.accountId);
    const membership = runShortTransaction(database, (tx) => {
      if (wouldLeaveChannelWithoutOwner(tx, { channelId, accountId: body.accountId, nextRole: body.role })) {
        throw new RouteFailure(409, "LAST_OWNER_REQUIRED");
      }
      return grantMembership(tx, {
        channelId,
        accountId: body.accountId,
        role: body.role,
        logAccess: body.logAccess,
        dataAdmin: body.dataAdmin ?? false,
        now: new Date(),
      });
    });
    return reply.code(201).send(membership);
  });

  app.delete<{ Params: { channelId: string; accountId: string } }>(
    "/channels/:channelId/members/:accountId",
    async (request, reply) => {
      const allowed = principalOf(database, request);
      const { channelId, accountId } = request.params;
      requireCapability(database, allowed, channelId, "members.manage");
      requireDelegationAllowed(database, allowed, channelId, {
        accountId,
        nextRole: null,
        logAccess: false,
        dataAdmin: false,
      });
      const revoked = runShortTransaction(database, (tx) => {
        if (wouldLeaveChannelWithoutOwner(tx, { channelId, accountId, nextRole: null })) {
          throw new RouteFailure(409, "LAST_OWNER_REQUIRED");
        }
        return revokeMembership(tx, { channelId, accountId, now: new Date() });
      });
      if (!revoked) throw new RouteFailure(404, "MEMBERSHIP_NOT_FOUND");
      return reply.code(204).send();
    },
  );

  /** Read-only approved delivery feed consuming downstream `output.feed` tokens (or channel owners with `output.manage`). */
  app.get<{ Params: { channelId: string } }>("/channels/:channelId/output-feed", async (request, reply) => {
    const allowed = principalOf(database, request);
    const { channelId } = request.params;
    const canFeed = authorizeChannel(database, allowed.principal, { channelId, capability: "output.feed" });
    if (!canFeed.ok) {
      requireCapability(database, allowed, channelId, "output.manage");
    }
    const nowIso = new Date().toISOString();
    const rows = database.orm
      .select({
        deliveryId: deliveries.id,
        deliverySequence: deliveries.deliverySequence,
        platformOrder: deliveries.platformOrder,
        validUntil: deliveries.validUntil,
        correlationId: channelEvents.correlationId,
      })
      .from(deliveries)
      .innerJoin(verdicts, eq(verdicts.id, deliveries.verdictId))
      .innerJoin(channelEvents, eq(channelEvents.id, deliveries.eventId))
      .where(
        and(
          eq(channelEvents.channelId, channelId),
          eq(verdicts.isCurrent, 1),
          eq(verdicts.downstream, "ALLOW"),
          gt(deliveries.validUntil, nowIso),
        ),
      )
      .orderBy(desc(deliveries.platformOrder), desc(deliveries.deliverySequence))
      .limit(100)
      .all();

    const items = [];
    for (const row of rows) {
      const content = approvedContent.readApproved({ channelId, correlationId: row.correlationId, nowIso });
      if (content === undefined) continue;
      items.push({
        deliveryId: row.deliveryId,
        deliverySequence: row.deliverySequence,
        platformOrder: row.platformOrder,
        validUntil: row.validUntil,
        display: {
          label: content.label ?? null,
          text: content.text,
          translation: content.translation,
          ...(content.translations !== undefined ? { translations: content.translations } : {}),
          ...(content.payment !== undefined ? { payment: content.payment } : {}),
        },
      });
    }
    return reply.header("cache-control", "no-store").send({ items });
  });

  app.post<{ Params: { channelId: string } }>("/channels/:channelId/output-tokens", async (request, reply) => {
    const allowed = principalOf(database, request);
    const session = requireSession(allowed);
    const { channelId } = request.params;
    requireCapability(database, allowed, channelId, "tokens.manage");
    const issued = runShortTransaction(database, (tx) =>
      issueOutputToken(tx, { channelId, createdByAccountId: session.accountId, now: new Date() }),
    );
    return reply.code(201).header("cache-control", "no-store").send(issued);
  });

  app.delete<{ Params: { channelId: string; tokenId: string } }>(
    "/channels/:channelId/output-tokens/:tokenId",
    async (request, reply) => {
      const allowed = principalOf(database, request);
      const { channelId, tokenId } = request.params;
      requireCapability(database, allowed, channelId, "tokens.manage");
      const revoked = runShortTransaction(database, (tx) => revokeOutputToken(tx, { id: tokenId, channelId, now: new Date() }));
      if (!revoked) throw new RouteFailure(404, "TOKEN_NOT_FOUND");
      return reply.code(204).send();
    },
  );

const OUTPUT_GRANT_BODY = z
  .object({
    outputKind: z.enum(OUTPUT_GRANT_KINDS).optional(),
  })
  .strict()
  .optional();

  app.post<{ Params: { channelId: string } }>("/channels/:channelId/output-grants", async (request, reply) => {
    const allowed = principalOf(database, request);
    const { channelId } = request.params;
    requireCapability(database, allowed, channelId, "tokens.manage");
    let outputKind: OutputGrantKind | undefined;
    if (request.body !== undefined && request.body !== null) {
      const parsed = parseBody(OUTPUT_GRANT_BODY, request.body);
      outputKind = parsed?.outputKind;
    }
    const issued = runShortTransaction(database, (tx) =>
      issueNativeGrant(tx, { channelId, nowIso: new Date().toISOString(), outputKind }),
    );
    return reply.code(201).header("cache-control", "no-store").send(issued);
  });

  app.delete<{ Params: { channelId: string; grantId: string } }>(
    "/channels/:channelId/output-grants/:grantId",
    async (request, reply) => {
      const allowed = principalOf(database, request);
      const { channelId, grantId } = request.params;
      requireCapability(database, allowed, channelId, "tokens.manage");
      const revoked = runShortTransaction(database, (tx) =>
        revokeOutputGrant(tx, { grantId, channelId, nowIso: new Date().toISOString() }),
      );
      if (!revoked) throw new RouteFailure(404, "GRANT_NOT_FOUND");
      options.onOutputGrantRevoked?.(grantId);
      return reply.code(204).send();
    },
  );

  app.post(
    "/members/batch",
    {
      onRequest: app.rateLimit(batchMembersRateConfig),
      config: { rateLimit: batchMembersRateConfig },
    },
    async (request, reply) => {
      const allowed = principalOf(database, request);
      const body = parseBody(BATCH_BODY, request.body);
      const scope = authorizeBatch(
        database,
        allowed.principal,
        body.items.map((item) => ({ channelId: item.channelId, capability: "members.manage" as const })),
      );
      if (!scope.ok) throw new RouteFailure(403, "BATCH_DENIED", scope.index);
      for (const item of body.items) {
        requireDelegationAllowed(database, allowed, item.channelId, {
          accountId: item.accountId,
          nextRole: item.role,
          logAccess: item.logAccess,
          dataAdmin: item.dataAdmin ?? false,
        });
        requireKnownAccount(database, item.accountId);
      }
      const now = new Date();
      const granted = runShortTransaction(database, (tx) =>
        body.items.map((item) => {
          if (wouldLeaveChannelWithoutOwner(tx, { channelId: item.channelId, accountId: item.accountId, nextRole: item.role })) {
            throw new RouteFailure(409, "LAST_OWNER_REQUIRED");
          }
          return grantMembership(tx, {
            channelId: item.channelId,
            accountId: item.accountId,
            role: item.role,
            logAccess: item.logAccess,
            dataAdmin: item.dataAdmin ?? false,
            now,
          });
        }),
      );
      return reply.code(201).send({ granted: granted.length });
    },
  );
};
