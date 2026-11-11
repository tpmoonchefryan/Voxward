import { describe, expect, it } from "vitest";
import { FakeRules, proposalOf, storeWith } from "./fixtures.js";

describe("candidate cards", () => {
  it("keeps a proposal as a pending card with its source, and changes no rule", () => {
    const { store, rules } = storeWith();

    const card = store.propose(proposalOf({ note: "seen once" }));

    expect(card).toMatchObject({
      status: "PENDING_CONFIRMATION",
      term: "phrase-x",
      note: "seen once",
      sourceCorrelationId: "corr-1",
      sourceTaskId: "task-1",
      decidedByRef: null,
      ruleVersion: null,
    });
    expect(rules.published).toEqual([]);
  });

  it("keeps one card per term in a channel, and the first source", () => {
    const { store } = storeWith();
    store.propose(proposalOf({ term: "phrase-x" }));

    expect(store.propose(proposalOf({ term: " phrase-x ", sourceCorrelationId: "corr-2" }))).toBeNull();

    const cards = store.listCards("ch-1");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.sourceCorrelationId).toBe("corr-1");
  });

  it("gives the same term in another channel its own card", () => {
    const { store } = storeWith();
    store.propose(proposalOf());

    expect(store.propose(proposalOf({ channelId: "ch-2" }))).not.toBeNull();
    expect(store.listCards("ch-2")).toHaveLength(1);
  });

  it("publishes a confirmed term once, and records who confirmed it and the new rule version", () => {
    const { store, rules } = storeWith();
    const pending = store.propose(proposalOf());
    const cardId = pending?.id ?? "";

    const result = store.confirm({ cardId, channelId: "ch-1", actorRef: "account-mod" });

    expect(result).toMatchObject({
      status: "CONFIRMED",
      card: { status: "CONFIRMED", decidedByRef: "account-mod", ruleVersion: 2 },
    });
    expect(rules.published).toEqual([{ channelId: "ch-1", term: "phrase-x", candidateId: cardId, actorRef: "account-mod" }]);
  });

  it("refuses a second confirmation and publishes nothing more", () => {
    const { store, rules } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";
    store.confirm({ cardId, channelId: "ch-1", actorRef: "account-mod" });

    expect(store.confirm({ cardId, channelId: "ch-1", actorRef: "account-owner" }).status).toBe("ALREADY_DECIDED");
    expect(rules.published).toHaveLength(1);
  });

  it("does not show a card of another channel, and publishes nothing for it", () => {
    const { store, rules } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";

    expect(store.confirm({ cardId, channelId: "ch-2", actorRef: "account-mod" })).toEqual({ status: "NOT_FOUND" });
    expect(store.readCard(cardId)?.status).toBe("PENDING_CONFIRMATION");
    expect(rules.published).toEqual([]);
  });

  it("leaves a card pending when the rule port fails", () => {
    const { store, rules } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";
    rules.failNext = true;

    expect(() => store.confirm({ cardId, channelId: "ch-1", actorRef: "account-mod" })).toThrow("synthetic publish failure");
    expect(store.readCard(cardId)).toMatchObject({ status: "PENDING_CONFIRMATION", ruleVersion: null });
  });

  it("does not propose again a term that was already confirmed", () => {
    const { store } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";
    store.confirm({ cardId, channelId: "ch-1", actorRef: "account-mod" });

    expect(store.propose(proposalOf({ sourceCorrelationId: "corr-9" }))).toBeNull();
  });

  it("reports an unknown card as not found", () => {
    const { store } = storeWith();
    expect(store.confirm({ cardId: "missing", channelId: "ch-1", actorRef: "account-mod" })).toEqual({ status: "NOT_FOUND" });
  });
});

describe("candidate cards: rejection (N5)", () => {
  it("rejects a pending card: it publishes nothing and records who rejected it", () => {
    const { store, rules } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";

    const result = store.reject({ cardId, channelId: "ch-1", actorRef: "account-mod" });

    expect(result).toMatchObject({
      status: "REJECTED",
      card: { status: "REJECTED", decidedByRef: "account-mod", ruleVersion: null },
    });
    expect(rules.published).toEqual([]);
  });

  it("does not confirm a rejected card, and does not propose its term again", () => {
    const { store, rules } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";
    store.reject({ cardId, channelId: "ch-1", actorRef: "account-mod" });

    expect(store.confirm({ cardId, channelId: "ch-1", actorRef: "account-owner" }).status).toBe("ALREADY_DECIDED");
    expect(store.propose(proposalOf({ sourceCorrelationId: "corr-9" }))).toBeNull();
    expect(rules.published).toEqual([]);
  });

  it("refuses to reject a confirmed card, or a card that was already rejected", () => {
    const { store } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";
    store.confirm({ cardId, channelId: "ch-1", actorRef: "account-mod" });

    expect(store.reject({ cardId, channelId: "ch-1", actorRef: "account-mod" }).status).toBe("ALREADY_DECIDED");
    expect(store.reject({ cardId: "missing", channelId: "ch-1", actorRef: "account-mod" })).toEqual({ status: "NOT_FOUND" });
  });

  it("does not reject a card of another channel", () => {
    const { store } = storeWith();
    const cardId = store.propose(proposalOf())?.id ?? "";

    expect(store.reject({ cardId, channelId: "ch-2", actorRef: "account-mod" })).toEqual({ status: "NOT_FOUND" });
    expect(store.readCard(cardId)?.status).toBe("PENDING_CONFIRMATION");
  });
});

/* VW-SUB036 Q51: a deletion removes the cards whose source chain belongs to the subject, whatever their status. */
describe("candidate cards, removal by source chain (Q51)", () => {
  it("removes the cards of the given chains in the channel, and frees their terms", () => {
    const { store } = storeWith();
    store.propose(proposalOf({ term: "phrase-a", sourceCorrelationId: "chain-1" }));
    store.propose(proposalOf({ term: "phrase-b", sourceCorrelationId: "chain-2" }));
    store.propose(proposalOf({ term: "phrase-c", sourceCorrelationId: "chain-1", channelId: "channel-other" }));

    expect(store.removeBySourceCorrelations("ch-1", ["chain-1"])).toBe(1);
    expect(store.listCards("ch-1").map((card) => card.term)).toEqual(["phrase-b"]);
    expect(store.listCards("channel-other").map((card) => card.term)).toEqual(["phrase-c"]);
    expect(store.propose(proposalOf({ term: "phrase-a", sourceCorrelationId: "chain-3" }))).not.toBeNull();
  });
});
