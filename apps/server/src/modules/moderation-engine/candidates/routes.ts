import type { CandidateCard, CandidateStore } from "./store.js";

/** Reading the review queue, cards included. Owners and moderators hold it (S003 membership matrix). */
export const QUEUE_READ_CAPABILITY = "queue.read";
/**
 * Editing lists and terms. Confirming or rejecting a candidate term is a term operation, the same capability that adds a term
 * in S014 (proposal section 2.1). Owners and moderators hold it (自定, N5).
 */
export const LIST_EDIT_CAPABILITY = "list.edit";

/** The caller, already authenticated by the HTTP binding. `capabilities` belongs to the caller's membership in the channel. */
export interface CandidateActor {
  readonly accountId: string;
  readonly channelId: string;
  readonly capabilities: ReadonlySet<string>;
}

export interface CandidateRouteResponse {
  readonly status: 200 | 400 | 403 | 404 | 409;
  readonly body: unknown;
}

export interface CandidateRoutes {
  listCards(actor: CandidateActor): CandidateRouteResponse;
  confirm(actor: CandidateActor, cardId: unknown): CandidateRouteResponse;
  reject(actor: CandidateActor, cardId: unknown): CandidateRouteResponse;
}

const FORBIDDEN: CandidateRouteResponse = { status: 403, body: { error: "FORBIDDEN" } };
const BAD_REQUEST: CandidateRouteResponse = { status: 400, body: { error: "INVALID_REQUEST" } };
const NOT_FOUND: CandidateRouteResponse = { status: 404, body: { error: "CANDIDATE_NOT_FOUND" } };
const CARD_ID = /^[A-Za-z0-9-]{1,64}$/u;

/**
 * The candidate-card routes as plain functions. The HTTP binding resolves the actor and writes the response. Each route
 * checks its capability before it reads or validates input, so a caller without the capability learns nothing.
 */
export function createCandidateRoutes(store: CandidateStore): CandidateRoutes {
  return {
    listCards(actor) {
      if (!actor.capabilities.has(QUEUE_READ_CAPABILITY)) return FORBIDDEN;
      return { status: 200, body: { cards: store.listCards(actor.channelId).map(viewOf) } };
    },

    confirm(actor, cardId) {
      if (!actor.capabilities.has(LIST_EDIT_CAPABILITY)) return FORBIDDEN;
      if (typeof cardId !== "string" || !CARD_ID.test(cardId)) return BAD_REQUEST;

      const result = store.confirm({ cardId, channelId: actor.channelId, actorRef: actor.accountId });
      switch (result.status) {
        case "CONFIRMED":
          return { status: 200, body: { status: "CONFIRMED", card: viewOf(result.card) } };
        case "NOT_FOUND":
          return NOT_FOUND;
        case "ALREADY_DECIDED":
          return { status: 409, body: { error: "ALREADY_DECIDED", card: viewOf(result.card) } };
      }
    },

    reject(actor, cardId) {
      if (!actor.capabilities.has(LIST_EDIT_CAPABILITY)) return FORBIDDEN;
      if (typeof cardId !== "string" || !CARD_ID.test(cardId)) return BAD_REQUEST;

      const result = store.reject({ cardId, channelId: actor.channelId, actorRef: actor.accountId });
      switch (result.status) {
        case "REJECTED":
          return { status: 200, body: { status: "REJECTED", card: viewOf(result.card) } };
        case "NOT_FOUND":
          return NOT_FOUND;
        case "ALREADY_DECIDED":
          return { status: 409, body: { error: "ALREADY_DECIDED", card: viewOf(result.card) } };
      }
    },
  };
}

/** The fields a reviewer needs. The internal decider reference is left out. */
function viewOf(card: CandidateCard) {
  return {
    id: card.id,
    term: card.term,
    note: card.note,
    sourceCorrelationId: card.sourceCorrelationId,
    status: card.status,
    createdAt: card.createdAt,
    decidedAt: card.decidedAt,
    ruleVersion: card.ruleVersion,
  };
}
