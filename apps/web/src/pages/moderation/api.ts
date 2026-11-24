import type { InternalClassification, ListKind, TermMatchKind } from "@voxward/contracts";
import {
  createDockApi,
  dockMessageFor,
  DockApiFailure,
  type ConflictNotice,
  type DecisionActionResult,
  type DockSnapshot,
  type FetchLike,
} from "../dock/api";

export { dockMessageFor as moderationMessageFor, DockApiFailure as ModerationApiFailure };
export type { ConflictNotice, DecisionActionResult, DockSnapshot as ModerationSnapshot };

export interface CandidateCardView {
  readonly id: string;
  readonly term: string;
  readonly note: string | null;
  readonly sourceCorrelationId: string;
  readonly status: "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED";
  readonly ruleVersion: number | null;
}

export interface TermCategoryView {
  readonly code: string;
  readonly label: string;
  readonly listKind: "BLACKLIST" | "WHITELIST";
  readonly description: string;
  readonly createdAt: string;
}

export interface ExtendedTermEntryView {
  readonly id: string;
  readonly listKind: "BLACKLIST" | "WHITELIST";
  readonly term: string;
  readonly categoryCode: string;
  readonly matchKind: "EXACT" | "CONTAINS" | "REGEX" | "NORMALIZED";
  readonly enabled: boolean;
}

export interface ModerationApi {
  getModeration(channelId: string): Promise<DockSnapshot>;
  decideTask(
    channelId: string,
    taskId: string,
    input: { readonly operationId: string; readonly classification: InternalClassification },
  ): Promise<DecisionActionResult>;
  reviewEvent(
    channelId: string,
    eventId: string,
    input: { readonly operationId: string; readonly classification: InternalClassification },
  ): Promise<DecisionActionResult>;
  resendDelivery(channelId: string, deliveryId: string, operationId: string): Promise<DecisionActionResult>;
  editSubjectList(
    channelId: string,
    subjectKey: string,
    listKind: ListKind | null,
  ): Promise<{ readonly status: string }>;
  editTerm(
    channelId: string,
    input: {
      readonly action: "ADD" | "RETIRE";
      readonly term: string;
      readonly matchKind: TermMatchKind;
      readonly language: string;
      readonly groupCode: string;
    },
  ): Promise<{ readonly status: string }>;
  listCandidates(channelId: string): Promise<readonly CandidateCardView[]>;
  confirmCandidate(channelId: string, cardId: string): Promise<{ readonly card: CandidateCardView }>;
  rejectCandidate(channelId: string, cardId: string): Promise<{ readonly card: CandidateCardView }>;
  listTermCategories(channelId: string): Promise<readonly TermCategoryView[]>;
  appendBlacklistTerm(
    channelId: string,
    input: { readonly term: string; readonly categoryCode: string; readonly matchKind?: "EXACT" | "CONTAINS" | "REGEX" },
  ): Promise<void>;
}

export function createModerationApi(
  fetcher: FetchLike = (input, init) => fetch(input, init),
): ModerationApi {
  const dock = createDockApi(fetcher);
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
    const body = await readJson(response);
    if (!response.ok) {
      const code =
        typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "INTERNAL_ERROR";
      throw new DockApiFailure(response.status, code);
    }
    return body as T;
  }

  async function ensureCsrf(): Promise<string> {
    if (csrfToken === undefined) {
      const session = await getJson<{ csrfToken: string }>("/auth/session");
      csrfToken = session.csrfToken;
    }
    return csrfToken;
  }

  async function mutateJson<T>(method: "POST" | "PUT", url: string, body?: unknown): Promise<T> {
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
      const obj = typeof parsed === "object" && parsed !== null ? (parsed as { error?: unknown }) : undefined;
      const code = typeof obj?.error === "string" ? obj.error : "INTERNAL_ERROR";
      if (code === "CSRF_INVALID") csrfToken = undefined;
      throw new DockApiFailure(response.status, code);
    }
    return parsed as T;
  }

  return {
    getModeration: (channelId) => dock.getDock(channelId),
    decideTask: (channelId, taskId, input) => dock.decideTask(channelId, taskId, input.classification),
    reviewEvent: (channelId, eventId, input) => dock.reviewEvent(channelId, eventId, input),
    resendDelivery: (channelId, deliveryId, operationId) =>
      dock.resendDelivery(channelId, deliveryId, operationId),
    editSubjectList: (channelId, subjectKey, listKind) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/lists/subjects`, {
        subjectKey,
        listKind,
      }),
    editTerm: (channelId, input) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/lists/terms`, input),
    listCandidates: async (channelId) =>
      (await getJson<{ cards: CandidateCardView[] }>(`/channels/${encodeURIComponent(channelId)}/candidates`)).cards,
    confirmCandidate: (channelId, cardId) =>
      mutateJson(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/candidates/${encodeURIComponent(cardId)}/confirm`,
      ),
    rejectCandidate: (channelId, cardId) =>
      mutateJson(
        "POST",
        `/channels/${encodeURIComponent(channelId)}/candidates/${encodeURIComponent(cardId)}/reject`,
      ),
    listTermCategories: async (channelId) => {
      try {
        const res = await getJson<{ categories: TermCategoryView[] }>(
          `/channels/${encodeURIComponent(channelId)}/term-categories`,
        );
        return res.categories;
      } catch {
        return [
          {
            code: "spam",
            label: "垃圾刷屏",
            listKind: "BLACKLIST",
            description: "高频重复、外链导流或广告垃圾信息",
            createdAt: "",
          },
        ];
      }
    },
    async appendBlacklistTerm(channelId, input) {
      const current = await getJson<{ entries: ExtendedTermEntryView[] }>(
        `/channels/${encodeURIComponent(channelId)}/term-entries`,
      );
      const nextEntry: ExtendedTermEntryView = {
        id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        listKind: "BLACKLIST",
        term: input.term,
        categoryCode: input.categoryCode,
        matchKind: input.matchKind ?? "CONTAINS",
        enabled: true,
      };
      await mutateJson("PUT", `/channels/${encodeURIComponent(channelId)}/term-entries`, {
        entries: [nextEntry, ...current.entries],
      });
    },
  };
}
