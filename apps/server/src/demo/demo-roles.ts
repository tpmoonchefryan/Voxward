import type { IncomingHttpHeaders } from "node:http";

export const DEMO_ROLES = [
  "DEMO_STREAMER",
  "DEMO_MODERATOR",
  "DEMO_PRIVACY_AUDITOR",
  "DEMO_STAGE_VIEWER",
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number];

export type DemoCapability =
  | "sandbox.read"
  | "sandbox.scenario"
  | "sandbox.reset"
  | "review.decide"
  | "privacy.delete"
  | "stage.read"
  | "logs.read";

export const DEMO_TOKEN_PREFIX = "vw_demo_token_";

export interface DemoRoleProfile {
  readonly role: DemoRole;
  readonly label: string;
  readonly capabilities: readonly DemoCapability[];
  readonly syntheticOnly: true;
}

const ROLE_PROFILES: Readonly<Record<DemoRole, DemoRoleProfile>> = {
  DEMO_STREAMER: {
    role: "DEMO_STREAMER",
    label: "演示主播 (Demo Streamer)",
    capabilities: [
      "sandbox.read",
      "sandbox.scenario",
      "sandbox.reset",
      "review.decide",
      "stage.read",
      "logs.read",
    ],
    syntheticOnly: true,
  },
  DEMO_MODERATOR: {
    role: "DEMO_MODERATOR",
    label: "演示房管 (Demo Moderator)",
    capabilities: ["sandbox.read", "sandbox.scenario", "review.decide", "logs.read"],
    syntheticOnly: true,
  },
  DEMO_PRIVACY_AUDITOR: {
    role: "DEMO_PRIVACY_AUDITOR",
    label: "演示隐私审计员 (Demo Privacy Auditor)",
    capabilities: ["sandbox.read", "sandbox.scenario", "privacy.delete", "logs.read"],
    syntheticOnly: true,
  },
  DEMO_STAGE_VIEWER: {
    role: "DEMO_STAGE_VIEWER",
    label: "演示舞台观众 (Demo Stage Viewer)",
    capabilities: ["sandbox.read", "stage.read"],
    syntheticOnly: true,
  },
};

export interface DemoSession {
  readonly token: string;
  readonly role: DemoRole;
  readonly label: string;
  readonly capabilities: readonly DemoCapability[];
  readonly syntheticOnly: true;
}

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === "string" && (DEMO_ROLES as readonly string[]).includes(value);
}

export function listDemoRoles(): readonly DemoRoleProfile[] {
  return DEMO_ROLES.map((role) => ROLE_PROFILES[role]);
}

/**
 * Issues a synthetic-only demo session token. Never issues a production CHANNEL_OWNER
 * role or writes to the production auth_sessions table.
 */
export function issueDemoSession(role: DemoRole): DemoSession {
  const profile = ROLE_PROFILES[role];
  return {
    token: `${DEMO_TOKEN_PREFIX}${role}`,
    role: profile.role,
    label: profile.label,
    capabilities: profile.capabilities,
    syntheticOnly: true,
  };
}

export function hasDemoCapability(role: DemoRole, capability: DemoCapability): boolean {
  return ROLE_PROFILES[role].capabilities.includes(capability);
}

export type DemoAuthOutcome =
  | { readonly ok: true; readonly role: DemoRole; readonly capabilities: readonly DemoCapability[] }
  | { readonly ok: false; readonly status: 401 | 403; readonly code: string };

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolves a limited demo role from sandbox request headers.
 * Rejects any attempt to escalate to production roles such as CHANNEL_OWNER.
 */
export function resolveDemoPrincipal(headers: IncomingHttpHeaders): DemoAuthOutcome {
  const auth = firstHeader(headers.authorization);
  if (auth !== undefined) {
    const match = /^Bearer\s+(\S+)$/i.exec(auth);
    const token = match?.[1];
    if (token === undefined || !token.startsWith(DEMO_TOKEN_PREFIX)) {
      return { ok: false, status: 401, code: "DEMO_UNAUTHENTICATED" };
    }
    const rolePart = token.slice(DEMO_TOKEN_PREFIX.length);
    if (!isDemoRole(rolePart)) {
      return { ok: false, status: 403, code: "DEMO_ROLE_FORBIDDEN" };
    }
    return { ok: true, role: rolePart, capabilities: ROLE_PROFILES[rolePart].capabilities };
  }

  const roleHeader = firstHeader(headers["x-demo-role"]);
  if (roleHeader !== undefined) {
    if (!isDemoRole(roleHeader)) {
      return { ok: false, status: 403, code: "DEMO_ROLE_FORBIDDEN" };
    }
    return { ok: true, role: roleHeader, capabilities: ROLE_PROFILES[roleHeader].capabilities };
  }

  return { ok: true, role: "DEMO_STREAMER", capabilities: ROLE_PROFILES.DEMO_STREAMER.capabilities };
}
