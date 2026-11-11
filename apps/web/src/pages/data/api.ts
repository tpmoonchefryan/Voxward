import type { DataRequestKind, DeleteMode, RequestSource, VerificationMethod } from "@voxward/contracts";

/** One request as the server shows it. Text fields are codes or ids, which the page turns into words. */
export interface RequestView {
  readonly requestId: string;
  readonly subjectRef: string;
  readonly kind: DataRequestKind;
  readonly mode: DeleteMode | null;
  readonly requestSource: RequestSource;
  readonly verification: {
    readonly state: "PENDING" | "VERIFIED" | "REJECTED";
    readonly method: VerificationMethod | null;
    readonly decidedAt: string | null;
  };
  readonly execution: string;
  readonly stage: string;
  readonly targets: readonly { readonly targetKind: string; readonly state: string; readonly errorCode: string | null }[];
  readonly counts: { readonly done: number; readonly failed: number; readonly pending: number };
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** What the panel shows about one subject. Nicknames are not part of it. */
export interface SubjectPanel {
  readonly subjectRef: string;
  readonly currentScore: number | null;
  readonly identity: { readonly kind: string; readonly effectiveFrom: string } | null;
  readonly list: "BLACKLIST" | "WHITELIST" | null;
  readonly exception: { readonly active: boolean; readonly createdAt: string } | null;
  readonly ledgerEntryCount: number;
  readonly retention: readonly { readonly category: string; readonly count: number; readonly retentionDays: number }[];
  readonly requests: readonly RequestView[];
  readonly notices: readonly string[];
}

export interface RegisterInput {
  readonly subjectRef: string;
  readonly kind: DataRequestKind;
  readonly mode: DeleteMode | null;
  readonly requestSource: RequestSource;
}

export interface VerificationInput {
  readonly verdict: "VERIFIED" | "REJECTED";
  readonly method: VerificationMethod | null;
}

/** The text for each fixed server code. A code without an entry falls back to the generic line. */
export const ERROR_TEXT: Readonly<Record<string, string>> = {
  UNAUTHENTICATED: "请先登录。",
  FORBIDDEN: "当前账号没有数据管理权限，无法执行此操作。",
  DOWNSTREAM_READ_ONLY: "输出凭据不能执行此操作。",
  CSRF_INVALID: "页面已过期，请刷新后重试。",
  SUBJECT_NOT_FOUND: "本频道中没有这个主体。",
  REQUEST_NOT_FOUND: "没有找到这个请求。",
  ALREADY_DECIDED: "这个请求已经有核验结论。",
  INVALID_REQUEST: "提交的内容不完整或格式不正确。",
  INTERNAL_ERROR: "服务暂时不可用，请稍后再试。",
};

const GENERIC_ERROR = "操作没有完成，请稍后再试。";

/** A refused request, with the server's fixed code. The message is never the server's text. */
export class ApiFailure extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiFailure";
    this.status = status;
    this.code = code;
  }
}

/** The sentence to show for an error. Network failures and unknown codes get a fixed line. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiFailure) return ERROR_TEXT[error.code] ?? GENERIC_ERROR;
  return "无法连接服务，请检查网络后重试。";
}

export interface DataApi {
  capabilities(channelId: string): Promise<{ readonly dataHandle: boolean }>;
  subject(channelId: string, subjectRef: string): Promise<SubjectPanel>;
  register(channelId: string, input: RegisterInput): Promise<RequestView>;
  decideVerification(channelId: string, requestId: string, input: VerificationInput): Promise<RequestView>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Reads the error code from a refusal body. Only the code is read, never a message from the server. */
function codeOf(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") return body.error;
  return "INTERNAL_ERROR";
}

/**
 * Client for the data-panel routes. A state-changing request carries the session's CSRF token, which is read once
 * from /auth/session. A CSRF refusal clears the cached token, so the next call reads it again.
 */
export function createDataApi(fetcher: FetchLike = (input, init) => fetch(input, init)): DataApi {
  let csrfToken: string | undefined;

  async function readBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  async function getJson<T>(url: string): Promise<T> {
    const response = await fetcher(url, { method: "GET", credentials: "same-origin", headers: { accept: "application/json" } });
    const body = await readBody(response);
    if (!response.ok) throw new ApiFailure(response.status, codeOf(body));
    return body as T;
  }

  async function currentCsrf(): Promise<string> {
    if (csrfToken === undefined) {
      const session = await getJson<{ csrfToken: string }>("/auth/session");
      csrfToken = session.csrfToken;
    }
    return csrfToken;
  }

  async function sendJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetcher(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json", "x-csrf-token": await currentCsrf() },
      body: JSON.stringify(body),
    });
    const parsed = await readBody(response);
    if (!response.ok) {
      const code = codeOf(parsed);
      if (code === "CSRF_INVALID") csrfToken = undefined;
      throw new ApiFailure(response.status, code);
    }
    return parsed as T;
  }

  return {
    capabilities: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/data/capabilities`),
    subject: (channelId, subjectRef) =>
      getJson(`/channels/${encodeURIComponent(channelId)}/data/subjects/${encodeURIComponent(subjectRef)}`),
    register: (channelId, input) => sendJson(`/channels/${encodeURIComponent(channelId)}/data/requests`, input),
    decideVerification: (channelId, requestId, input) =>
      sendJson(
        `/channels/${encodeURIComponent(channelId)}/data/requests/${encodeURIComponent(requestId)}/verification`,
        input,
      ),
  };
}
