import { describe, expect, it } from "vitest";
import { admitRegex, findRegexMatches } from "../../../src/modules/moderation-engine/rules/bounded-regex.js";

describe("bounded regex admission", () => {
  it.each(["s[a4]{1,8}b[i1]", "\\p{Lu}+x", "ab|cd", "a{2}b{1,8}", "x\\d+y"])("admits a bounded pattern: %s", (source) => {
    expect(admitRegex(source).ok).toBe(true);
  });

  it.each([
    ["(a+)+", "QUANTIFIED_GROUP"],
    ["(ab)*c", "QUANTIFIED_GROUP"],
    ["(\\w)\\1", "BACKREFERENCE"],
    ["a(?=b)", "LOOKAROUND"],
    ["(?<!a)b", "LOOKAROUND"],
    ["(?<n>a)", "NAMED_GROUP"],
    ["a*a*b", "TOO_MANY_UNBOUNDED_QUANTIFIERS"],
    ["a?b?c?d?", "TOO_MANY_QUANTIFIERS"],
    ["a{1,9}", "REPEAT_TOO_LARGE"],
    ["a{9,}", "REPEAT_TOO_LARGE"],
    ["a?", "MATCHES_EMPTY"],
    ["x".repeat(101), "SOURCE_TOO_LONG"],
    ["[a", "SYNTAX"],
    ["a{", "SYNTAX"],
    ["(?i:a)", "SYNTAX"],
    ["a)", "SYNTAX"],
  ])("rejects %s with its reason", (source, rejection) => {
    expect(admitRegex(source)).toEqual({ ok: false, rejection });
  });
});

describe("bounded regex matching", () => {
  it("returns non-overlapping occurrences as offsets", () => {
    const admission = admitRegex("aa");
    if (!admission.ok) throw new Error("pattern should be admitted");
    expect(findRegexMatches(admission.regex, "aaaaa")).toEqual([
      [0, 2],
      [2, 4],
    ]);
  });

  it("skips zero-length matches and still terminates", () => {
    const admission = admitRegex("\\b");
    if (!admission.ok) throw new Error("pattern should be admitted");
    expect(findRegexMatches(admission.regex, "ab cd")).toEqual([]);
  });
});
