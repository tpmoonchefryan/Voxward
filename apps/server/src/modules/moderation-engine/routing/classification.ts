import { normalizeText } from "../rules/normalize.js";

/**
 * Deterministic internal category of a message that already passed the basic check (S006 design 4.4).
 * It names only NOISE or UNCERTAIN. It produces no downstream verdict: an UNCERTAIN message goes to model or
 * human review, and only the verdict mapping decides what downstream receives.
 */
export type DeterministicClass = "NOISE" | "UNCERTAIN";

/** Three or more `w`, as in "www". The count is S006's choice; the proposal names the example only. */
const WWW_TOKEN = /^w{3,}$/u;
/** Only pictographs, emoji components (such as skin tones and joiners) and nothing else. */
const PICTOGRAPH_TOKEN = /^[\p{Extended_Pictographic}\p{Emoji_Component}]+$/u;
/** One code point repeated three or more times. */
const REPEATED_CHARACTER_TOKEN = /^(\S)\1{2,}$/u;

/**
 * The message is NOISE only when every whitespace-separated token is one of the three kinds above. A token that mixes
 * kinds, such as "www!!" or "ok", keeps the message UNCERTAIN, so the rule never sends meaningful text down the fast lane.
 * The text is normalized first, so full-width letters and zero-width characters do not hide a noise token.
 */
export function classifyDeterministicNoise(body: string): DeterministicClass {
  const text = normalizeText(body).trim();
  if (text === "") return "UNCERTAIN";
  return text.split(/\s+/u).every(isNoiseToken) ? "NOISE" : "UNCERTAIN";
}

function isNoiseToken(token: string): boolean {
  return WWW_TOKEN.test(token) || PICTOGRAPH_TOKEN.test(token) || REPEATED_CHARACTER_TOKEN.test(token);
}
