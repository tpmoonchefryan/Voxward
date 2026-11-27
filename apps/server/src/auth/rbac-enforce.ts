import {
  readChannelSetting,
  type StoredRbacRole,
  type StoredRbacUser,
} from "../db/channel-settings-store.js";
import type { VoxwardDatabase } from "../db/client.js";
import { findActiveMembership, type Membership } from "./members.js";
import { capabilitiesOfMembership, resolveEffectivePermissions, type Capability } from "./permissions.js";

/** Maps a base channel membership record to its default built-in RBAC role IDs. */
export function defaultRoleIdsForMembership(member: Membership): string[] {
  const roleIds: string[] = [];
  if (member.role === "CHANNEL_OWNER") roleIds.push("role-owner");
  else if (member.role === "MODERATOR") roleIds.push("role-moderator");
  else roleIds.push("role-data-admin");
  if (member.logAccess && member.role !== "CHANNEL_OWNER") {
    roleIds.push("role-auditor");
  }
  if (member.dataAdmin && member.role !== "DATA_ADMIN" && member.role !== "CHANNEL_OWNER") {
    roleIds.push("role-data-admin");
  }
  return roleIds;
}

/**
 * Authoritative channel capability resolver combining active `channel_members` rows with channel tri-state
 * RBAC assignments (`rbac-roles` / `rbac-users`).
 * - Returns `null` when the account is not an active member OR is explicitly disabled in `rbac-users`.
 * - When an active `rbac-users` record exists OR custom `rbac-roles` exist, evaluates `DENY > GRANT > NOT_SET` strictly.
 * - When neither `rbac-users` nor custom `rbac-roles` overrides exist, falls back to base membership capabilities.
 */
export function resolveChannelAccess(
  database: VoxwardDatabase,
  channelId: string,
  accountId: string,
): { readonly membership: Membership; readonly capabilities: ReadonlySet<Capability> } | null {
  const membership = findActiveMembership(database, channelId, accountId);
  if (membership === undefined) return null;

  const storedUsers = readChannelSetting<StoredRbacUser[] | null>(database, channelId, "rbac-users", null);
  const storedRoles = readChannelSetting<StoredRbacRole[] | null>(database, channelId, "rbac-roles", null);
  const rbacUser = storedUsers?.find((u) => u.accountId === accountId);

  if (rbacUser !== undefined && !rbacUser.enabled) {
    return null;
  }
  if (rbacUser === undefined && storedRoles === null) {
    return { membership, capabilities: new Set(capabilitiesOfMembership(membership)) };
  }

  const roles = storedRoles ?? [];
  const roleIds = rbacUser !== undefined ? rbacUser.roleIds : defaultRoleIdsForMembership(membership);
  const roleMap = new Map<string, StoredRbacRole>(roles.map((r) => [r.id, r]));
  const assignedRoles = roleIds
    .map((id) => roleMap.get(id))
    .filter((role): role is StoredRbacRole => role !== undefined);

  if (rbacUser === undefined && assignedRoles.length === 0) {
    return { membership, capabilities: new Set(capabilitiesOfMembership(membership)) };
  }

  const effective = resolveEffectivePermissions(assignedRoles);
  const allowed = new Set<Capability>();
  for (const entry of effective) {
    if (entry.effect === "ALLOW") {
      allowed.add(entry.capability);
    }
  }
  return { membership, capabilities: allowed };
}

export function resolveChannelCapabilities(
  database: VoxwardDatabase,
  channelId: string,
  accountId: string,
): ReadonlySet<Capability> | null {
  return resolveChannelAccess(database, channelId, accountId)?.capabilities ?? null;
}

export function channelAllowsCapability(
  database: VoxwardDatabase,
  channelId: string,
  accountId: string,
  capability: Capability,
): boolean {
  const caps = resolveChannelCapabilities(database, channelId, accountId);
  return caps !== null && caps.has(capability);
}
