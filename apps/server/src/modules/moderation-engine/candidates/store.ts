import { normalizeText } from "../rules/normalize.js";
import type { CandidateProposal, CandidateProposalPort } from "../review/ports.js";

/**
 * A candidate term waits on a card until a person with `list.edit` confirms or rejects it (proposal sections 2.1 and 5.4).
 * Nothing here changes the rule set: only a confirmation publishes a term, through the rule port.
 */
export const CANDIDATE_STATUSES = ["PENDING_CONFIRMATION", "CONFIRMED", "REJECTED"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export interface CandidateCard {
  readonly id: string;
  readonly channelId: string;
  readonly term: string;
  readonly note: string | null;
  readonly language: string | null;
  readonly sourceCorrelationId: string;
  readonly sourceTaskId: string;
  readonly status: CandidateStatus;
  readonly createdAt: string;
  readonly decidedByRef: string | null;
  readonly decidedAt: string | null;
  /** The rule version that published the term. Null until the card is confirmed. */
  readonly ruleVersion: number | null;
}

/** The rule set's publishing entry point. A server binding writes rule_versions and rule_terms in one transaction. */
export interface CandidateRulePort {
  /** Publishes one confirmed term as a new rule version, and returns that version number. */
  publishConfirmedTerm(input: {
    readonly channelId: string;
    readonly term: string;
    readonly candidateId: string;
    readonly actorRef: string;
    readonly language?: string;
  }): number;
}

export interface CandidateStoreOptions {
  /** Identifier source for cards. Required: the module cannot import node:crypto. */
  readonly newId: () => string;
  readonly now: () => Date;
  readonly rules: CandidateRulePort;
}

export type ConfirmResult =
  | { readonly status: "CONFIRMED"; readonly card: CandidateCard }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "ALREADY_DECIDED"; readonly card: CandidateCard };

export type RejectResult =
  | { readonly status: "REJECTED"; readonly card: CandidateCard }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "ALREADY_DECIDED"; readonly card: CandidateCard };

export interface CandidateStore extends CandidateProposalPort {
  /** Adds a card for a new term. Returns null when the channel already has a card for the same term. */
  propose(proposal: CandidateProposal): CandidateCard | null;
  listCards(channelId: string): readonly CandidateCard[];
  readCard(cardId: string): CandidateCard | undefined;
  /** Confirms one pending card of the channel. A card changes status once, so a repeated call publishes nothing. */
  confirm(input: { readonly cardId: string; readonly channelId: string; readonly actorRef: string }): ConfirmResult;
  /** Rejects one pending card of the channel. The card stays on record, so the same term is not proposed again. */
  reject(input: { readonly cardId: string; readonly channelId: string; readonly actorRef: string }): RejectResult;
  /**
   * Removes every card of the channel whose source chain is in `correlationIds`, whatever its status (S019, Q51). A term
   * is free to be proposed again after its card is removed. Returns how many cards were removed.
   */
  removeBySourceCorrelations(channelId: string, correlationIds: readonly string[]): number;
}

interface MutableCard {
  id: string;
  channelId: string;
  term: string;
  note: string | null;
  language: string | null;
  sourceCorrelationId: string;
  sourceTaskId: string;
  status: CandidateStatus;
  createdAt: string;
  decidedByRef: string | null;
  decidedAt: string | null;
  ruleVersion: number | null;
}

/**
 * In-memory card store. The methods run without yielding, so a confirmation checks and changes the status in one step.
 * A database binding keeps the same rule with a conditional update.
 */
export function createCandidateStore(options: CandidateStoreOptions): CandidateStore {
  const cards = new Map<string, MutableCard>();
  /** One card per normalized term in a channel, whatever its status. A rejected term is therefore never proposed again. */
  const cardByTerm = new Map<string, string>();

  return {
    propose(proposal) {
      const key = termKeyOf(proposal.channelId, proposal.term);
      if (cardByTerm.has(key)) return null;
      const card: MutableCard = {
        id: options.newId(),
        channelId: proposal.channelId,
        term: proposal.term,
        note: proposal.note,
        language: proposal.language ?? null,
        sourceCorrelationId: proposal.sourceCorrelationId,
        sourceTaskId: proposal.sourceTaskId,
        status: "PENDING_CONFIRMATION",
        createdAt: options.now().toISOString(),
        decidedByRef: null,
        decidedAt: null,
        ruleVersion: null,
      };
      cards.set(card.id, card);
      cardByTerm.set(key, card.id);
      return snapshotOf(card);
    },

    listCards(channelId) {
      return [...cards.values()]
        .filter((card) => card.channelId === channelId)
        .sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1))
        .map(snapshotOf);
    },

    readCard(cardId) {
      const card = cards.get(cardId);
      return card === undefined ? undefined : snapshotOf(card);
    },

    confirm({ cardId, channelId, actorRef }) {
      const card = cards.get(cardId);
      if (card === undefined || card.channelId !== channelId) return { status: "NOT_FOUND" };
      if (card.status !== "PENDING_CONFIRMATION") return { status: "ALREADY_DECIDED", card: snapshotOf(card) };

      // The port runs first. If it throws, the card stays pending and nothing is recorded as confirmed.
      const ruleVersion = options.rules.publishConfirmedTerm({
        channelId,
        term: card.term,
        candidateId: card.id,
        actorRef,
        ...(card.language === null ? {} : { language: card.language }),
      });
      card.status = "CONFIRMED";
      card.decidedByRef = actorRef;
      card.decidedAt = options.now().toISOString();
      card.ruleVersion = ruleVersion;
      return { status: "CONFIRMED", card: snapshotOf(card) };
    },

    reject({ cardId, channelId, actorRef }) {
      const card = cards.get(cardId);
      if (card === undefined || card.channelId !== channelId) return { status: "NOT_FOUND" };
      if (card.status !== "PENDING_CONFIRMATION") return { status: "ALREADY_DECIDED", card: snapshotOf(card) };

      card.status = "REJECTED";
      card.decidedByRef = actorRef;
      card.decidedAt = options.now().toISOString();
      return { status: "REJECTED", card: snapshotOf(card) };
    },

    removeBySourceCorrelations(channelId, correlationIds) {
      const chains = new Set(correlationIds);
      let removed = 0;
      for (const card of [...cards.values()]) {
        if (card.channelId !== channelId || !chains.has(card.sourceCorrelationId)) continue;
        cards.delete(card.id);
        const key = termKeyOf(card.channelId, card.term);
        if (cardByTerm.get(key) === card.id) cardByTerm.delete(key);
        removed += 1;
      }
      return removed;
    },
  };
}

function termKeyOf(channelId: string, term: string): string {
  return JSON.stringify([channelId, normalizeText(term).trim()]);
}

function snapshotOf(card: MutableCard): CandidateCard {
  return { ...card };
}
