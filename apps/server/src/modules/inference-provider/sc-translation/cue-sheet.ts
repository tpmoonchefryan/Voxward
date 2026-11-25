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
  readonly language?: string;
}

/** Text the model generated. The origin tag keeps it apart from the viewer's words. */
export interface GeneratedCue {
  readonly origin: "AI_GENERATED";
  readonly translatedText: string;
  readonly slangNote: string;
  readonly replyCue: string;
  /** Reading of the thank-you phrase, when the model gave one. */
  readonly thankYouReading: string | null;
  readonly translations?: ScItemResult["translations"];
}

export function encodeScTranslationEvidence(cue: CueSheetItem): string {
  return JSON.stringify({
    ...(cue.original.language === undefined ? {} : { sourceLanguage: cue.original.language }),
    generated: cue.generated,
    safeAlias: cue.address.display,
  });
}

/** One cue sheet entry: original and generated text in separate blocks, with the local safe address. */
export interface CueSheetItem {
  readonly correlationId: string;
  readonly original: OriginalText;
  readonly generated: GeneratedCue;
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
    original: {
      origin: "VIEWER_ORIGINAL",
      text: originalText,
      ...(item.sourceLanguage === undefined ? {} : { language: item.sourceLanguage }),
    },
    generated: {
      origin: "AI_GENERATED",
      translatedText: item.translatedText,
      slangNote: item.slangNote,
      replyCue: item.replyCue,
      thankYouReading: item.thankYouReading ?? null,
      ...(item.translations === undefined ? {} : { translations: item.translations }),
    },
    address,
  };
}
