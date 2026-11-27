import fastifyRateLimit, { type RateLimitOptions, type RateLimitPluginOptions } from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export interface HttpRateLimitSettings {
  readonly windowMs?: number;
  readonly loginMax?: number;
  readonly batchMembersMax?: number;
  readonly channelsListMax?: number;
  readonly spaMax?: number;
}

export const DEFAULT_HTTP_RATE_LIMITS = {
  windowMs: 60_000,
  loginMax: 30,
  batchMembersMax: 20,
  channelsListMax: 120,
  spaMax: 300,
} as const;

export const ROUTE_RATE_LIMIT_PLUGIN_OPTIONS: RateLimitPluginOptions = {
  global: false,
  addHeadersOnExceeding: {
    "x-ratelimit-limit": false,
    "x-ratelimit-remaining": false,
    "x-ratelimit-reset": false,
  },
  addHeaders: {
    "x-ratelimit-limit": false,
    "x-ratelimit-remaining": false,
    "x-ratelimit-reset": false,
    "retry-after": true,
  },
};

export async function registerRouteRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(fastifyRateLimit, ROUTE_RATE_LIMIT_PLUGIN_OPTIONS);
}

export function buildRouteRateLimitConfig(
  max: number,
  timeWindow: number,
  errorCode: "TOO_MANY_ATTEMPTS" | "RATE_LIMITED",
): RateLimitOptions {
  return {
    max,
    timeWindow,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: errorCode,
      retryAfter: Math.max(1, Math.ceil(context.ttl / 1000)),
    }),
  };
}

export function buildSpaRateLimitPluginOptions(
  limits?: Pick<HttpRateLimitSettings, "spaMax" | "windowMs">,
): RateLimitPluginOptions {
  const max = limits?.spaMax ?? DEFAULT_HTTP_RATE_LIMITS.spaMax;
  const timeWindow = limits?.windowMs ?? DEFAULT_HTTP_RATE_LIMITS.windowMs;
  return {
    global: true,
    max,
    timeWindow,
    addHeadersOnExceeding: {
      "x-ratelimit-limit": false,
      "x-ratelimit-remaining": false,
      "x-ratelimit-reset": false,
    },
    addHeaders: {
      "x-ratelimit-limit": false,
      "x-ratelimit-remaining": false,
      "x-ratelimit-reset": false,
      "retry-after": true,
    },
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "RATE_LIMITED",
      retryAfter: Math.max(1, Math.ceil(context.ttl / 1000)),
    }),
  };
}
