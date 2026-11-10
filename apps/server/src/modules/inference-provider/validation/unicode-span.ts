import { codePointLength } from "@voxward/contracts";

/** A region of the input text, in Unicode code points. `end` is exclusive. */
export interface CodePointSpan {
  readonly start: number;
  readonly end: number;
}

/**
 * True when the span lies inside the text: 0 <= start < end <= length in code points. The model reports positions in
 * code points, so no index can split a surrogate pair.
 */
export function isSpanWithinText(span: CodePointSpan, text: string): boolean {
  return span.start >= 0 && span.start < span.end && span.end <= codePointLength(text);
}
