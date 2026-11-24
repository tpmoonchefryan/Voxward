import type { ShellThemeMode } from "@tcrn/ui-react/approved";

export type VoxWardLocale = "zh-CN" | "en";

export interface ShellPreferencesRecord {
  readonly accountId?: string;
  readonly tenant?: string;
  readonly product?: string;
  readonly pins: readonly string[];
  readonly rightPins?: readonly string[];
  readonly theme?: ShellThemeMode;
  readonly locale?: VoxWardLocale;
  readonly density?: "comfortable" | "compact";
}

export interface SessionInfo {
  readonly accountId: string;
  readonly displayName: string;
  readonly csrfToken: string;
}

export interface ShellChannelSummary {
  readonly channelId: string;
  readonly displayName: string;
  readonly platform: string;
  readonly role: string;
  readonly logAccess: boolean;
  readonly dataAdmin: boolean;
  readonly capabilities: readonly string[];
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class ShellApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "ShellApiError";
  }
}

export interface ShellPreferencesClient {
  getSession(): Promise<SessionInfo | null>;
  login(loginName: string, password: string): Promise<SessionInfo>;
  logout(): Promise<void>;
  listChannels(): Promise<readonly ShellChannelSummary[]>;
  getShellPreferences(tenant?: string): Promise<ShellPreferencesRecord | null>;
  saveShellPreferences(
    input: {
      readonly pins: readonly string[];
      readonly rightPins?: readonly string[];
      readonly theme?: ShellThemeMode;
      readonly locale?: VoxWardLocale;
      readonly density?: "comfortable" | "compact";
    },
    tenant?: string,
  ): Promise<ShellPreferencesRecord>;
}

export function createShellPreferencesClient(
  fetcher: FetchLike = (input, init) => fetch(input, init),
): ShellPreferencesClient {
  let cachedCsrf: string | undefined;

  async function readJsonSafe(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  async function ensureCsrf(): Promise<string> {
    if (cachedCsrf !== undefined) {
      return cachedCsrf;
    }
    const response = await fetcher("/auth/session", {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    const body = (await readJsonSafe(response)) as { csrfToken?: string; error?: string } | undefined;
    if (!response.ok || typeof body?.csrfToken !== "string") {
      throw new ShellApiError(response.status, body?.error ?? "AUTH_REQUIRED");
    }
    cachedCsrf = body.csrfToken;
    return cachedCsrf;
  }

  return {
    async getSession(): Promise<SessionInfo | null> {
      const response = await fetcher("/auth/session", {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (response.status === 401 || response.status === 403) {
        cachedCsrf = undefined;
        return null;
      }
      const body = (await readJsonSafe(response)) as SessionInfo | { error?: string } | undefined;
      if (!response.ok || body === undefined || !("accountId" in body)) {
        return null;
      }
      cachedCsrf = body.csrfToken;
      return body;
    },

    async login(loginName: string, password: string): Promise<SessionInfo> {
      const response = await fetcher("/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ loginName, password }),
      });
      const body = (await readJsonSafe(response)) as SessionInfo | { error?: string } | undefined;
      if (!response.ok || body === undefined || !("accountId" in body)) {
        const code =
          body !== undefined && "error" in body && typeof body.error === "string"
            ? body.error
            : "INVALID_CREDENTIALS";
        throw new ShellApiError(response.status, code);
      }
      cachedCsrf = body.csrfToken;
      return body;
    },

    async logout(): Promise<void> {
      const csrf = await ensureCsrf();
      const response = await fetcher("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "x-csrf-token": csrf,
        },
      });
      cachedCsrf = undefined;
      if (!response.ok && response.status !== 204 && response.status !== 401) {
        throw new ShellApiError(response.status, "LOGOUT_FAILED");
      }
    },

    async listChannels(): Promise<readonly ShellChannelSummary[]> {
      const response = await fetcher("/auth/channels", {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (response.status === 401 || response.status === 403) {
        return [];
      }
      const body = (await readJsonSafe(response)) as { channels?: ShellChannelSummary[] } | undefined;
      if (!response.ok || !Array.isArray(body?.channels)) {
        return [];
      }
      return body.channels;
    },

    async getShellPreferences(tenant = "default"): Promise<ShellPreferencesRecord | null> {
      const query = new URLSearchParams({ product: "voxward", tenant });
      const response = await fetcher(`/auth/shell-preferences?${query.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      const body = (await readJsonSafe(response)) as ShellPreferencesRecord | undefined;
      if (!response.ok || body === undefined || !Array.isArray(body.pins)) {
        return null;
      }
      return body;
    },

    async saveShellPreferences(input, tenant = "default"): Promise<ShellPreferencesRecord> {
      const csrf = await ensureCsrf();
      const response = await fetcher("/auth/shell-preferences", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          product: "voxward",
          tenant,
          pins: [...input.pins],
          ...(input.rightPins === undefined ? {} : { rightPins: [...input.rightPins] }),
          ...(input.theme === undefined ? {} : { theme: input.theme }),
          ...(input.locale === undefined ? {} : { locale: input.locale }),
          ...(input.density === undefined ? {} : { density: input.density }),
        }),
      });
      const body = (await readJsonSafe(response)) as
        | ShellPreferencesRecord
        | { error?: string }
        | undefined;
      if (!response.ok || body === undefined || !("pins" in body)) {
        if (response.status === 403) {
          cachedCsrf = undefined;
        }
        const code =
          body !== undefined && "error" in body && typeof body.error === "string"
            ? body.error
            : "SAVE_FAILED";
        throw new ShellApiError(response.status, code);
      }
      return body;
    },
  };
}
