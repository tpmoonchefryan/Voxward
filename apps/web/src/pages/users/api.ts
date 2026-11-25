export type RbacTriState = "GRANT" | "DENY" | "NOT_SET";

export const RBAC_CAPABILITY_KEYS = [
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

export type RbacCapabilityKey = (typeof RBAC_CAPABILITY_KEYS)[number];

export interface RbacRoleView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systemPreset: boolean;
  readonly builtIn?: boolean;
  readonly permissions: Readonly<Record<string, RbacTriState>>;
}

export interface RbacEffectiveEntryView {
  readonly capability: RbacCapabilityKey;
  readonly effect: "ALLOW" | "DENY";
  readonly decidedBy: "DENY_RULE" | "GRANT_RULE" | "DEFAULT_DENY";
  readonly sourceRoleIds: readonly string[];
}

export interface RbacUserView {
  readonly accountId: string;
  readonly displayName: string;
  readonly loginName: string;
  readonly enabled: boolean;
  readonly roleIds: readonly string[];
  readonly updatedAt: string;
  readonly effectivePermissions: readonly RbacEffectiveEntryView[];
}

export function previewEffectivePermissions(
  roles: readonly RbacRoleView[],
): readonly RbacEffectiveEntryView[] {
  return RBAC_CAPABILITY_KEYS.map((capability) => {
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

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class UsersRbacApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "UsersRbacApiError";
  }
}

export interface UsersRbacApi {
  listRoles(channelId: string): Promise<readonly RbacRoleView[]>;
  createRole(
    channelId: string,
    input: {
      readonly name: string;
      readonly description?: string;
      readonly permissions: Readonly<Record<string, RbacTriState>>;
    },
  ): Promise<readonly RbacRoleView[]>;
  updateRole(
    channelId: string,
    roleId: string,
    input: {
      readonly name: string;
      readonly description?: string;
      readonly permissions: Readonly<Record<string, RbacTriState>>;
    },
  ): Promise<readonly RbacRoleView[]>;
  deleteRole(channelId: string, roleId: string): Promise<void>;
  listUsersAndRoles(channelId: string): Promise<{
    readonly users: readonly RbacUserView[];
    readonly roles: readonly RbacRoleView[];
  }>;
  upsertUser(
    channelId: string,
    input: {
      readonly accountId: string;
      readonly displayName: string;
      readonly loginName: string;
      readonly enabled: boolean;
      readonly roleIds: readonly string[];
    },
  ): Promise<{ readonly user: RbacUserView; readonly users: readonly RbacUserView[] }>;
  deleteUser(channelId: string, accountId: string): Promise<void>;
}

export function createUsersRbacApi(
  fetcher: FetchLike = (input, init) => fetch(input, init),
): UsersRbacApi {
  let csrfToken: string | undefined;

  async function readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  async function getJson<T>(url: string): Promise<T> {
    const response = await fetcher(url, {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    const parsed = await readJson(response);
    if (!response.ok) {
      const code =
        typeof parsed === "object" && parsed !== null && "error" in parsed && typeof parsed.error === "string"
          ? parsed.error
          : "INTERNAL_ERROR";
      throw new UsersRbacApiError(response.status, code);
    }
    return parsed as T;
  }

  async function ensureCsrf(): Promise<string> {
    if (csrfToken === undefined) {
      const session = await getJson<{ csrfToken: string }>("/auth/session");
      csrfToken = session.csrfToken;
    }
    return csrfToken;
  }

  async function mutateJson<T>(method: "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<T> {
    const response = await fetcher(url, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        accept: "application/json",
        "x-csrf-token": await ensureCsrf(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const parsed = response.status === 204 ? undefined : await readJson(response);
    if (!response.ok) {
      const code =
        typeof parsed === "object" && parsed !== null && "error" in parsed && typeof parsed.error === "string"
          ? parsed.error
          : "INTERNAL_ERROR";
      if (code === "CSRF_INVALID") csrfToken = undefined;
      throw new UsersRbacApiError(response.status, code);
    }
    return parsed as T;
  }

  return {
    async listRoles(channelId) {
      const res = await getJson<{ roles: readonly RbacRoleView[] }>(
        `/channels/${encodeURIComponent(channelId)}/rbac/roles`,
      );
      return res.roles;
    },
    async createRole(channelId, input) {
      const res = await mutateJson<{ roles: readonly RbacRoleView[] }>(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/rbac/roles`,
        input,
      );
      return res.roles;
    },
    async updateRole(channelId, roleId, input) {
      const res = await mutateJson<{ roles: readonly RbacRoleView[] }>(
        "PUT",
        `/channels/${encodeURIComponent(channelId)}/rbac/roles/${encodeURIComponent(roleId)}`,
        input,
      );
      return res.roles;
    },
    deleteRole(channelId, roleId) {
      return mutateJson(
        "DELETE",
        `/channels/${encodeURIComponent(channelId)}/rbac/roles/${encodeURIComponent(roleId)}`,
      );
    },
    listUsersAndRoles(channelId) {
      return getJson(`/channels/${encodeURIComponent(channelId)}/rbac/users`);
    },
    upsertUser(channelId, input) {
      return mutateJson(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/rbac/users`,
        input,
      );
    },
    deleteUser(channelId, accountId) {
      return mutateJson(
        "DELETE",
        `/channels/${encodeURIComponent(channelId)}/rbac/users/${encodeURIComponent(accountId)}`,
      );
    },
  };
}
