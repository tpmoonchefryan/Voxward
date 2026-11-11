/** The text a match belongs to. Spans are reported per field, so a match keeps its origin. */
export type MatchField = "nickname" | "body";

/**
 * One mapping unit. A span `start`..`end` of a matching copy comes from the original field text
 * `srcStart`..`srcEnd`. All offsets are UTF-16 code units.
 */
export interface MappedUnit {
  readonly start: number;
  readonly end: number;
  readonly srcStart: number;
  readonly srcEnd: number;
  readonly field: MatchField;
}

/** A matching copy of text, with the unit map that leads back to the original. */
export interface MappedText {
  readonly text: string;
  readonly units: readonly MappedUnit[];
}

export interface RawUnit {
  raw: string;
  srcStart: number;
  srcEnd: number;
}

// Marks and format characters belong to the character before them. Hangul medial and final jamo
// compose with the leading jamo under NFKC, so they stay in the same unit. So do the spacing and half-width
// sound marks of Japanese (U+309B, U+309C, U+FF9E, U+FF9F): NFKC turns each into the combining mark U+3099 or
// U+309A, which then composes with the kana before it (S006 B3).
const ATTACHES_TO_PREVIOUS = /^[\p{M}\p{Cf}\u1160-\u11FF\uD7B0-\uD7FF\u309B\u309C\uFF9E\uFF9F]$/u;
const MATCH_IGNORED = /[\p{M}\p{Cf}]/gu;
/**
 * Characters that never reach the matching copy and that no other character composes with: the format characters
 * and the default-ignorable marks, such as variation selectors and the combining grapheme joiner. NFC and NFKC
 * compose a mark with its base only when no character of combining class 0 stands between them, so one of these
 * between a kana and its sound mark keeps the two apart. They are removed before composition (S006 B3).
 */
const INVISIBLE = /\p{Cf}|(?=\p{M})\p{Default_Ignorable_Code_Point}/gu;
/** The spacing sound marks. NFKC turns each into a space plus the combining mark, so they are mapped before NFKC. */
const SPACING_SOUND_MARK = /[\u309B\u309C]/gu;
/**
 * The combining diacritical mark blocks (S006 B1). Only marks in these blocks are stripped. Japanese sound marks
 * (U+3099, U+309A) and other marks that a script needs stay, so NFKC can compose them with their base character.
 */
const COMBINING_DIACRITICAL = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/gu;

/**
 * Options for the matching copy. Normalized rule patterns and message text pass through the same options, so both
 * sides agree. `stripCombiningMarks` removes a diacritical mark that composes with its base letter: without it, NFKC
 * composes `a` with U+0301 into `á`, which then fails to match `a`. Regex rules match the composed copy instead,
 * which this option does not change (S006 design 4.8).
 */
export interface NormalizeOptions {
  readonly stripCombiningMarks: boolean;
}

/** Strips composed marks by default, because the bypass is an evasion path. A rule set can switch it off. */
export const DEFAULT_NORMALIZE_OPTIONS: NormalizeOptions = { stripCombiningMarks: true };

/** Options of the composed copy, which regex rules match. No diacritical mark is stripped from it. */
export const COMPOSED_NORMALIZE_OPTIONS: NormalizeOptions = { stripCombiningMarks: false };

/**
 * Splits text into units at code point boundaries. Marks, format characters and sound marks attach to the unit before
 * them, so a unit is what NFKC can compose on its own and it maps back to one stretch of the original text.
 */
export function splitUnits(raw: string): RawUnit[] {
  const units: RawUnit[] = [];
  let offset = 0;
  for (const char of raw) {
    const end = offset + char.length;
    const previous = units.at(-1);
    if (previous !== undefined && ATTACHES_TO_PREVIOUS.test(char)) {
      previous.raw += char;
      previous.srcEnd = end;
    } else {
      units.push({ raw: char, srcStart: offset, srcEnd: end });
    }
    offset = end;
  }
  return units;
}

/**
 * Normalizes one unit for matching, in this order: remove the invisible characters, turn the spacing sound marks into
 * combining marks, compose with NFKC, lower case, and drop the marks and format characters that are left. The
 * invisible characters go first because they would stop a mark from composing with its base. With
 * `stripCombiningMarks`, the unit is decomposed first, the diacritical marks are removed, and NFKC then recomposes what
 * remains. A voiced kana such as `が` decomposes to か plus U+3099, keeps U+3099, and composes back to `が`. The same
 * holds when the mark is U+FF9E, U+309B or has a format character in front of it (S006 B3).
 */
export function normalizeUnit(raw: string, options: NormalizeOptions = DEFAULT_NORMALIZE_OPTIONS): string {
  const visible = raw
    .replace(INVISIBLE, "")
    .replace(SPACING_SOUND_MARK, (mark) => (mark === "\u309B" ? "\u3099" : "\u309A"));
  const composed = options.stripCombiningMarks
    ? visible.normalize("NFKD").replace(COMBINING_DIACRITICAL, "").normalize("NFKC")
    : visible.normalize("NFKC");
  return composed.toLowerCase().replace(MATCH_IGNORED, "");
}

/** Normalizes a whole string. Used for rule patterns, so patterns and text pass through the same function. */
export function normalizeText(raw: string, options: NormalizeOptions = DEFAULT_NORMALIZE_OPTIONS): string {
  let text = "";
  for (const unit of splitUnits(raw)) {
    text += normalizeUnit(unit.raw, options);
  }
  return text;
}

/** Matching copy of one field. Each unit is normalized and mapped back to its original span. */
export function normalizeField(
  field: MatchField,
  raw: string,
  options: NormalizeOptions = DEFAULT_NORMALIZE_OPTIONS,
): MappedText {
  let text = "";
  const units: MappedUnit[] = [];
  for (const unit of splitUnits(raw)) {
    const normal = normalizeUnit(unit.raw, options);
    units.push({
      start: text.length,
      end: text.length + normal.length,
      srcStart: unit.srcStart,
      srcEnd: unit.srcEnd,
      field,
    });
    text += normal;
  }
  return { text, units };
}

/** Identity copy: each UTF-16 code unit maps to itself. Exact matches run on this copy. */
export function identityField(field: MatchField, raw: string): MappedText {
  const units: MappedUnit[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    units.push({ start: index, end: index + 1, srcStart: index, srcEnd: index + 1, field });
  }
  return { text: raw, units };
}

/** Joins two copies in order. Offsets of the second copy move past the end of the first. */
export function joinMapped(first: MappedText, second: MappedText): MappedText {
  const shift = first.text.length;
  const shifted = second.units.map((unit) => ({ ...unit, start: unit.start + shift, end: unit.end + shift }));
  return { text: first.text + second.text, units: [...first.units, ...shifted] };
}
