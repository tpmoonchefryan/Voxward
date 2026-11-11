import {
  createVerdict,
  INTERNAL_CLASSIFICATIONS,
  TERM_MATCH_KINDS,
  type CommitOutcome,
  type DecisionActor,
  type DecisionService,
  type InternalClassification,
  type OverturnOutcome,
  type ResendOutcome,
  type TermMatchKind,
} from "@voxward/contracts";
import type { ListAdministration, ListEditOutcome, TermEditOutcome } from "./list-permissions.js";

/** A route result. The HTTP binding writes the status and the body, and nothing else. */
export interface RouteResponse {
  readonly status: number;
  readonly body: unknown;
}

const BAD_REQUEST: RouteResponse = { status: 400, body: { error: "INVALID_REQUEST" } };
const FORBIDDEN: RouteResponse = { status: 403, body: { error: "FORBIDDEN" } };
const MAX_ID_LENGTH = 128;
const MAX_TEXT_LENGTH = 200;

/**
 * The decision routes as plain functions. The binding resolves the actor from the session and the channel membership, so
 * the capabilities come from the server, never from the request body.
 */
export interface DecisionRoutes {
  commitTask(actor: DecisionActor, taskId: unknown, body: unknown): Promise<RouteResponse>;
  reviewEvent(actor: DecisionActor, eventId: unknown, body: unknown): Promise<RouteResponse>;
  resendDelivery(actor: DecisionActor, deliveryId: unknown, body: unknown): Promise<RouteResponse>;
  editSubjectList(actor: DecisionActor, body: unknown): RouteResponse;
  editTerm(actor: DecisionActor, body: unknown): RouteResponse;
}

export function createDecisionRoutes(service: DecisionService, lists: ListAdministration): DecisionRoutes {
  return {
    async commitTask(actor, taskId, body) {
      const id = parseOpaqueId(taskId);
      const classification = parseClassification(body);
      if (id === undefined || classification === undefined) return BAD_REQUEST;
      const outcome = await service.commit(id, createVerdict(classification), { kind: "HUMAN", actor });
      return commitResponse(outcome);
    },

    async reviewEvent(actor, eventId, body) {
      const id = parseOpaqueId(eventId);
      const fields = parseReview(body);
      if (id === undefined || fields === undefined) return BAD_REQUEST;
      const outcome = await service.overturn({
        eventId: id,
        operationId: fields.operationId,
        verdict: createVerdict(fields.classification),
        actor,
      });
      return overturnResponse(outcome);
    },

    async resendDelivery(actor, deliveryId, body) {
      const id = parseOpaqueId(deliveryId);
      const operationId = parseOperationId(body);
      if (id === undefined || operationId === undefined) return BAD_REQUEST;
      const outcome = await service.resend({ deliveryId: id, operationId, actor });
      return resendResponse(outcome);
    },

    editSubjectList(actor, body) {
      const fields = parseSubjectList(body);
      if (fields === undefined) return BAD_REQUEST;
      return listResponse(lists.editSubjectList(actor, fields));
    },

    editTerm(actor, body) {
      const fields = parseTerm(body);
      if (fields === undefined) return BAD_REQUEST;
      return termResponse(lists.editTerm(actor, fields));
    },
  };
}

/** A conflict is 409 and carries the current decision, so the operator can see what won. Denial is 403. */
export function commitResponse(outcome: CommitOutcome): RouteResponse {
  switch (outcome.status) {
    case "committed":
      return {
        status: 200,
        body: {
          status: "committed",
          seq: outcome.seq,
          verdict: outcome.intent.verdict,
          deliverySequence: outcome.intent.deliverySequence,
          validUntil: outcome.intent.validUntil,
          scoring: outcome.scoring,
        },
      };
    case "conflict":
      return { status: 409, body: { status: "conflict", reason: outcome.reason, current: outcome.current } };
    case "denied":
      return FORBIDDEN;
  }
}

export function overturnResponse(outcome: OverturnOutcome): RouteResponse {
  switch (outcome.status) {
    case "overturned":
      return {
        status: 200,
        body: {
          status: "overturned",
          seq: outcome.seq,
          verdict: outcome.downstream,
          deliverySequence: outcome.intent?.deliverySequence ?? null,
          validUntil: outcome.intent?.validUntil ?? null,
          compensation: outcome.compensation,
        },
      };
    case "duplicate":
      return { status: 200, body: { status: "duplicate", seq: outcome.seq } };
    case "conflict":
      return { status: 409, body: { status: "conflict", reason: outcome.reason, current: outcome.current } };
    case "denied":
      return FORBIDDEN;
  }
}

export function resendResponse(outcome: ResendOutcome): RouteResponse {
  switch (outcome.status) {
    case "resent":
      return {
        status: 200,
        body: {
          status: "resent",
          verdict: outcome.intent.verdict,
          deliverySequence: outcome.intent.deliverySequence,
          validUntil: outcome.intent.validUntil,
        },
      };
    case "duplicate":
      return { status: 200, body: { status: "duplicate" } };
    case "refused":
      return { status: 409, body: { status: "refused", reason: outcome.reason } };
    case "denied":
      return FORBIDDEN;
  }
}

function listResponse(outcome: ListEditOutcome): RouteResponse {
  switch (outcome.status) {
    case "applied":
    case "unchanged":
      return { status: 200, body: { status: outcome.status } };
    case "conflict":
      return { status: 409, body: { status: "conflict", reason: outcome.reason } };
    case "refused":
      return { status: 404, body: { status: "refused", reason: outcome.reason } };
    case "denied":
      return FORBIDDEN;
  }
}

function termResponse(outcome: TermEditOutcome): RouteResponse {
  switch (outcome.status) {
    case "applied":
    case "unchanged":
      return { status: 200, body: { status: outcome.status } };
    case "denied":
      return FORBIDDEN;
  }
}

function parseOpaqueId(value: unknown): string | undefined {
  return parseText(value, MAX_ID_LENGTH);
}

function parseText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.trim() === "" || value.length > maxLength) return undefined;
  return value;
}

function parseObject(body: unknown): Record<string, unknown> | undefined {
  return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : undefined;
}

function parseClassification(body: unknown): InternalClassification | undefined {
  const value = parseObject(body)?.classification;
  return typeof value === "string" && (INTERNAL_CLASSIFICATIONS as readonly string[]).includes(value)
    ? (value as InternalClassification)
    : undefined;
}

function parseOperationId(body: unknown): string | undefined {
  return parseText(parseObject(body)?.operationId, MAX_ID_LENGTH);
}

function parseReview(body: unknown): { classification: InternalClassification; operationId: string } | undefined {
  const classification = parseClassification(body);
  const operationId = parseOperationId(body);
  return classification === undefined || operationId === undefined ? undefined : { classification, operationId };
}

function parseSubjectList(body: unknown): { subjectKey: string; listKind: "BLACKLIST" | "WHITELIST" | null } | undefined {
  const fields = parseObject(body);
  const subjectKey = parseText(fields?.subjectKey, MAX_ID_LENGTH);
  const listKind = fields?.listKind;
  if (subjectKey === undefined) return undefined;
  if (listKind === null) return { subjectKey, listKind: null };
  if (listKind === "BLACKLIST" || listKind === "WHITELIST") return { subjectKey, listKind };
  return undefined;
}

function parseTerm(body: unknown):
  | {
      action: "ADD" | "RETIRE";
      term: string;
      matchKind: TermMatchKind;
      language: string;
      groupCode: string;
    }
  | undefined {
  const fields = parseObject(body);
  const action = fields?.action;
  const term = parseText(fields?.term, MAX_TEXT_LENGTH);
  const language = parseText(fields?.language, 16);
  const groupCode = parseText(fields?.groupCode, 64);
  const matchKind = fields?.matchKind;
  if (action !== "ADD" && action !== "RETIRE") return undefined;
  if (term === undefined || language === undefined || groupCode === undefined) return undefined;
  if (typeof matchKind !== "string" || !(TERM_MATCH_KINDS as readonly string[]).includes(matchKind)) return undefined;
  return { action, term, matchKind: matchKind as TermMatchKind, language, groupCode };
}
