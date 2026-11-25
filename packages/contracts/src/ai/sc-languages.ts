export const SUPPORTED_LANGUAGES = ["en", "zh-CN", "ja", "ko", "fr"] as const;
export const SC_MAX_TARGET_LANGUAGES = 5;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type TermLanguage = SupportedLanguage | "und";
export type ScSourceLanguage = SupportedLanguage | "auto";

export interface ScLanguagePolicy {
  readonly sourceLanguage: ScSourceLanguage;
  readonly targetLanguages: readonly SupportedLanguage[];
}

export function canonicalLanguageTag(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 63) return null;
  try {
    return Intl.getCanonicalLocales(value)[0] ?? null;
  } catch {
    return null;
  }
}

export function parseSupportedLanguage(value: unknown): SupportedLanguage | null {
  const tag = canonicalLanguageTag(value);
  return SUPPORTED_LANGUAGES.find((language) => language === tag) ?? null;
}

export function parseTermLanguage(value: unknown): TermLanguage | null {
  const tag = canonicalLanguageTag(value);
  return tag === "und" ? tag : parseSupportedLanguage(tag);
}

export function normalizeStoredLanguage(value: unknown): TermLanguage {
  const tag = canonicalLanguageTag(value);
  if (tag === null) return "und";
  const { language, script, region } = new Intl.Locale(tag);
  if (language === "zh") {
    if (script !== undefined) return script === "Hans" ? "zh-CN" : "und";
    return region === "TW" || region === "HK" || region === "MO" ? "und" : "zh-CN";
  }
  return parseSupportedLanguage(language) ?? "und";
}

export function parseScLanguagePolicy(value: unknown): ScLanguagePolicy | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (Object.keys(value).some((key) => key !== "sourceLanguage" && key !== "targetLanguages")) return null;
  const policy = value as Record<string, unknown>;
  const sourceLanguage = policy.sourceLanguage === "auto" ? "auto" : parseSupportedLanguage(policy.sourceLanguage);
  if (sourceLanguage === null || !Array.isArray(policy.targetLanguages)) return null;
  if (policy.targetLanguages.length < 1 || policy.targetLanguages.length > SC_MAX_TARGET_LANGUAGES) return null;
  const targetLanguages: SupportedLanguage[] = [];
  for (const value of policy.targetLanguages) {
    const tag = parseSupportedLanguage(value);
    if (tag === null || targetLanguages.includes(tag)) return null;
    targetLanguages.push(tag);
  }
  return { sourceLanguage, targetLanguages };
}
