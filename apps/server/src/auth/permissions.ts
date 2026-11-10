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

export interface MembershipRights {
  readonly role: ChannelRole;
  readonly logAccess: boolean;
}

export function isChannelRole(value: unknown): value is ChannelRole {
  return typeof value === "string" && (CHANNEL_ROLES as readonly string[]).includes(value);
}

export function capabilitiesOf(role: ChannelRole): readonly Capability[] {
  return CAPABILITIES.filter((capability) => ROLE_CAPABILITIES[role].has(capability));
}

export function membershipAllows(rights: MembershipRights, capability: Capability): boolean {
  if (ROLE_CAPABILITIES[rights.role].has(capability)) return true;
  return rights.logAccess && LOG_ACCESS_CAPABILITIES.has(capability);
}

export function downstreamAllows(capability: Capability): boolean {
  return DOWNSTREAM_CAPABILITIES.has(capability);
}
