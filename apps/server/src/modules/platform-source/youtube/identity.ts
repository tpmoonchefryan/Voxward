/**
 * Platform identity capability mapping (design.md, section 6; proposal 3.2). The platform's own flags decide the kind. An
 * identity the platform does not show is UNKNOWN, and it is never reported as a "no". A subscriber flag is not provided by
 * the YouTube API, so no subscription marker is ever created.
 */
import type { IdentityKind } from "@voxward/contracts";
import type { AuthorFlags } from "./stream-list.js";

export type IdentityFlag = "isChatOwner" | "isChatModerator" | "isChatSponsor" | "isVerified";

/** Evidence in the order it is checked (自定). IdentityKind holds one value, so the first true flag wins. */
const EVIDENCE: readonly { readonly kind: Exclude<IdentityKind, "UNKNOWN">; readonly flag: IdentityFlag }[] = [
  { kind: "CHANNEL_OWNER", flag: "isChatOwner" },
  { kind: "MODERATOR", flag: "isChatModerator" },
  { kind: "PAID_MEMBER", flag: "isChatSponsor" },
  { kind: "VERIFIED_ACCOUNT", flag: "isVerified" },
];

export interface IdentityObservation {
  readonly kind: IdentityKind;
  /**
   * False when the flags do not say enough: a flag is missing and no evidence is true. An uncertain observation never
   * changes a stored identity, so it cannot downgrade a member.
   */
  readonly certain: boolean;
  /** The platform flag that showed the kind. Null for UNKNOWN. */
  readonly evidence: IdentityFlag | null;
  /** The YouTube API does not provide a subscriber flag. Always NOT_PROVIDED. */
  readonly subscription: "NOT_PROVIDED";
}

export function observeIdentity(flags: AuthorFlags): IdentityObservation {
  for (const { kind, flag } of EVIDENCE) {
    if (flags[flag] === true) return { kind, certain: true, evidence: flag, subscription: "NOT_PROVIDED" };
  }
  const everyFlagKnownAbsent = EVIDENCE.every(({ flag }) => flags[flag] === false);
  return { kind: "UNKNOWN", certain: everyFlagKnownAbsent, evidence: null, subscription: "NOT_PROVIDED" };
}

/** An identity change for the scoring pipeline. Its fields match the scoring module's IdentityTransition. */
export interface PlatformIdentityChange {
  readonly channelId: string;
  readonly subjectKey: string;
  readonly sourceEventRef: string;
  readonly effectiveFrom: string;
  readonly nextKind: IdentityKind;
}

export interface IdentityObservationInput {
  readonly channelId: string;
  readonly subjectKey: string;
  readonly observation: IdentityObservation;
  /** Platform message reference of the observation. Unique per message, so the scoring ledger applies it once. */
  readonly sourceEventRef: string;
  readonly effectiveFrom: string;
}

export interface IdentityTracker {
  /** Returns a change only for a certain observation that differs from the last certain kind seen for the subject. */
  observe(input: IdentityObservationInput): PlatformIdentityChange | null;
}

/**
 * Remembers the last certain kind per subject, up to a bounded number of subjects (自定 capacity). The scoring ledger
 * still decides. The tracker only keeps repeated identity messages away from it. A subject the tracker does not remember
 * is reported once, because the stored identity may differ from anything this process has seen.
 */
export function createIdentityTracker(options: { readonly capacity: number }): IdentityTracker {
  if (!Number.isSafeInteger(options.capacity) || options.capacity < 1) {
    throw new RangeError("capacity must be a positive integer");
  }
  // A Map keeps insertion order. Re-inserting a key moves it to the end, so the first key is the least recently seen.
  const lastKind = new Map<string, IdentityKind>();
  return {
    observe(input) {
      if (!input.observation.certain) return null;
      if (lastKind.get(input.subjectKey) === input.observation.kind) return null;
      lastKind.delete(input.subjectKey);
      lastKind.set(input.subjectKey, input.observation.kind);
      if (lastKind.size > options.capacity) {
        const oldest = lastKind.keys().next().value;
        if (oldest !== undefined) lastKind.delete(oldest);
      }
      return {
        channelId: input.channelId,
        subjectKey: input.subjectKey,
        sourceEventRef: input.sourceEventRef,
        effectiveFrom: input.effectiveFrom,
        nextKind: input.observation.kind,
      };
    },
  };
}
