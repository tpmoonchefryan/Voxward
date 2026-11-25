import type { IncomingHttpHeaders } from "node:http";
import { eq } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { tasks } from "../db/schema/index.js";
import { csrfMatches, isUnsafeMethod } from "./csrf.js";
import { resolveOutputToken } from "./downstream-tokens.js";
import { downstreamAllows, type Capability } from "./permissions.js";
import { channelAllowsCapability } from "./rbac-enforce.js";
import { resolveSession } from "./session.js";

export const SESSION_COOKIE = "vw_session";
export const CSRF_HEADER = "x-csrf-token";

export type Principal =
  | { readonly kind: "account"; readonly accountId: string; readonly displayName: string }
  | { readonly kind: "downstream"; readonly tokenId: string; readonly channelId: string };

export interface Allowed {
  readonly ok: true;
  readonly principal: Principal;
  /** Present for account principals. The raw session token stays server-side, except for logout to revoke it. */
  readonly sessionToken?: string;
  readonly csrfToken?: string;
}

export interface Denied {
  readonly ok: false;
  readonly status: 401 | 403;
  readonly code: string;
  /** Position of the first refused item in a batch. */
  readonly index?: number;
}

export type AuthResult = Allowed | Denied;
export type ScopeResult = { readonly ok: true } | Denied;

export interface RequestFacts {
  readonly method: string;
  readonly headers: IncomingHttpHeaders;
  readonly now: Date;
}

function denied(status: 401 | 403, code: string, index?: number): Denied {
  return index === undefined ? { ok: false, status, code } : { ok: false, status, code, index };
}

/** Reads one cookie value from a Cookie header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (header === undefined) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return undefined;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function bearerToken(headers: IncomingHttpHeaders): string | undefined {
  const value = headerValue(headers.authorization);
  if (value === undefined) return undefined;
  return /^Bearer\s+(\S+)$/i.exec(value)?.[1];
}

/**
 * Authenticates one HTTP request. A bearer token identifies a downstream output credential, which is
 * read-only. A session cookie identifies an account, and a state-changing request must also present the
 * session's CSRF token. Tokens are never read from the URL, so they do not reach access logs.
 */
export function authenticateRequest(database: VoxwardDatabase, facts: RequestFacts): AuthResult {
  const bearer = bearerToken(facts.headers);
  if (bearer !== undefined) {
    const output = resolveOutputToken(database, bearer);
    if (output === undefined) return denied(401, "UNAUTHENTICATED");
    if (isUnsafeMethod(facts.method)) return denied(403, "DOWNSTREAM_READ_ONLY");
    return { ok: true, principal: { kind: "downstream", tokenId: output.id, channelId: output.channelId } };
  }

  const sessionToken = readCookie(facts.headers.cookie, SESSION_COOKIE);
  if (sessionToken === undefined) return denied(401, "UNAUTHENTICATED");
  const session = resolveSession(database, sessionToken, facts.now);
  if (session === undefined) return denied(401, "UNAUTHENTICATED");
  if (isUnsafeMethod(facts.method) && !csrfMatches(session.csrfToken, headerValue(facts.headers[CSRF_HEADER]))) {
    return denied(403, "CSRF_INVALID");
  }
  return {
    ok: true,
    principal: { kind: "account", accountId: session.accountId, displayName: session.displayName },
    sessionToken,
    csrfToken: session.csrfToken,
  };
}

/**
 * Decides whether a principal may use one capability in one channel. The channel comes from the caller's
 * trusted scope (the path or a task record), never from a client-chosen room identifier alone.
 */
export function authorizeChannel(
  database: VoxwardDatabase,
  principal: Principal,
  scope: { readonly channelId: string; readonly capability: Capability },
): ScopeResult {
  if (principal.kind === "downstream") {
    if (principal.channelId !== scope.channelId || !downstreamAllows(scope.capability)) {
      return denied(403, "FORBIDDEN");
    }
    return { ok: true };
  }
  if (!channelAllowsCapability(database, scope.channelId, principal.accountId, scope.capability)) {
    return denied(403, "FORBIDDEN");
  }
  return { ok: true };
}

/** A batch is all-or-nothing. The first refused item stops the batch, and the caller writes nothing. */
export function authorizeBatch(
  database: VoxwardDatabase,
  principal: Principal,
  items: ReadonlyArray<{ readonly channelId: string; readonly capability: Capability }>,
): ScopeResult {
  for (const [index, item] of items.entries()) {
    const result = authorizeChannel(database, principal, item);
    if (!result.ok) return denied(403, "BATCH_DENIED", index);
  }
  return { ok: true };
}

function sameOrigin(headers: IncomingHttpHeaders): boolean {
  const origin = headerValue(headers.origin);
  const host = headerValue(headers.host);
  if (origin === undefined || host === undefined) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * WebSocket handshake check. Browsers always send Origin, so a cookie session needs a same-origin Origin.
 * A non-browser downstream client sends a bearer token and may omit Origin. Cross-site pages cannot use the
 * session cookie, because the cookie is SameSite=Strict and the Origin must match Host.
 */
export function authorizeSocketHandshake(database: VoxwardDatabase, facts: RequestFacts): AuthResult {
  const hasOrigin = headerValue(facts.headers.origin) !== undefined;
  const hasBearer = bearerToken(facts.headers) !== undefined;
  if (hasOrigin ? !sameOrigin(facts.headers) : !hasBearer) return denied(403, "ORIGIN_MISMATCH");
  return authenticateRequest(database, { ...facts, method: "GET" });
}

/** The channel that a task record belongs to. Undefined when the task does not exist. */
export function trustedChannelForTask(database: VoxwardDatabase, taskId: string): string | undefined {
  return database.orm.select({ channelId: tasks.channelId }).from(tasks).where(eq(tasks.id, taskId)).get()?.channelId;
}

/** A client may name a room. If it names a different room than the trusted record, the request is refused. */
export function checkRoomScope(trustedChannelId: string, claimedRoomId: string | undefined): ScopeResult {
  if (claimedRoomId !== undefined && claimedRoomId !== trustedChannelId) return denied(403, "ROOM_SCOPE_MISMATCH");
  return { ok: true };
}
