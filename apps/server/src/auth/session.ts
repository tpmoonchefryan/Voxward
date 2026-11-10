import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { authAccounts, authSessions } from "../db/schema/index.js";
import type { ShortTransaction } from "../db/transaction.js";

/** Self-decided: twelve hours. The brief names no lifetime. */
export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_TOKEN_PREFIX = "vws_";

export interface IssuedSession {
  readonly token: string;
  readonly csrfToken: string;
  readonly expiresAt: string;
}

export interface ResolvedSession {
  readonly accountId: string;
  readonly displayName: string;
  readonly csrfToken: string;
}

/** A random secret of `bytes` bytes, base64url encoded. */
export function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex digest. The table stores this instead of the secret, so a copy of the table is not a usable credential. */
export function digestSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

/**
 * The CSRF token is derived from the session token and is never stored. Only the holder of the HttpOnly
 * session cookie can compute it, and the table keeps no copy of it.
 */
export function csrfTokenFor(sessionToken: string): string {
  return createHash("sha256").update("csrf:", "utf8").update(sessionToken, "utf8").digest("base64url");
}

/** Creates a session row inside the caller's short transaction. The raw token is returned once and never stored. */
export function createSession(
  tx: ShortTransaction,
  input: { readonly accountId: string; readonly now: Date; readonly ttlMs?: number },
): IssuedSession {
  const token = `${SESSION_TOKEN_PREFIX}${randomSecret()}`;
  const expiresAt = new Date(input.now.getTime() + (input.ttlMs ?? DEFAULT_SESSION_TTL_MS)).toISOString();
  tx.insert(authSessions)
    .values({
      tokenHash: digestSecret(token),
      accountId: input.accountId,
      createdAt: input.now.toISOString(),
      expiresAt,
    })
    .run();
  return { token, csrfToken: csrfTokenFor(token), expiresAt };
}

/**
 * Returns the session behind `token`. Returns undefined when the token is unknown, expired, revoked, or its
 * account is disabled. Every request reads this row, so a revocation applies to the next request.
 */
export function resolveSession(database: VoxwardDatabase, token: string, now: Date): ResolvedSession | undefined {
  const row = database.orm
    .select({
      accountId: authSessions.accountId,
      expiresAt: authSessions.expiresAt,
      revokedAt: authSessions.revokedAt,
      displayName: authAccounts.displayName,
      disabledAt: authAccounts.disabledAt,
    })
    .from(authSessions)
    .innerJoin(authAccounts, eq(authAccounts.id, authSessions.accountId))
    .where(eq(authSessions.tokenHash, digestSecret(token)))
    .get();
  if (row === undefined) return undefined;
  if (row.revokedAt !== null || row.disabledAt !== null) return undefined;
  if (row.expiresAt <= now.toISOString()) return undefined;
  return { accountId: row.accountId, displayName: row.displayName, csrfToken: csrfTokenFor(token) };
}

export function revokeSession(tx: ShortTransaction, token: string, now: Date): boolean {
  const result = tx
    .update(authSessions)
    .set({ revokedAt: now.toISOString() })
    .where(and(eq(authSessions.tokenHash, digestSecret(token)), isNull(authSessions.revokedAt)))
    .run();
  return result.changes > 0;
}

/** Revokes every live session of one account, for example after a password change or an account disable. */
export function revokeAccountSessions(tx: ShortTransaction, accountId: string, now: Date): number {
  const result = tx
    .update(authSessions)
    .set({ revokedAt: now.toISOString() })
    .where(and(eq(authSessions.accountId, accountId), isNull(authSessions.revokedAt)))
    .run();
  return result.changes;
}
