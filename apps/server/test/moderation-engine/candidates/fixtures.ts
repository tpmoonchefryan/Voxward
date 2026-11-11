import type { CandidateRulePort } from "../../../src/modules/moderation-engine/candidates/store.js";
import { createCandidateStore } from "../../../src/modules/moderation-engine/candidates/store.js";
import type { CandidateProposal } from "../../../src/modules/moderation-engine/review/ports.js";

export interface Published {
  readonly channelId: string;
  readonly term: string;
  readonly candidateId: string;
  readonly actorRef: string;
}

/** A rule port stand-in. Each publish takes the next version number, starting after the first version. */
export class FakeRules implements CandidateRulePort {
  readonly published: Published[] = [];
  failNext = false;
  private version = 1;

  publishConfirmedTerm(input: Published): number {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("synthetic publish failure");
    }
    this.published.push(input);
    this.version += 1;
    return this.version;
  }
}

export function proposalOf(overrides: Partial<CandidateProposal> = {}): CandidateProposal {
  return {
    channelId: "ch-1",
    term: "phrase-x",
    note: null,
    sourceCorrelationId: "corr-1",
    sourceTaskId: "task-1",
    ...overrides,
  };
}

export function storeWith(rules: FakeRules = new FakeRules()) {
  let counter = 0;
  const store = createCandidateStore({
    newId: () => {
      counter += 1;
      return `card-${counter}`;
    },
    now: () => new Date("2026-11-11T07:00:00.000Z"),
    rules,
  });
  return { store, rules };
}

