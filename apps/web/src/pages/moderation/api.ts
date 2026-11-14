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

export interface ModerationApi {
  getModeration(channelId: string): Promise<DockSnapshot>;
  decideTask(channelId: string, taskId: string, classification: InternalClassification): Promise<DecisionActionResult>;
  reviewEvent(
    channelId: string,
    eventId: string,
    input: { readonly operationId: string; readonly classification: InternalClassification },
  ): Promise<DecisionActionResult>;
  resendDelivery(channelId: string, deliveryId: string, operationId: string): Promise<DecisionActionResult>;
  editSubjectList(channelId: string, subjectKey: string, listKind: ListKind | null): Promise<{ readonly status: string }>;
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
}

export function createModerationApi(fetcher: FetchLike = (input, init) => fetch(input, init)): ModerationApi {
  const dock = createDockApi(fetcher);
  let csrfToken: string | undefined;

  async function readBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  async function currentCsrf(): Promise<string> {
    if (csrfToken === undefined) {
      const res = await fetcher("/auth/session", { method: "GET", credentials: "same-origin", headers: { accept: "application/json" } });
      const body = (await readBody(res)) as { csrfToken?: string } | undefined;
      if (!res.ok || body?.csrfToken === undefined) throw new DockApiFailure(res.status, "UNAUTHENTICATED");
      csrfToken = body.csrfToken;
    }
    return csrfToken;
  }

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetcher(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json", "x-csrf-token": await currentCsrf() },
      body: JSON.stringify(body),
    });
    const parsed = await readBody(response);
    if (!response.ok) {
      const code =
        typeof parsed === "object" && parsed !== null && "error" in parsed && typeof parsed.error === "string"
          ? parsed.error
          : "INTERNAL_ERROR";
      if (code === "CSRF_INVALID") csrfToken = undefined;
      throw new DockApiFailure(response.status, code);
    }
    return parsed as T;
  }

  return {
    getModeration: (channelId) => dock.getDock(channelId),
    decideTask: (channelId, taskId, classification) => dock.decideTask(channelId, taskId, classification),
    reviewEvent: (channelId, eventId, input) => dock.reviewEvent(channelId, eventId, input),
    resendDelivery: (channelId, deliveryId, operationId) => dock.resendDelivery(channelId, deliveryId, operationId),
    editSubjectList: (channelId, subjectKey, listKind) =>
      postJson(`/channels/${encodeURIComponent(channelId)}/lists/subjects`, { subjectKey, listKind }),
    editTerm: (channelId, input) => postJson(`/channels/${encodeURIComponent(channelId)}/lists/terms`, input),
  };
}
