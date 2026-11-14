import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { authAccounts, channelMembers, channels } from "../db/schema/index.js";
import { runShortTransaction } from "../db/transaction.js";
import { hashPassword, LOGIN_NAME_PATTERN, MIN_PASSWORD_LENGTH } from "./login.js";
import { grantMembership, type Membership } from "./members.js";

export type BootstrapErrorCode =
  | "OWNER_ALREADY_BOOTSTRAPPED"
  | "INVALID_CHANNEL"
  | "INVALID_LOGIN_NAME"
  | "WEAK_PASSWORD"
  | "LOGIN_NAME_TAKEN";

export class BootstrapError extends Error {
  readonly code: BootstrapErrorCode;

  constructor(code: BootstrapErrorCode) {
    super(code);
    this.name = "BootstrapError";
    this.code = code;
  }
}

export interface BootstrapOwnerInput {
  readonly channelId: string;
  readonly platform?: string;
  readonly platformChannelRef?: string;
  readonly channelDisplayName?: string;
  readonly loginName: string;
  readonly displayName: string;
  readonly password: string;
  readonly now: Date;
}

export interface BootstrapOwnerResult {
  readonly accountId: string;
  readonly channelId: string;
  readonly membership: Membership;
}

function hasActiveOwner(database: VoxwardDatabase): boolean {
  const existing = database.orm
    .select({ id: channelMembers.id })
    .from(channelMembers)
    .where(and(eq(channelMembers.role, "CHANNEL_OWNER"), isNull(channelMembers.revokedAt)))
    .get();
  return existing !== undefined;
}

function sqliteErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && code.startsWith("SQLITE_")) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/**
 * Q17: One-time owner bootstrap without a shared secret. Succeeds only when zero active CHANNEL_OWNER
 * memberships exist in the database; any subsequent attempt fails closed with OWNER_ALREADY_BOOTSTRAPPED.
 */
export async function bootstrapOwner(
  database: VoxwardDatabase,
  input: BootstrapOwnerInput,
): Promise<BootstrapOwnerResult> {
  if (input.channelId.trim() === "") throw new BootstrapError("INVALID_CHANNEL");
  if (!LOGIN_NAME_PATTERN.test(input.loginName)) throw new BootstrapError("INVALID_LOGIN_NAME");
  if (input.password.length < MIN_PASSWORD_LENGTH) throw new BootstrapError("WEAK_PASSWORD");
  if (hasActiveOwner(database)) throw new BootstrapError("OWNER_ALREADY_BOOTSTRAPPED");

  const passwordHash = await hashPassword(input.password);
  const accountId = randomUUID();
  const nowIso = input.now.toISOString();

  try {
    const membership = runShortTransaction(database, (tx) => {
      const existingOwner = tx
        .select({ id: channelMembers.id })
        .from(channelMembers)
        .where(and(eq(channelMembers.role, "CHANNEL_OWNER"), isNull(channelMembers.revokedAt)))
        .get();
      if (existingOwner !== undefined) throw new BootstrapError("OWNER_ALREADY_BOOTSTRAPPED");

      const existingChannel = tx
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .get();
      if (existingChannel === undefined) {
        tx.insert(channels)
          .values({
            id: input.channelId,
            platform: input.platform ?? "youtube",
            platformChannelRef: input.platformChannelRef ?? `UC-${input.channelId}`,
            displayName: input.channelDisplayName ?? input.channelId,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .run();
      }

      tx.insert(authAccounts)
        .values({
          id: accountId,
          loginName: input.loginName,
          displayName: input.displayName,
          passwordHash,
          createdAt: nowIso,
        })
        .run();

      return grantMembership(tx, {
        channelId: input.channelId,
        accountId,
        role: "CHANNEL_OWNER",
        logAccess: true,
        dataAdmin: true,
        now: input.now,
      });
    });

    return { accountId, channelId: input.channelId, membership };
  } catch (error) {
    if (error instanceof BootstrapError) throw error;
    if (sqliteErrorCode(error) === "SQLITE_CONSTRAINT_UNIQUE") throw new BootstrapError("LOGIN_NAME_TAKEN");
    throw error;
  }
}
