export interface ScLanguagePolicy {
  readonly sourceLanguage: string;
  readonly targetLanguages: readonly string[];
}

export const SC_MAX_TARGET_LANGUAGES = 5;

export function canonicalLanguageTag(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 63) return null;
  try {
    return Intl.getCanonicalLocales(value)[0] ?? null;
  } catch {
    return null;
  }
}

export function parseScLanguagePolicy(value: unknown): ScLanguagePolicy | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (Object.keys(value).some((key) => key !== "sourceLanguage" && key !== "targetLanguages")) return null;
  const policy = value as Record<string, unknown>;
  const sourceLanguage = policy.sourceLanguage === "auto" ? "auto" : canonicalLanguageTag(policy.sourceLanguage);
  if (sourceLanguage === null || sourceLanguage === "und" || !Array.isArray(policy.targetLanguages)) return null;
  if (policy.targetLanguages.length < 1 || policy.targetLanguages.length > SC_MAX_TARGET_LANGUAGES) return null;
  const targetLanguages: string[] = [];
  for (const value of policy.targetLanguages) {
    const tag = canonicalLanguageTag(value);
    if (tag === null || tag === "auto" || tag === "und" || targetLanguages.includes(tag)) return null;
    targetLanguages.push(tag);
  }
  return { sourceLanguage, targetLanguages };
}
