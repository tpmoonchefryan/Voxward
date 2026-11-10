import { describe, expect, it } from "vitest";
import { admitRegex, findRegexMatches } from "../../../src/modules/moderation-engine/rules/bounded-regex.js";

describe("bounded regex admission", () => {
  it.each([
    "s[a4]{1,8}b[i1]",
    "\\p{Lu}+x",
    "ab|cd",
    "ab|cd|ef",
    "a{2}b{1,8}",
    "x\\d+y",
    "(?:ab)c",
    "a{2}b*",
    "a{1,8}b{0,8}",
    "[a|b]c",
  ])("admits a bounded pattern: %s", (source) => {
    expect(admitRegex(source).ok).toBe(true);
  });

  it.each([
    ["(a+)+", "QUANTIFIED_GROUP"],
    ["(ab)*c", "QUANTIFIED_GROUP"],
    ["(a|b)*c", "QUANTIFIED_GROUP"],
    ["(a|b)", "GROUP_ALTERNATION"],
    ["(?:a|a|a)b", "GROUP_ALTERNATION"],
    ["(\\w|a)\\w*!", "GROUP_ALTERNATION"],
    ["(\\w)\\1", "BACKREFERENCE"],
    ["a(?=b)", "LOOKAROUND"],
    ["(?<!a)b", "LOOKAROUND"],
    ["(?<n>a)", "NAMED_GROUP"],
    ["a*a*b", "TOO_MANY_UNBOUNDED_QUANTIFIERS"],
    ["a?b?c?d?", "TOO_MANY_QUANTIFIERS"],
    ["a{0,8}a*", "UNBOUNDED_WITH_VARIABLE_REPEAT"],
    ["a*b?", "UNBOUNDED_WITH_VARIABLE_REPEAT"],
    ["a{0,8}a{0,8}a{0,8}b", "REPEAT_CHOICES_TOO_MANY"],
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
