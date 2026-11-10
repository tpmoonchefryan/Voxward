import { type SubjectRef, subjectKey } from "../rules/engine.js";
import type { Transliterator } from "../rules/transliterate.js";

/** Longest safe alias, in UTF-16 units. A value of S004's choosing: the source does not state a limit. */
export const SAFE_ALIAS_MAX_LENGTH = 40;

export interface SafeAliasEntry extends SubjectRef {
  readonly alias: string;
}

/**
 * Query port for the safe alias that the host confirmed for a subject. Persistence and the confirmation flow are not
 * assigned to any story yet, so this port is the only interface the reading logic depends on.
 */
export interface SafeAliasPort {
  lookup(subject: SubjectRef): Promise<string | null>;
}

const CONTROL_CHARACTER = /\p{Cc}/u;

/** In-process implementation of the port. Entries are validated when they are added, and an invalid one throws. */
export function createInProcessSafeAliases(entries: readonly SafeAliasEntry[] = []): SafeAliasPort {
  const aliases = new Map<string, string>();
  for (const entry of entries) {
    if (!isValidAlias(entry.alias)) {
      throw new TypeError(`safe alias: must be 1 to ${SAFE_ALIAS_MAX_LENGTH} characters without control characters`);
    }
    aliases.set(subjectKey(entry), entry.alias);
  }
  return {
    lookup: (subject) => Promise.resolve(aliases.get(subjectKey(subject)) ?? null),
  };
}

function isValidAlias(alias: string): boolean {
  return alias.trim().length > 0 && alias.length <= SAFE_ALIAS_MAX_LENGTH && !CONTROL_CHARACTER.test(alias);
}

/**
 * How a viewer's name should be read aloud. The three outcomes are kept apart so that a caller can never mistake a
 * guess for a reading.
 */
export type NicknameReading =
  | { readonly source: "safe-alias"; readonly text: string }
  | { readonly source: "transliteration"; readonly text: string }
  | { readonly source: "unavailable"; readonly reason: "NICKNAME_UNAVAILABLE" | "NEEDS_MANUAL_CONFIRMATION" };

export interface ReadingDeps {
  readonly safeAliases: SafeAliasPort;
  readonly transliterator: Transliterator;
}

/**
 * Chooses the reading in this order (S004 choice): a host-confirmed safe alias, then a complete local
 * transliteration. An incomplete transliteration is not used. The caller shows nothing or asks for manual
 * confirmation instead. The nickname never leaves the server for this lookup.
 */
export async function resolveNicknameReading(
  subject: SubjectRef,
  nickname: string | null,
  deps: ReadingDeps,
): Promise<NicknameReading> {
  const alias = await deps.safeAliases.lookup(subject);
  if (alias !== null) return { source: "safe-alias", text: alias };
  if (nickname === null || nickname.trim() === "") {
    return { source: "unavailable", reason: "NICKNAME_UNAVAILABLE" };
  }
  const reading = deps.transliterator.transliterate("nickname", nickname);
  if (reading.complete && reading.mapped.text.length > 0) {
    return { source: "transliteration", text: reading.mapped.text };
  }
  return { source: "unavailable", reason: "NEEDS_MANUAL_CONFIRMATION" };
}
