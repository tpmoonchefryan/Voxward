import type { InternalClassification, ScPayment } from "@voxward/contracts";
import { DEFAULT_VOXWARD_LOCALE, DOCK_COPY, pickLocale, type VoxWardLocale } from "../../i18n";

export interface ScFeedItemView {
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly originalText: string | null;
  readonly translation: string | null;
  readonly payment?: ScPayment | null;
  readonly notes: string | null;
  readonly acknowledgement: string | null;
  readonly safeAlias: string | null;
  readonly decidedAt: string;
  readonly deliveryId: string | null;
  readonly deliveryStatus: string | null;
}

export interface QueueItemView {
  readonly taskId: string;
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly kind: string;
  readonly status: string;
  readonly deadlineAt: string;
  readonly originalText: string | null;
}

export interface ModerationItemView {
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly localStatus: "ALLOW" | "BLOCK";
  readonly classification: string;
  readonly platformDeleteStatus: "PENDING" | "DELETED" | "FAILED" | "UNKNOWN" | "NOT_APPLICABLE";
  readonly bodyFolded: boolean;
  readonly originalText: string | null;
  readonly decidedAt: string;
  readonly deliveryId: string | null;
  readonly deliveryStatus: string | null;
}

export interface FaultBanner {
  readonly code: string;
  readonly message: string;
}

export interface DockSnapshot {
  readonly channel: {
    readonly channelId: string;
    readonly displayName: string;
    readonly platform: string;
  };
  readonly capabilities: readonly string[];
  readonly scTranslationEnabled: boolean;
  readonly modelIssues: readonly { readonly code: string; readonly path: string }[];
  readonly faults: {
    readonly platformFault: FaultBanner | null;
    readonly modelFault: FaultBanner | null;
  };
  readonly feed: {
    readonly approvedSc: readonly ScFeedItemView[];
    readonly reviewQueue: readonly QueueItemView[];
    readonly blockedItems: readonly ModerationItemView[];
    readonly liveStream: readonly ModerationItemView[];
  };
}

export interface ConflictNotice {
  readonly conflict: true;
  readonly reason: string;
  readonly current: unknown;
}

export type DecisionActionResult =
  | { readonly conflict: false; readonly status: string }
  | ConflictNotice;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class DockApiFailure extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "DockApiFailure";
    this.status = status;
    this.code = code;
  }
}

export function dockMessageFor(
  error: unknown,
  locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE,
): string {
  const copy = pickLocale(DOCK_COPY, locale);
  if (error instanceof DockApiFailure) return copy.errors[error.code] ?? copy.genericError;
  return copy.networkError;
}

function codeOf(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") return body.error;
  return "INTERNAL_ERROR";
}

export interface DockApi {
  getDock(roomId: string): Promise<DockSnapshot>;
  toggleScTranslation(roomId: string, enabled: boolean): Promise<{ readonly scTranslationEnabled: boolean }>;
  decideTask(roomId: string, taskId: string, classification: InternalClassification): Promise<DecisionActionResult>;
  reviewEvent(
    roomId: string,
    eventId: string,
    input: { readonly operationId: string; readonly classification: InternalClassification },
  ): Promise<DecisionActionResult>;
  resendDelivery(roomId: string, deliveryId: string, operationId: string): Promise<DecisionActionResult>;
}

export function createDockApi(fetcher: FetchLike = (input, init) => fetch(input, init)): DockApi {
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
    if (!response.ok) throw new DockApiFailure(response.status, codeOf(body));
    return body as T;
  }

  async function currentCsrf(): Promise<string> {
    if (csrfToken === undefined) {
      const session = await getJson<{ csrfToken: string }>("/auth/session");
      csrfToken = session.csrfToken;
    }
    return csrfToken;
  }

  async function mutateJson(
    method: "POST" | "PUT",
    url: string,
    body: unknown,
    allowConflict = false,
  ): Promise<{ status: number; body: unknown }> {
    const response = await fetcher(url, {
      method,
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json", "x-csrf-token": await currentCsrf() },
      body: JSON.stringify(body),
    });
    const parsed = await readBody(response);
    if (allowConflict && response.status === 409) {
      return { status: 409, body: parsed };
    }
    if (!response.ok) {
      const code = codeOf(parsed);
      if (code === "CSRF_INVALID") csrfToken = undefined;
      throw new DockApiFailure(response.status, code);
    }
    return { status: response.status, body: parsed };
  }

  return {
    getDock: (roomId) => getJson(`/channels/${encodeURIComponent(roomId)}/dock`),
    toggleScTranslation: async (roomId, enabled) => {
      const res = await mutateJson("PUT", `/channels/${encodeURIComponent(roomId)}/sc-translation`, { enabled });
      return res.body as { scTranslationEnabled: boolean };
    },
    decideTask: async (roomId, taskId, classification) => {
      const res = await mutateJson(
        "POST",
        `/channels/${encodeURIComponent(roomId)}/tasks/${encodeURIComponent(taskId)}/decide`,
        { classification },
        true,
      );
      if (res.status === 409) {
        const b = res.body as { reason?: string; current?: unknown };
        return { conflict: true, reason: b.reason ?? "CONFLICT", current: b.current ?? null };
      }
      const b = res.body as { status?: string };
      return { conflict: false, status: b.status ?? "committed" };
    },
    reviewEvent: async (roomId, eventId, input) => {
      const res = await mutateJson(
        "POST",
        `/channels/${encodeURIComponent(roomId)}/events/${encodeURIComponent(eventId)}/review`,
        input,
        true,
      );
      if (res.status === 409) {
        const b = res.body as { reason?: string; current?: unknown };
        return { conflict: true, reason: b.reason ?? "CONFLICT", current: b.current ?? null };
      }
      const b = res.body as { status?: string };
      return { conflict: false, status: b.status ?? "overturned" };
    },
    resendDelivery: async (roomId, deliveryId, operationId) => {
      const res = await mutateJson(
        "POST",
        `/channels/${encodeURIComponent(roomId)}/deliveries/${encodeURIComponent(deliveryId)}/resend`,
        { operationId },
        true,
      );
      if (res.status === 409) {
        const b = res.body as { reason?: string };
        return { conflict: true, reason: b.reason ?? "REFUSED", current: null };
      }
      const b = res.body as { status?: string };
      return { conflict: false, status: b.status ?? "resent" };
    },
  };
}
