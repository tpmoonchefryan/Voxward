import { CHANNEL_ROLES } from "../db/schema/index.js";

export type ChannelRole = (typeof CHANNEL_ROLES)[number];

/** Capabilities name the actions and fields that the matrix controls. */
export const CAPABILITIES = [
  "queue.read",
  "review.decide",
  "list.edit",
  "score.config",
  "output.manage",
  "output.feed",
  "members.manage",
  "tokens.manage",
  "message.original",
  "subject.evidence",
  "data.handle",
  "logs.view",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Self-decided reading of proposal §2.1. A role grants only the capabilities listed here. */
const ROLE_CAPABILITIES: Readonly<Record<ChannelRole, ReadonlySet<Capability>>> = {
  CHANNEL_OWNER: new Set<Capability>([
    "queue.read",
    "review.decide",
    "list.edit",
    "score.config",
    "output.manage",
    "members.manage",
    "tokens.manage",
    "message.original",
    "subject.evidence",
    "logs.view",
  ]),
  MODERATOR: new Set<Capability>(["queue.read", "review.decide", "list.edit", "message.original"]),
  DATA_ADMIN: new Set<Capability>(["subject.evidence", "data.handle"]),
};

/** Downstream output credentials carry this capability only. */
const DOWNSTREAM_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["output.feed"]);

/** A membership with log_access = 1 adds the log viewer to any role. */
const LOG_ACCESS_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["logs.view"]);

/** A membership with data_admin = 1 adds data handling to any role (Q34), so an owner can also act as data admin. */
const DATA_ADMIN_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["subject.evidence", "data.handle"]);

export interface MembershipRights {
  readonly role: ChannelRole;
  readonly logAccess: boolean;
  readonly dataAdmin?: boolean;
}

export function isChannelRole(value: unknown): value is ChannelRole {
  return typeof value === "string" && (CHANNEL_ROLES as readonly string[]).includes(value);
}

export function capabilitiesOf(role: ChannelRole): readonly Capability[] {
  return CAPABILITIES.filter((capability) => ROLE_CAPABILITIES[role].has(capability));
}

export function membershipAllows(rights: MembershipRights, capability: Capability): boolean {
  if (ROLE_CAPABILITIES[rights.role].has(capability)) return true;
  if (rights.logAccess && LOG_ACCESS_CAPABILITIES.has(capability)) return true;
  return rights.dataAdmin === true && DATA_ADMIN_CAPABILITIES.has(capability);
}

/** Every capability one membership holds, the role's and the log-access grant together. */
export function capabilitiesOfMembership(rights: MembershipRights): readonly Capability[] {
  return CAPABILITIES.filter((capability) => membershipAllows(rights, capability));
}

export function downstreamAllows(capability: Capability): boolean {
  return DOWNSTREAM_CAPABILITIES.has(capability);
}

export type RbacTriState = "GRANT" | "DENY" | "NOT_SET";

export interface RbacRoleDefinition {
  readonly id: string;
  readonly name: string;
  readonly permissions: Readonly<Record<string, RbacTriState>>;
}

export interface RbacEffectiveEntry {
  readonly capability: Capability;
  readonly effect: "ALLOW" | "DENY";
  readonly decidedBy: "DENY_RULE" | "GRANT_RULE" | "DEFAULT_DENY";
  readonly sourceRoleIds: readonly string[];
}

/**
 * Resolves effective channel permissions across multiple assigned roles using strict Deny > Grant > Not Set precedence.
 */
export function resolveEffectivePermissions(roles: readonly RbacRoleDefinition[]): readonly RbacEffectiveEntry[] {
  return CAPABILITIES.map((capability) => {
    const denyRoles: string[] = [];
    const grantRoles: string[] = [];
    for (const role of roles) {
      const state = role.permissions[capability] ?? "NOT_SET";
      if (state === "DENY") denyRoles.push(role.id);
      else if (state === "GRANT") grantRoles.push(role.id);
    }
    if (denyRoles.length > 0) {
      return { capability, effect: "DENY", decidedBy: "DENY_RULE", sourceRoleIds: denyRoles };
    }
    if (grantRoles.length > 0) {
      return { capability, effect: "ALLOW", decidedBy: "GRANT_RULE", sourceRoleIds: grantRoles };
    }
    return { capability, effect: "DENY", decidedBy: "DEFAULT_DENY", sourceRoleIds: [] };
  });
}
