import { readChannelSetting, writeChannelSetting } from "./channel-settings-store.js";
import type { VoxwardDatabase } from "./client.js";

export type PersistentCandidateStatus = "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED";

export interface PersistentCandidateCard {
  readonly id: string;
  readonly channelId: string;
  readonly term: string;
  readonly note: string | null;
  readonly language: string | null;
  readonly sourceCorrelationId: string;
  readonly sourceTaskId: string;
  readonly status: PersistentCandidateStatus;
  readonly createdAt: string;
  readonly decidedByRef: string | null;
  readonly decidedAt: string | null;
  readonly ruleVersion: number | null;
}

export interface PersistentCandidateRulePort {
  publishConfirmedTerm(input: {
    readonly channelId: string;
    readonly term: string;
    readonly candidateId: string;
    readonly actorRef: string;
    readonly language?: string;
  }): number;
}

export interface PersistentCandidateStoreOptions {
  readonly newId: () => string;
  readonly now: () => Date;
  readonly rules: PersistentCandidateRulePort;
}

export type PersistentConfirmResult =
  | { readonly status: "CONFIRMED"; readonly card: PersistentCandidateCard }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "ALREADY_DECIDED"; readonly card: PersistentCandidateCard };

export type PersistentRejectResult =
  | { readonly status: "REJECTED"; readonly card: PersistentCandidateCard }
  | { readonly status: "NOT_FOUND" }
  | { readonly status: "ALREADY_DECIDED"; readonly card: PersistentCandidateCard };

export interface PersistentCandidateStore {
  propose(proposal: {
    readonly channelId: string;
    readonly term: string;
    readonly note: string | null;
    readonly language?: string;
    readonly sourceCorrelationId: string;
    readonly sourceTaskId: string;
  }): PersistentCandidateCard | null;
  listCards(channelId: string): readonly PersistentCandidateCard[];
  readCard(cardId: string): PersistentCandidateCard | undefined;
  confirm(input: { readonly cardId: string; readonly channelId: string; readonly actorRef: string }): PersistentConfirmResult;
  reject(input: { readonly cardId: string; readonly channelId: string; readonly actorRef: string }): PersistentRejectResult;
  removeBySourceCorrelations(channelId: string, correlationIds: readonly string[]): number;
}

const SETTING_KEY = "candidate-cards";

function normalizeTermKey(term: string): string {
  return term.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function readCards(database: VoxwardDatabase, channelId: string): PersistentCandidateCard[] {
  return readChannelSetting<PersistentCandidateCard[]>(database, channelId, SETTING_KEY, []);
}

function writeCards(
  database: VoxwardDatabase,
  channelId: string,
  cards: readonly PersistentCandidateCard[],
  now: Date,
): void {
  writeChannelSetting(database, channelId, SETTING_KEY, cards, now);
}

/**
 * SQLite-persisted candidate term store backed by channel `deployment_settings`.
 * Survives process restarts and exposes `removeBySourceCorrelations` for SubjectCacheHub cleanup.
 */
export function createPersistentCandidateStore(
  database: VoxwardDatabase,
  options: PersistentCandidateStoreOptions,
): PersistentCandidateStore {
  return {
    propose(proposal) {
      const cards = readCards(database, proposal.channelId);
      const norm = normalizeTermKey(proposal.term);
      if (cards.some((card) => normalizeTermKey(card.term) === norm)) return null;
      const now = options.now();
      const card: PersistentCandidateCard = {
        id: options.newId(),
        channelId: proposal.channelId,
        term: proposal.term,
        note: proposal.note,
        language: proposal.language ?? null,
        sourceCorrelationId: proposal.sourceCorrelationId,
        sourceTaskId: proposal.sourceTaskId,
        status: "PENDING_CONFIRMATION",
        createdAt: now.toISOString(),
        decidedByRef: null,
        decidedAt: null,
        ruleVersion: null,
      };
      writeCards(database, proposal.channelId, [...cards, card], now);
      return card;
    },

    listCards(channelId) {
      return [...readCards(database, channelId)].sort((a, b) =>
        a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1,
      );
    },

    readCard(cardId) {
      // Scan channel candidate-cards entries in deployment_settings.
      const rows = database.sqlite
        .prepare("SELECT value_json FROM deployment_settings WHERE key LIKE ?")
        .all(`%:${SETTING_KEY}`) as Array<{ value_json: string }>;
      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.value_json) as unknown;
          if (!Array.isArray(parsed)) continue;
          const found = (parsed as PersistentCandidateCard[]).find((c) => c.id === cardId);
          if (found !== undefined) return found;
        } catch {
          // Ignore malformed row.
        }
      }
      return undefined;
    },

    confirm({ cardId, channelId, actorRef }) {
      const cards = readCards(database, channelId);
      const idx = cards.findIndex((c) => c.id === cardId);
      if (idx < 0) return { status: "NOT_FOUND" };
      const current = cards[idx]!;
      if (current.status !== "PENDING_CONFIRMATION") return { status: "ALREADY_DECIDED", card: current };
      const ruleVersion = options.rules.publishConfirmedTerm({
        channelId,
        term: current.term,
        candidateId: current.id,
        actorRef,
        ...(current.language === null ? {} : { language: current.language }),
      });
      const now = options.now();
      const updated: PersistentCandidateCard = {
        ...current,
        status: "CONFIRMED",
        decidedByRef: actorRef,
        decidedAt: now.toISOString(),
        ruleVersion,
      };
      const next = [...cards];
      next[idx] = updated;
      writeCards(database, channelId, next, now);
      return { status: "CONFIRMED", card: updated };
    },

    reject({ cardId, channelId, actorRef }) {
      const cards = readCards(database, channelId);
      const idx = cards.findIndex((c) => c.id === cardId);
      if (idx < 0) return { status: "NOT_FOUND" };
      const current = cards[idx]!;
      if (current.status !== "PENDING_CONFIRMATION") return { status: "ALREADY_DECIDED", card: current };
      const now = options.now();
      const updated: PersistentCandidateCard = {
        ...current,
        status: "REJECTED",
        decidedByRef: actorRef,
        decidedAt: now.toISOString(),
      };
      const next = [...cards];
      next[idx] = updated;
      writeCards(database, channelId, next, now);
      return { status: "REJECTED", card: updated };
    },

    removeBySourceCorrelations(channelId, correlationIds) {
      if (correlationIds.length === 0) return 0;
      const chains = new Set(correlationIds);
      const cards = readCards(database, channelId);
      const kept = cards.filter((card) => !chains.has(card.sourceCorrelationId));
      const removed = cards.length - kept.length;
      if (removed > 0) {
        writeCards(database, channelId, kept, options.now());
      }
      return removed;
    },
  };
}
