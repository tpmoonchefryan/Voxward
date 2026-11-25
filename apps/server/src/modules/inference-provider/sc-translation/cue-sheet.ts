import type { ScItemResult } from "@voxward/contracts";

/**
 * Safe address of a viewer for a cue sheet. The host-confirmed alias or a neutral placeholder comes from the local
 * flow. The reading comes from the same local flow, or is null when none can be given reliably (proposal line 190).
 * Neither is sent to a model.
 */
export interface SafeAddress {
  readonly display: string;
  readonly reading: string | null;
}

/** The viewer's own words, as received. The origin tag keeps them apart from generated text (proposal line 571). */
export interface OriginalText {
  readonly origin: "VIEWER_ORIGINAL";
  readonly text: string;
}

/** Text the model generated. The origin tag keeps it apart from the viewer's words. */
export interface GeneratedCue {
  readonly origin: "AI_GENERATED";
  readonly translatedText: string;
  readonly slangNote: string;
  readonly replyCue: string;
  /** Reading of the thank-you phrase, when the model gave one. */
  readonly thankYouReading: string | null;
}

export interface GeneratedTranslationCue {
  readonly language: string;
  readonly translatedText: string;
  readonly slangNote: string;
  readonly replyCue: string;
  readonly thankYouReading: string | null;
}

/** One cue sheet entry: original and generated text in separate blocks, with the local safe address. */
export interface CueSheetItem {
  readonly correlationId: string;
  readonly original: OriginalText;
  readonly generated: GeneratedCue;
  readonly sourceLanguage?: string;
  readonly translations?: readonly GeneratedTranslationCue[];
  readonly address: SafeAddress;
}

/** Longest address display, in Unicode code points (自定: the same order as the S004 safe alias limit). */
export const SAFE_ADDRESS_MAX_LENGTH = 40;

/** True when the text can be shown as an address or a reading: not blank, within the limit, no control characters. */
export function isShowableAddressText(text: string): boolean {
  return text.trim() !== "" && [...text].length <= SAFE_ADDRESS_MAX_LENGTH && !/\p{Cc}/u.test(text);
}

/** Builds one cue sheet entry. The caller has already checked the generated text and the address. */
export function buildCueSheetItem(
  correlationId: string,
  originalText: string,
  item: ScItemResult,
  address: SafeAddress,
): CueSheetItem {
  return {
    correlationId,
    original: { origin: "VIEWER_ORIGINAL", text: originalText },
    generated: {
      origin: "AI_GENERATED",
      translatedText: item.translatedText,
      slangNote: item.slangNote,
      replyCue: item.replyCue,
      thankYouReading: item.thankYouReading ?? null,
    },
    address,
  };
}

/** Builds a multilingual cue sheet entry whose primary `generated` block mirrors the first surviving translation. */
export function buildMultilingualCueSheetItem(
  correlationId: string,
  originalText: string,
  sourceLanguage: string,
  translations: readonly GeneratedTranslationCue[],
  address: SafeAddress,
): CueSheetItem {
  const primary = translations[0] ?? {
    language: "und",
    translatedText: "",
    slangNote: "",
    replyCue: "",
    thankYouReading: null,
  };
  return {
    correlationId,
    original: { origin: "VIEWER_ORIGINAL", text: originalText },
    generated: {
      origin: "AI_GENERATED",
      translatedText: primary.translatedText,
      slangNote: primary.slangNote,
      replyCue: primary.replyCue,
      thankYouReading: primary.thankYouReading,
    },
    sourceLanguage,
    translations,
    address,
  };
}

/**
 * Serializes SC translation evidence in compact v2 JSON (without duplicating `translations[0]` at top level)
 * when `translations` is present, or plain translated text for legacy single-language cues.
 */
export function serializeScTranslationEvidence(cue: CueSheetItem): string {
  if (cue.translations !== undefined && cue.translations.length > 0) {
    return JSON.stringify({
      version: 2,
      sourceLanguage: cue.sourceLanguage ?? "und",
      translations: cue.translations,
    });
  }
  return cue.generated.translatedText;
}
