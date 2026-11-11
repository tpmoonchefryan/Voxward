import {
  DEFAULT_NORMALIZE_OPTIONS,
  type MappedText,
  type MappedUnit,
  type MatchField,
  type NormalizeOptions,
  normalizeUnit,
  splitUnits,
} from "./normalize.js";

/** A reading of a text. `complete` is false when some characters have no reading, so the reading is unreliable. */
export interface Reading {
  readonly mapped: MappedText;
  readonly complete: boolean;
}

/**
 * Local reading port. An implementation must not call an external service: the reading of a nickname
 * may not widen the data sent outside the server. `normalization` is the option set the keys were checked with
 * and the text is read with. A rule set must use the same set (S006 design 4.8).
 */
export interface Transliterator {
  readonly normalization: NormalizeOptions;
  transliterate(field: MatchField, text: string): Reading;
}

const READING = /^[a-z0-9]+$/;
const IGNORABLE = /^[\p{Z}\p{P}\p{S}]+$/u;

/**
 * Table-driven transliterator, the minimal implementation of the port. The table maps a normalized
 * character to its reading. ASCII letters and digits read as themselves. Spaces, punctuation and symbols
 * read as nothing. A character with no table entry makes the reading incomplete. No language library is used.
 * Keys are checked, and text is read, with `normalization`.
 */
export function createTableTransliterator(
  table: ReadonlyMap<string, string>,
  normalization: NormalizeOptions = DEFAULT_NORMALIZE_OPTIONS,
): Transliterator {
  const options: NormalizeOptions = { stripCombiningMarks: normalization.stripCombiningMarks };
  for (const [key, reading] of table) {
    const validKey = key.length > 0 && normalizeUnit(key, options) === key;
    if (!validKey || !READING.test(reading)) {
      throw new TypeError("transliteration table: keys must be normalized and readings must be [a-z0-9]+");
    }
  }
  return {
    normalization: options,
    transliterate(field, text) {
      let reading = "";
      let complete = true;
      const units: MappedUnit[] = [];
      for (const unit of splitUnits(text)) {
        const spoken = readingOf(normalizeUnit(unit.raw, options), table);
        if (spoken === null) complete = false;
        const emitted = spoken ?? "";
        units.push({
          start: reading.length,
          end: reading.length + emitted.length,
          srcStart: unit.srcStart,
          srcEnd: unit.srcEnd,
          field,
        });
        reading += emitted;
      }
      return { mapped: { text: reading, units }, complete };
    },
  };
}

function readingOf(normal: string, table: ReadonlyMap<string, string>): string | null {
  if (normal.length === 0) return "";
  const tabled = table.get(normal);
  if (tabled !== undefined) return tabled;
  if (READING.test(normal)) return normal;
  if (IGNORABLE.test(normal)) return "";
  return null;
}
