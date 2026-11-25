import { canonicalizeContentLanguage } from "@voxward/contracts";

const HIRAGANA_OR_KATAKANA = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\uFF66-\uFF9F]/u;
const HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/u;
const HAN = /\p{Script=Han}/u;
const LATIN = /\p{Script=Latin}/u;

/**
 * Lightweight local script detector returning canonical language tags (`ja`, `ko`, `zh-Hans`, `en`, `"mixed"`, or `"und"`).
 */
export function detectMessageLanguage(text: string): string {
  const hasKana = HIRAGANA_OR_KATAKANA.test(text);
  const hasHangul = HANGUL.test(text);
  const hasHan = HAN.test(text);
  const hasLatin = LATIN.test(text);

  if (hasKana) {
    if (hasHangul || hasLatin) return "mixed";
    return "ja";
  }
  if (hasHangul) {
    if (hasHan || hasLatin) return "mixed";
    return "ko";
  }
  if (hasHan) {
    return hasLatin ? "mixed" : "zh-Hans";
  }
  if (hasLatin) return "en";
  return "und";
}

function primarySubtag(tag: string): string {
  const dash = tag.indexOf("-");
  return dash === -1 ? tag.toLowerCase() : tag.slice(0, dash).toLowerCase();
}

/**
 * Checks whether a rule scoped to `ruleLanguage` applies to a message whose detected/declared language is `messageLanguage`.
 */
export function matchLanguageScope(ruleLanguage: string | undefined, messageLanguage: string): boolean {
  if (ruleLanguage === undefined || ruleLanguage === "") return true;
  const ruleCanonical = canonicalizeContentLanguage(ruleLanguage);
  if (ruleCanonical === null || ruleCanonical === "und") return true;

  const msgCanonical = canonicalizeContentLanguage(messageLanguage) ?? "und";
  if (msgCanonical === "mixed" || msgCanonical === "und") return true;
  if (ruleCanonical === msgCanonical) return true;

  // Different Chinese scripts (zh-Hans vs zh-Hant) stay scoped unless the rule is untagged ("und").
  if (primarySubtag(ruleCanonical) === "zh" || primarySubtag(msgCanonical) === "zh") {
    return false;
  }
  return primarySubtag(ruleCanonical) === primarySubtag(msgCanonical);
}
