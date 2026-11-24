import type { OutputsSummaryView } from "../admin/api";

export type AdapterCategory = "LIVE_PLATFORM" | "AI_PROVIDER";
export type AdapterDriverId = "youtube-live-v3" | "kiro-cli" | "openai-compat" | "anthropic-compat";

export interface AdapterCatalogEntry {
  readonly driverId: AdapterDriverId;
  readonly category: AdapterCategory;
  readonly displayName: string;
  readonly summary: string;
  readonly secretFields: readonly string[];
  readonly controlActions: readonly { readonly action: string; readonly label: string }[];
}

export interface AdapterModelPoolItem {
  readonly modelId: string;
  readonly displayName: string;
  readonly reasoningLevels: readonly string[];
  readonly source: "remote" | "manual";
}

export interface ChannelAdapterView {
  readonly id: string;
  readonly category: AdapterCategory;
  readonly driverId: AdapterDriverId;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly config: Readonly<Record<string, string | number | boolean | null>>;
  readonly models: readonly AdapterModelPoolItem[];
  readonly lastStatus: string;
  readonly updatedAt: string;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class IntegrationsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "IntegrationsApiError";
  }
}

export interface IntegrationsApi {
  getCatalog(channelId: string): Promise<readonly AdapterCatalogEntry[]>;
  listAdapters(channelId: string): Promise<readonly ChannelAdapterView[]>;
  createAdapter(
    channelId: string,
    input: {
      readonly category: AdapterCategory;
      readonly driverId: AdapterDriverId;
      readonly displayName: string;
      readonly enabled: boolean;
      readonly config: Readonly<Record<string, string | number | boolean | null>>;
      readonly models?: readonly AdapterModelPoolItem[];
    },
  ): Promise<ChannelAdapterView>;
  updateAdapter(
    channelId: string,
    adapterId: string,
    input: {
      readonly displayName: string;
      readonly enabled: boolean;
      readonly config: Readonly<Record<string, string | number | boolean | null>>;
      readonly models?: readonly AdapterModelPoolItem[];
    },
  ): Promise<ChannelAdapterView>;
  deleteAdapter(channelId: string, adapterId: string): Promise<void>;
  runAdapterAction(
    channelId: string,
    adapterId: string,
    action: string,
  ): Promise<{ readonly adapter: ChannelAdapterView; readonly summary: string; readonly correlationId: string }>;
  getOutputs(channelId: string): Promise<OutputsSummaryView>;
  issueOutputToken(channelId: string): Promise<{ readonly id?: string; readonly token?: string }>;
  revokeOutputToken(channelId: string, tokenId: string): Promise<void>;
  issueOutputGrant(channelId: string): Promise<{ readonly grantId?: string; readonly credential?: string }>;
  revokeOutputGrant(channelId: string, grantId: string): Promise<void>;
}

export function createIntegrationsApi(
  fetcher: FetchLike = (input, init) => fetch(input, init),
): IntegrationsApi {
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
      throw new IntegrationsApiError(response.status, code);
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
      throw new IntegrationsApiError(response.status, code);
    }
    return parsed as T;
  }

  return {
    async getCatalog(channelId) {
      const res = await getJson<{ catalog: readonly AdapterCatalogEntry[] }>(
        `/channels/${encodeURIComponent(channelId)}/adapters/catalog`,
      );
      return res.catalog;
    },
    async listAdapters(channelId) {
      const res = await getJson<{ adapters: readonly ChannelAdapterView[] }>(
        `/channels/${encodeURIComponent(channelId)}/adapters`,
      );
      return res.adapters;
    },
    async createAdapter(channelId, input) {
      const res = await mutateJson<{ adapter: ChannelAdapterView }>(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/adapters`,
        input,
      );
      return res.adapter;
    },
    async updateAdapter(channelId, adapterId, input) {
      const res = await mutateJson<{ adapter: ChannelAdapterView }>(
        "PUT",
        `/channels/${encodeURIComponent(channelId)}/adapters/${encodeURIComponent(adapterId)}`,
        input,
      );
      return res.adapter;
    },
    deleteAdapter(channelId, adapterId) {
      return mutateJson(
        "DELETE",
        `/channels/${encodeURIComponent(channelId)}/adapters/${encodeURIComponent(adapterId)}`,
      );
    },
    runAdapterAction(channelId, adapterId, action) {
      return mutateJson(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/adapters/${encodeURIComponent(adapterId)}/actions/${encodeURIComponent(action)}`,
        {},
      );
    },
    getOutputs: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/outputs`),
    issueOutputToken: (channelId) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/output-tokens`),
    revokeOutputToken: (channelId, tokenId) =>
      mutateJson(
        "DELETE",
        `/channels/${encodeURIComponent(channelId)}/output-tokens/${encodeURIComponent(tokenId)}`,
      ),
    issueOutputGrant: (channelId) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/output-grants`),
    revokeOutputGrant: (channelId, grantId) =>
      mutateJson(
        "DELETE",
        `/channels/${encodeURIComponent(channelId)}/output-grants/${encodeURIComponent(grantId)}`,
      ),
  };
}
