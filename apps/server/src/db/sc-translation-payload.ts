export interface ScDisplayTranslation {
  readonly language: string;
  readonly translatedText: string;
  readonly slangNote?: string | null;
  readonly replyCue?: string | null;
  readonly thankYouReading?: string | null;
}

export interface ParsedScTranslationEvidence {
  readonly primaryTranslation: string | null;
  readonly sourceLanguage: string | null;
  readonly translations: readonly ScDisplayTranslation[];
  readonly notes: string | null;
  readonly acknowledgement: string | null;
  readonly safeAlias: string | null;
}

/**
 * Parses `TRANSLATION` evidence safely across all supported formats:
 * - compact v2 JSON (`{ version: 2, sourceLanguage, translations: [...] }`)
 * - legacy JSON (`{ translation, notes, acknowledgement, safeAlias }`)
 * - legacy plain-text string
 */
export function parseScTranslationEvidence(raw: string | null): ParsedScTranslationEvidence {
  if (raw === null) {
    return {
      primaryTranslation: null,
      sourceLanguage: null,
      translations: [],
      notes: null,
      acknowledgement: null,
      safeAlias: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed !== null && typeof parsed === "object" && parsed.version === 2 && Array.isArray(parsed.translations)) {
      const translations: ScDisplayTranslation[] = [];
      for (const entry of parsed.translations) {
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
        const rec = entry as Record<string, unknown>;
        if (typeof rec.language !== "string" || typeof rec.translatedText !== "string") continue;
        translations.push({
          language: rec.language,
          translatedText: rec.translatedText,
          ...(typeof rec.slangNote === "string" ? { slangNote: rec.slangNote } : {}),
          ...(typeof rec.replyCue === "string" ? { replyCue: rec.replyCue } : {}),
          ...(typeof rec.thankYouReading === "string" ? { thankYouReading: rec.thankYouReading } : {}),
        });
      }
      const primary = translations[0];
      return {
        primaryTranslation: primary?.translatedText ?? null,
        sourceLanguage: typeof parsed.sourceLanguage === "string" ? parsed.sourceLanguage : null,
        translations,
        notes: primary?.slangNote ?? null,
        acknowledgement: primary?.replyCue ?? null,
        safeAlias: null,
      };
    }
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      (typeof parsed.translation === "string" ||
        typeof parsed.notes === "string" ||
        typeof parsed.acknowledgement === "string" ||
        typeof parsed.safeAlias === "string")
    ) {
      return {
        primaryTranslation: typeof parsed.translation === "string" ? parsed.translation : null,
        sourceLanguage: null,
        translations: [],
        notes: typeof parsed.notes === "string" ? parsed.notes : null,
        acknowledgement: typeof parsed.acknowledgement === "string" ? parsed.acknowledgement : null,
        safeAlias: typeof parsed.safeAlias === "string" ? parsed.safeAlias : null,
      };
    }
    return {
      primaryTranslation: raw,
      sourceLanguage: null,
      translations: [],
      notes: null,
      acknowledgement: null,
      safeAlias: null,
    };
  } catch {
    return {
      primaryTranslation: raw,
      sourceLanguage: null,
      translations: [],
      notes: null,
      acknowledgement: null,
      safeAlias: null,
    };
  }
}
