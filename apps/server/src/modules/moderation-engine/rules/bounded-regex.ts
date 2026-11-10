/** Admission limits for rule patterns. They bound matching cost; see the S004 design, section 5. */
export const REGEX_LIMITS = {
  maxSourceLength: 100,
  maxQuantifiers: 3,
  maxUnboundedQuantifiers: 1,
  maxBoundedRepeat: 8,
} as const;

export type RegexRejection =
  | "SOURCE_TOO_LONG"
  | "SYNTAX"
  | "BACKREFERENCE"
  | "NAMED_GROUP"
  | "LOOKAROUND"
  | "QUANTIFIED_GROUP"
  | "TOO_MANY_QUANTIFIERS"
  | "TOO_MANY_UNBOUNDED_QUANTIFIERS"
  | "REPEAT_TOO_LARGE"
  | "MATCHES_EMPTY";

export type RegexAdmission =
  | { readonly ok: true; readonly regex: RegExp }
  | { readonly ok: false; readonly rejection: RegexRejection };

interface ShapeCount {
  depth: number;
  quantifiers: number;
  unbounded: number;
}

/**
 * Accepts a pattern only when its shape keeps matching cost bounded.
 * The returned regex is global, for `findRegexMatches`.
 */
export function admitRegex(source: string): RegexAdmission {
  if (source.length > REGEX_LIMITS.maxSourceLength) return { ok: false, rejection: "SOURCE_TOO_LONG" };
  const shapeRejection = checkShape(source);
  if (shapeRejection !== null) return { ok: false, rejection: shapeRejection };
  try {
    if (new RegExp(source, "u").test("")) return { ok: false, rejection: "MATCHES_EMPTY" };
    return { ok: true, regex: new RegExp(source, "gu") };
  } catch {
    return { ok: false, rejection: "SYNTAX" };
  }
}

/** Non-overlapping matches as `[start, end)` offsets. Zero-length matches are skipped and never count as hits. */
export function findRegexMatches(regex: RegExp, text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  regex.lastIndex = 0;
  let found = regex.exec(text);
  while (found !== null) {
    const start = found.index;
    const end = start + found[0].length;
    if (end > start) {
      ranges.push([start, end]);
    } else {
      regex.lastIndex = start + 1;
    }
    found = regex.exec(text);
  }
  return ranges;
}

function checkShape(source: string): RegexRejection | null {
  const count: ShapeCount = { depth: 0, quantifiers: 0, unbounded: 0 };
  // Previous token: "group" after a closing parenthesis, "atom" after a character, class, escape or anchor,
  // "quantifier" after a quantifier.
  let previous: "none" | "atom" | "group" | "quantifier" = "none";
  let index = 0;
  while (index < source.length) {
    const char = source.charAt(index);

    if (char === "\\") {
      const next = source.charAt(index + 1);
      if (/[1-9k]/.test(next)) return "BACKREFERENCE";
      const propertyEnd = unicodeBraceEnd(source, index);
      if (propertyEnd === -2) return "SYNTAX";
      index = propertyEnd > 0 ? propertyEnd : index + 2;
      previous = "atom";
      continue;
    }

    if (char === "[") {
      const close = classClose(source, index);
      if (close < 0) return "SYNTAX";
      index = close + 1;
      previous = "atom";
      continue;
    }

    if (char === "(") {
      const groupRejection = openGroup(source, index);
      if (groupRejection !== null) return groupRejection;
      index += source.startsWith("(?:", index) ? 3 : 1;
      count.depth += 1;
      previous = "none";
      continue;
    }

    if (char === ")") {
      count.depth -= 1;
      if (count.depth < 0) return "SYNTAX";
      index += 1;
      previous = "group";
      continue;
    }

    if (char === "|") {
      index += 1;
      previous = "none";
      continue;
    }

    if (char === "?" && previous === "quantifier") {
      // A "?" right after a quantifier makes it lazy. It adds no repetition.
      index += 1;
      previous = "none";
      continue;
    }

    if (char === "*" || char === "+" || char === "?" || char === "{") {
      const quantifier = quantifierAt(source, index);
      if (quantifier === null) return "SYNTAX";
      if (previous === "group") return "QUANTIFIED_GROUP";
      if (quantifier.repeatTooLarge) return "REPEAT_TOO_LARGE";
      count.quantifiers += 1;
      if (quantifier.unbounded) count.unbounded += 1;
      if (count.quantifiers > REGEX_LIMITS.maxQuantifiers) return "TOO_MANY_QUANTIFIERS";
      if (count.unbounded > REGEX_LIMITS.maxUnboundedQuantifiers) return "TOO_MANY_UNBOUNDED_QUANTIFIERS";
      index += quantifier.width;
      previous = "quantifier";
      continue;
    }

    index += 1;
    previous = "atom";
  }
  return count.depth === 0 ? null : "SYNTAX";
}

function openGroup(source: string, index: number): RegexRejection | null {
  if (source.startsWith("(?=", index) || source.startsWith("(?!", index)) return "LOOKAROUND";
  if (source.startsWith("(?<=", index) || source.startsWith("(?<!", index)) return "LOOKAROUND";
  if (source.startsWith("(?<", index)) return "NAMED_GROUP";
  if (source.startsWith("(?", index) && !source.startsWith("(?:", index)) return "SYNTAX";
  return null;
}

interface QuantifierShape {
  width: number;
  unbounded: boolean;
  repeatTooLarge: boolean;
}

function quantifierAt(source: string, index: number): QuantifierShape | null {
  const char = source.charAt(index);
  if (char === "*" || char === "+") return { width: 1, unbounded: true, repeatTooLarge: false };
  if (char === "?") return { width: 1, unbounded: false, repeatTooLarge: false };
  const brace = /^\{(\d+)(,(\d*))?\}/.exec(source.slice(index));
  if (brace === null) return null;
  const min = Number(brace[1]);
  const open = brace[2] !== undefined;
  const max = brace[3] === undefined || brace[3] === "" ? null : Number(brace[3]);
  const unbounded = open && max === null;
  const largest = unbounded ? min : (max ?? min);
  return {
    width: brace[0].length,
    unbounded,
    repeatTooLarge: largest > REGEX_LIMITS.maxBoundedRepeat,
  };
}

/** Index of the closing `]` of a class starting at `start`, or -1 when the class is not closed. */
function classClose(source: string, start: number): number {
  let index = start + 1;
  if (source.charAt(index) === "^") index += 1;
  while (index < source.length) {
    const char = source.charAt(index);
    if (char === "\\") {
      index += 2;
    } else if (char === "]") {
      return index;
    } else {
      index += 1;
    }
  }
  return -1;
}

/**
 * For `\p{...}`, `\P{...}` and `\u{...}` escapes: index just past the closing brace. Returns 0 for other escapes,
 * and -2 when the brace is never closed.
 */
function unicodeBraceEnd(source: string, index: number): number {
  const kind = source.charAt(index + 1);
  const braced = (kind === "p" || kind === "P" || kind === "u") && source.charAt(index + 2) === "{";
  if (!braced) return 0;
  const close = source.indexOf("}", index + 3);
  return close < 0 ? -2 : close + 1;
}
