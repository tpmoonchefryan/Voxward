import type { ModerationItemView } from "../dock/api";

export interface ManualBlockedUserView {
  readonly subjectRef: string;
  readonly nickname: string | null;
  readonly reason: string;
  readonly syncYouTube: boolean;
  readonly banId: string | null;
  readonly createdAt: string;
  readonly createdBy: string;
}

export interface RejudgeScoreResult {
  readonly scoreOnly: boolean;
  readonly downstreamReissued: boolean;
  readonly status?: string;
}

export interface UnblockUserResult {
  readonly removed: ManualBlockedUserView | null;
  readonly youtubeUnbanned: boolean;
  readonly restoreBaseScoreApplied: boolean;
  readonly users: readonly ManualBlockedUserView[];
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class BlockedApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "BlockedApiError";
  }
}

export interface BlockedApi {
  listBlockedRecords(channelId: string): Promise<readonly ModerationItemView[]>;
  rejudgeScoreOnly(
    channelId: string,
    eventId: string,
    input: { readonly classification: "ALLOW_MEANINGFUL" | "ALLOW_NOISE"; readonly operationId: string },
  ): Promise<RejudgeScoreResult>;
  listBlockedUsers(channelId: string): Promise<readonly ManualBlockedUserView[]>;
  addBlockedUser(
    channelId: string,
    input: {
      readonly subjectRef: string;
      readonly nickname?: string;
      readonly reason?: string;
      readonly syncYouTube?: boolean;
    },
  ): Promise<readonly ManualBlockedUserView[]>;
  removeBlockedUser(
    channelId: string,
    subjectRef: string,
    restoreBaseScore: boolean,
  ): Promise<UnblockUserResult>;
}

export function createBlockedApi(
  fetcher: FetchLike = (input, init) => fetch(input, init),
): BlockedApi {
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
      throw new BlockedApiError(response.status, code);
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

  async function mutateJson<T>(method: "POST" | "DELETE", url: string, body?: unknown): Promise<T> {
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
      throw new BlockedApiError(response.status, code);
    }
    return parsed as T;
  }

  return {
    async listBlockedRecords(channelId) {
      const dock = await getJson<{
        feed: { readonly blockedItems?: readonly ModerationItemView[] };
      }>(`/channels/${encodeURIComponent(channelId)}/dock`);
      return dock.feed.blockedItems ?? [];
    },
    rejudgeScoreOnly(channelId, eventId, input) {
      return mutateJson(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/blocked/${encodeURIComponent(eventId)}/rejudge`,
        input,
      );
    },
    async listBlockedUsers(channelId) {
      const res = await getJson<{ users: readonly ManualBlockedUserView[] }>(
        `/channels/${encodeURIComponent(channelId)}/blocked-users`,
      );
      return res.users;
    },
    async addBlockedUser(channelId, input) {
      const res = await mutateJson<{ users: readonly ManualBlockedUserView[] }>(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/blocked-users`,
        input,
      );
      return res.users;
    },
    removeBlockedUser(channelId, subjectRef, restoreBaseScore) {
      const suffix = restoreBaseScore ? "?restoreBaseScore=true" : "";
      return mutateJson(
        "DELETE",
        `/channels/${encodeURIComponent(channelId)}/blocked-users/${encodeURIComponent(subjectRef)}${suffix}`,
      );
    },
  };
}
