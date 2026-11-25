import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { channelMembers } from "../db/schema/index.js";
import type { ShortTransaction } from "../db/transaction.js";
import { isChannelRole, type ChannelRole } from "./permissions.js";

export interface Membership {
  readonly channelId: string;
  readonly accountId: string;
  readonly role: ChannelRole;
  readonly logAccess: boolean;
  readonly dataAdmin: boolean;
  readonly grantedAt: string;
}

export interface GrantInput {
  readonly channelId: string;
  readonly accountId: string;
  readonly role: ChannelRole;
  readonly logAccess: boolean;
  readonly dataAdmin?: boolean;
  readonly now: Date;
}

/**
 * Grants a role. The previous active grant for the same account and channel is revoked in the same
 * transaction, so the partial unique index never sees two active rows.
 */
export function grantMembership(tx: ShortTransaction, input: GrantInput): Membership {
  const grantedAt = input.now.toISOString();
  tx.update(channelMembers)
    .set({ revokedAt: grantedAt })
    .where(
      and(
        eq(channelMembers.channelId, input.channelId),
        eq(channelMembers.accountRef, input.accountId),
        isNull(channelMembers.revokedAt),
      ),
    )
    .run();
  const dataAdmin = input.dataAdmin ?? false;
  tx.insert(channelMembers)
    .values({
      id: randomUUID(),
      channelId: input.channelId,
      accountRef: input.accountId,
      role: input.role,
      logAccess: input.logAccess ? 1 : 0,
      dataAdmin: dataAdmin ? 1 : 0,
      grantedAt,
    })
    .run();
  return {
    channelId: input.channelId,
    accountId: input.accountId,
    role: input.role,
    logAccess: input.logAccess,
    dataAdmin,
    grantedAt,
  };
}

export function countActiveChannelOwners(tx: ShortTransaction, channelId: string): number {
  const rows = tx
    .select({ id: channelMembers.id })
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.role, "CHANNEL_OWNER"),
        isNull(channelMembers.revokedAt),
      ),
    )
    .all();
  return rows.length;
}

export function wouldLeaveChannelWithoutOwner(
  tx: ShortTransaction,
  input: { readonly channelId: string; readonly accountId: string; readonly nextRole: ChannelRole | null },
): boolean {
  if (input.nextRole === "CHANNEL_OWNER") return false;
  const active = tx
    .select({ role: channelMembers.role })
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, input.channelId),
        eq(channelMembers.accountRef, input.accountId),
        isNull(channelMembers.revokedAt),
      ),
    )
    .get();
  if (active === undefined || active.role !== "CHANNEL_OWNER") return false;
  return countActiveChannelOwners(tx, input.channelId) <= 1;
}

export function revokeMembership(
  tx: ShortTransaction,
  input: { readonly channelId: string; readonly accountId: string; readonly now: Date },
): boolean {
  const result = tx
    .update(channelMembers)
    .set({ revokedAt: input.now.toISOString() })
    .where(
      and(
        eq(channelMembers.channelId, input.channelId),
        eq(channelMembers.accountRef, input.accountId),
        isNull(channelMembers.revokedAt),
      ),
    )
    .run();
  return result.changes > 0;
}

interface MembershipRow {
  readonly channelId: string;
  readonly accountRef: string;
  readonly role: string;
  readonly logAccess: number;
  readonly dataAdmin: number;
  readonly grantedAt: string;
}

function toMembership(row: MembershipRow): Membership {
  // The table's CHECK constraint already limits role to the three channel roles. Anything else is a broken database.
  if (!isChannelRole(row.role)) throw new Error("channel_members holds a role outside the channel role set");
  return {
    channelId: row.channelId,
    accountId: row.accountRef,
    role: row.role,
    logAccess: row.logAccess === 1,
    dataAdmin: row.dataAdmin === 1,
    grantedAt: row.grantedAt,
  };
}

const MEMBERSHIP_COLUMNS = {
  channelId: channelMembers.channelId,
  accountRef: channelMembers.accountRef,
  role: channelMembers.role,
  logAccess: channelMembers.logAccess,
  dataAdmin: channelMembers.dataAdmin,
  grantedAt: channelMembers.grantedAt,
};

export function findActiveMembership(database: VoxwardDatabase, channelId: string, accountId: string): Membership | undefined {
  const row = database.orm
    .select(MEMBERSHIP_COLUMNS)
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.accountRef, accountId),
        isNull(channelMembers.revokedAt),
      ),
    )
    .get();
  return row === undefined ? undefined : toMembership(row);
}

export function listActiveMembers(database: VoxwardDatabase, channelId: string): Membership[] {
  return database.orm
    .select(MEMBERSHIP_COLUMNS)
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), isNull(channelMembers.revokedAt)))
    .all()
    .map(toMembership);
}

/** Every active membership of one account, in any channel. Read only. */
export function listActiveMembershipsOf(database: VoxwardDatabase, accountId: string): Membership[] {
  return database.orm
    .select(MEMBERSHIP_COLUMNS)
    .from(channelMembers)
    .where(and(eq(channelMembers.accountRef, accountId), isNull(channelMembers.revokedAt)))
    .all()
    .map(toMembership);
}
