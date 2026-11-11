import type { DecisionActor, ListKind, TermMatchKind } from "@voxward/contracts";
import type { DecisionDeps } from "./service.js";

/** The capability that blacklist, whitelist and word-list edits need. Moderators and owners have it; data admins do not. */
export const LIST_CAPABILITY = "list.edit";

export interface SubjectListRequest {
  readonly subjectKey: string;
  /** Null removes the subject's active entry. */
  readonly listKind: ListKind | null;
}

export interface TermRequest {
  readonly action: "ADD" | "RETIRE";
  readonly term: string;
  readonly matchKind: TermMatchKind;
  readonly language: string;
  readonly groupCode: string;
}

export type ListEditOutcome =
  | { readonly status: "applied" | "unchanged" }
  | { readonly status: "conflict"; readonly reason: "OTHER_LIST_ACTIVE" }
  | { readonly status: "refused"; readonly reason: "SUBJECT_NOT_FOUND" }
  | { readonly status: "denied"; readonly reason: "PERMISSION_DENIED" };

export type TermEditOutcome =
  | { readonly status: "applied" | "unchanged" }
  | { readonly status: "denied"; readonly reason: "PERMISSION_DENIED" };

export interface ListAdministration {
  editSubjectList(actor: DecisionActor, request: SubjectListRequest): ListEditOutcome;
  editTerm(actor: DecisionActor, request: TermRequest): TermEditOutcome;
}

/** Whether the actor may edit lists in its channel. The check is by capability, never by role name. */
export function mayEditLists(actor: DecisionActor): boolean {
  return actor.capabilities.has(LIST_CAPABILITY);
}

/**
 * Blacklist, whitelist and word-list edits. The actor's channel is the only channel edited. Each change writes its own
 * Change Log row, and that summary names the change without any score.
 */
export function createListAdministration(deps: DecisionDeps): ListAdministration {
  return {
    editSubjectList(actor, request) {
      if (!mayEditLists(actor)) return { status: "denied", reason: "PERMISSION_DENIED" };
      const result = deps.store.applySubjectList({
        channelId: actor.channelId,
        subjectKey: request.subjectKey,
        listKind: request.listKind,
        actorRef: actor.accountRef,
        changedAt: deps.now().toISOString(),
      });
      switch (result.status) {
        case "applied":
          return { status: "applied" };
        case "unchanged":
          return { status: "unchanged" };
        case "conflict":
          return { status: "conflict", reason: result.reason };
        case "refused":
          return { status: "refused", reason: result.reason };
      }
    },

    editTerm(actor, request) {
      if (!mayEditLists(actor)) return { status: "denied", reason: "PERMISSION_DENIED" };
      const result = deps.store.applyTerm({
        channelId: actor.channelId,
        action: request.action,
        term: request.term,
        matchKind: request.matchKind,
        language: request.language,
        groupCode: request.groupCode,
        actorRef: actor.accountRef,
        changedAt: deps.now().toISOString(),
      });
      return { status: result.status };
    },
  };
}
