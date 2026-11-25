import { canonicalLanguageTag, type LocalizedScTranslation } from "@voxward/contracts";

export interface ScTranslationPayload {
  readonly translation: string | null;
  readonly notes: string | null;
  readonly acknowledgement: string | null;
  readonly safeAlias: string | null;
  readonly sourceLanguage?: string;
  readonly translations?: readonly LocalizedScTranslation[];
  readonly thankYouReading?: string | null;
}

const EMPTY: ScTranslationPayload = { translation: null, notes: null, acknowledgement: null, safeAlias: null };

export function parseScTranslationPayload(raw: string | null): ScTranslationPayload {
  if (raw === null) return EMPTY;
  // Old evidence can be plain text, including text that is valid JSON.
  if (!raw.trimStart().startsWith("{")) return { ...EMPTY, translation: raw };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ...EMPTY, translation: raw };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return EMPTY;
  const stored = value as Record<string, unknown>;
  const generated = objectOf(stored.generated) ?? stored;
  const original = objectOf(stored.original);
  const address = objectOf(stored.address);
  const sourceLanguage = canonicalLanguageTag(original?.language ?? stored.sourceLanguage);
  const translations = Array.isArray(generated.translations)
    ? generated.translations.flatMap((entry): LocalizedScTranslation[] => {
        const item = objectOf(entry);
        const targetLanguage = canonicalLanguageTag(item?.targetLanguage);
        if (targetLanguage === null || targetLanguage === "und" || targetLanguage === "auto" || typeof item?.translatedText !== "string") return [];
        return [{
          targetLanguage,
          translatedText: item.translatedText,
          slangNote: textOf(item.slangNote) ?? "",
          replyCue: textOf(item.replyCue) ?? "",
          ...(typeof item.thankYouReading === "string" ? { thankYouReading: item.thankYouReading } : {}),
        }];
      })
    : undefined;
  const primary = translations?.[0];
  return {
    translation: primary?.translatedText ?? textOf(generated.translatedText ?? stored.translation),
    notes: primary?.slangNote ?? textOf(generated.slangNote ?? stored.notes),
    acknowledgement: primary?.replyCue ?? textOf(generated.replyCue ?? stored.acknowledgement),
    safeAlias: textOf(address?.display ?? stored.safeAlias),
    ...(sourceLanguage === null ? {} : { sourceLanguage }),
    ...(translations === undefined ? {} : { translations }),
    ...(primary?.thankYouReading === undefined && generated.thankYouReading === undefined ? {} : {
      thankYouReading: primary?.thankYouReading ?? textOf(generated.thankYouReading),
    }),
  };
}

function objectOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
