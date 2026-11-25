import {
  readChannelSetting,
  readRbacRoles,
  type StoredRbacRole,
  type StoredRbacUser,
} from "../db/channel-settings-store.js";
import type { VoxwardDatabase } from "../db/client.js";
import { findActiveMembership, type Membership } from "./members.js";
import { capabilitiesOfMembership, resolveEffectivePermissions, type Capability } from "./permissions.js";

/**
 * Authoritative channel capability resolver combining active `channel_members` rows with channel tri-state
 * RBAC assignments (`rbac-roles` / `rbac-users`).
 * - Returns `null` when the account is not an active member OR is explicitly disabled in `rbac-users`.
 * - When an active `rbac-users` record exists for the account, evaluates `DENY > GRANT > NOT_SET` strictly.
 * - When no `rbac-users` override exists for the account, falls back to base membership capabilities.
 */
export function resolveChannelAccess(
  database: VoxwardDatabase,
  channelId: string,
  accountId: string,
): { readonly membership: Membership; readonly capabilities: ReadonlySet<Capability> } | null {
  const membership = findActiveMembership(database, channelId, accountId);
  if (membership === undefined) return null;

  const storedUsers = readChannelSetting<StoredRbacUser[] | null>(database, channelId, "rbac-users", null);
  if (storedUsers === null) {
    return { membership, capabilities: new Set(capabilitiesOfMembership(membership)) };
  }

  const rbacUser = storedUsers.find((u) => u.accountId === accountId);
  if (rbacUser === undefined) {
    return { membership, capabilities: new Set(capabilitiesOfMembership(membership)) };
  }
  if (!rbacUser.enabled) {
    return null;
  }

  const roles = readRbacRoles(database, channelId);
  const roleMap = new Map<string, StoredRbacRole>(roles.map((r) => [r.id, r]));
  const assignedRoles = rbacUser.roleIds
    .map((id) => roleMap.get(id))
    .filter((role): role is StoredRbacRole => role !== undefined);

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
