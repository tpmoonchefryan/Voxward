import type { MappedText, MatchField } from "./normalize.js";

/** A matched region of one field's original text. Offsets are UTF-16 code units. */
export interface FieldSpan {
  readonly field: MatchField;
  readonly start: number;
  readonly end: number;
}

/**
 * Maps a match `start`..`end` of a matching copy back to the original text. The result has one span per
 * field the match touches, so a match that crosses from the nickname into the body is reported as two spans.
 */
export function spansFor(mapped: MappedText, start: number, end: number): FieldSpan[] {
  const spans: FieldSpan[] = [];
  for (const unit of mapped.units) {
    const overlaps = unit.start < end && unit.end > start;
    if (!overlaps) continue;
    const last = spans.at(-1);
    if (last !== undefined && last.field === unit.field) {
      spans[spans.length - 1] = { field: last.field, start: last.start, end: unit.srcEnd };
    } else {
      spans.push({ field: unit.field, start: unit.srcStart, end: unit.srcEnd });
    }
  }
  return spans;
}
