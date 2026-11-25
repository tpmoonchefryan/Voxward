/** UI locale options (distinct from open BCP 47 content language tags). */
export const UI_SUPPORTED_LANGUAGES = ["en", "zh-Hans", "ja", "ko", "fr"] as const;
export type UiSupportedLanguage = (typeof UI_SUPPORTED_LANGUAGES)[number];

/** Upper bound on configured SC target translation languages per channel. */
export const SC_MAX_TARGET_LANGUAGES = 5;

const MAX_BCP47_LENGTH = 35;

/**
 * Validates and canonicalizes a BCP 47 tag with `Intl.getCanonicalLocales`.
 * Returns null for empty, control-character, overlong, or malformed tags.
 */
export function canonicalBcp47Tag(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > MAX_BCP47_LENGTH || /[\p{Cc}\s]/u.test(trimmed)) {
    return null;
  }
  try {
    const [canonical] = Intl.getCanonicalLocales(trimmed);
    return typeof canonical === "string" && canonical.length > 0 ? canonical : null;
  } catch {
    return null;
  }
}

const ZH_HANS_ALIASES = new Set(["zh", "zh-CN", "zh-SG", "zh-Hans", "zh-Hans-CN", "zh-Hans-SG"]);
const ZH_HANT_ALIASES = new Set(["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-TW", "zh-Hant-HK", "zh-Hant-MO"]);

/**
 * Canonicalizes a content/rule language tag while preserving any valid BCP 47 tag
 * (never downgrading valid tags such as `pt-BR`, `es`, or `zh-Hant` to `"und"`).
 */
export function canonicalizeContentLanguage(value: string): string | null {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "und" || lower === "mixed") return lower;
  const canonical = canonicalBcp47Tag(trimmed);
  if (canonical === null) return null;
  if (ZH_HANS_ALIASES.has(canonical)) return "zh-Hans";
  if (ZH_HANT_ALIASES.has(canonical)) return "zh-Hant";
  return canonical;
}

export function parseTermLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return canonicalizeContentLanguage(value);
}

export interface ScLanguagePolicy {
  readonly sourceLanguages: readonly string[];
  readonly targetLanguages: readonly string[];
}

function readLanguageList(
  value: unknown,
  allowSpecial: boolean,
  maxItems: number,
): readonly string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const tag = canonicalizeContentLanguage(item);
    if (tag === null) return null;
    if (!allowSpecial && (tag === "und" || tag === "mixed")) return null;
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** Parses and canonicalizes an SC language policy consistently across read and write paths. */
export function parseScLanguagePolicy(value: unknown): ScLanguagePolicy | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const rec = value as Readonly<Record<string, unknown>>;
  if (Object.keys(rec).some((k) => k !== "sourceLanguages" && k !== "targetLanguages")) {
    return null;
  }
  const sourceLanguages = readLanguageList(rec.sourceLanguages, true, 16);
  const targetLanguages = readLanguageList(rec.targetLanguages, false, SC_MAX_TARGET_LANGUAGES);
  if (sourceLanguages === null || targetLanguages === null) return null;
  return { sourceLanguages, targetLanguages };
}
