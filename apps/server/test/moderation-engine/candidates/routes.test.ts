import { describe, expect, it } from "vitest";
import { type CandidateActor, createCandidateRoutes } from "../../../src/modules/moderation-engine/candidates/routes.js";
import { FakeRules, proposalOf, storeWith } from "./fixtures.js";

/** A moderator holds list.edit, the capability that adds and removes terms (proposal section 2.1). */
const MODERATOR: CandidateActor = {
  accountId: "account-mod",
  channelId: "ch-1",
  capabilities: new Set(["queue.read", "review.decide", "list.edit", "message.original"]),
};
/** Can decide reviews but cannot edit lists or terms: the capability to confirm a term is list.edit (N5). */
const REVIEWER_WITHOUT_LIST_EDIT: CandidateActor = {
  accountId: "account-reviewer",
  channelId: "ch-1",
  capabilities: new Set(["queue.read", "review.decide"]),
};
const VIEWER_WITHOUT_DECISION: CandidateActor = {
  accountId: "account-viewer",
  channelId: "ch-1",
  capabilities: new Set(["logs.view"]),
};
const DATA_ADMIN: CandidateActor = {
  accountId: "account-data",
  channelId: "ch-1",
  capabilities: new Set(["subject.evidence", "data.handle"]),
};

function setup() {
  const { store, rules } = storeWith(new FakeRules());
  const routes = createCandidateRoutes(store);
  const cardId = store.propose(proposalOf())?.id ?? "";
  return { store, rules, routes, cardId };
}

describe("candidate-card routes", () => {
  it("refuses confirmation to a member without list.edit, and publishes nothing", () => {
    const { store, rules, routes, cardId } = setup();

    expect(routes.confirm(VIEWER_WITHOUT_DECISION, cardId)).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
    expect(routes.confirm(DATA_ADMIN, cardId).status).toBe(403);
    expect(routes.confirm(REVIEWER_WITHOUT_LIST_EDIT, cardId).status).toBe(403);
    expect(rules.published).toEqual([]);
    expect(store.readCard(cardId)?.status).toBe("PENDING_CONFIRMATION");
  });

  it("confirms a card for a moderator and returns the new rule version", () => {
    const { rules, routes, cardId } = setup();

    const response = routes.confirm(MODERATOR, cardId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "CONFIRMED", card: { id: cardId, status: "CONFIRMED", ruleVersion: 2 } });
    expect(rules.published).toHaveLength(1);
  });

  it("answers 404 for a card of another channel and 409 for a second confirmation", () => {
    const { rules, routes, cardId } = setup();
    const otherChannel: CandidateActor = { ...MODERATOR, channelId: "ch-2" };

    expect(routes.confirm(otherChannel, cardId)).toEqual({ status: 404, body: { error: "CANDIDATE_NOT_FOUND" } });
    routes.confirm(MODERATOR, cardId);
    expect(routes.confirm(MODERATOR, cardId).status).toBe(409);
    expect(rules.published).toHaveLength(1);
  });

  it("rejects a card for a moderator, publishes nothing, and refuses a later confirmation", () => {
    const { rules, routes, cardId } = setup();

    const response = routes.reject(MODERATOR, cardId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "REJECTED", card: { id: cardId, status: "REJECTED", ruleVersion: null } });
    expect(rules.published).toEqual([]);
    expect(routes.confirm(MODERATOR, cardId)).toMatchObject({ status: 409, body: { error: "ALREADY_DECIDED" } });
  });

  it("refuses rejection to a member without list.edit, and to a card of another channel", () => {
    const { store, routes, cardId } = setup();
    const otherChannel: CandidateActor = { ...MODERATOR, channelId: "ch-2" };

    expect(routes.reject(REVIEWER_WITHOUT_LIST_EDIT, cardId)).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
    expect(routes.reject(otherChannel, cardId)).toEqual({ status: 404, body: { error: "CANDIDATE_NOT_FOUND" } });
    expect(store.readCard(cardId)?.status).toBe("PENDING_CONFIRMATION");
  });

  it("rejects a malformed card id before any lookup", () => {
    const { routes } = setup();

    expect(routes.confirm(MODERATOR, "../rules")).toEqual({ status: 400, body: { error: "INVALID_REQUEST" } });
    expect(routes.confirm(MODERATOR, 42).status).toBe(400);
    expect(routes.reject(MODERATOR, "../rules")).toEqual({ status: 400, body: { error: "INVALID_REQUEST" } });
  });

  it("lists cards only for a member with queue.read, and leaves the decider reference out", () => {
    const { routes } = setup();

    expect(routes.listCards(DATA_ADMIN)).toEqual({ status: 403, body: { error: "FORBIDDEN" } });

    const response = routes.listCards(MODERATOR);
    expect(response.status).toBe(200);
    const cards = (response.body as { readonly cards: readonly Record<string, unknown>[] }).cards;
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ term: "phrase-x", status: "PENDING_CONFIRMATION", sourceCorrelationId: "corr-1" });
    expect(cards[0]).not.toHaveProperty("decidedByRef");
  });
});
