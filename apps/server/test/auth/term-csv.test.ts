import { describe, expect, it } from "vitest";
import { parseTermCsv } from "../../src/auth/term-csv.js";

describe("parseTermCsv (RFC-4180)", () => {
  it("strips UTF-8 BOM, skips optional header, and supports quoted fields with delimiters and escaped quotes", () => {
    const csv = [
      "\uFEFFterm,category,matchKind,language,action",
      '"free ""nitro"", scam",spam,EXACT,en,BLOCK',
      '"multi\nline term",abuse,CONTAINS,pt-BR,REVIEW',
      "kusa,friendly,EXACT,ja,ALLOW",
    ].join("\r\n");

    const res = parseTermCsv(csv, { defaultCategoryCode: "spam" });
    expect(res.errors).toEqual([]);
    expect(res.rows).toEqual([
      {
        line: 2,
        term: 'free "nitro", scam',
        categoryCode: "spam",
        matchKind: "EXACT",
        language: "en",
        action: "BLOCK",
      },
      {
        line: 3,
        term: "multi\nline term",
        categoryCode: "abuse",
        matchKind: "CONTAINS",
        language: "pt-BR",
        action: "REVIEW",
      },
      {
        line: 5,
        term: "kusa",
        categoryCode: "friendly",
        matchKind: "EXACT",
        language: "ja",
        action: "ALLOW",
      },
    ]);
  });

  it("supports explicit semicolon and tab delimiters", () => {
    const semi = parseTermCsv('term;category;matchKind;language\n"a;b";spam;CONTAINS;zh-CN', {
      delimiter: ";",
      defaultCategoryCode: "spam",
    });
    expect(semi.errors).toEqual([]);
    expect(semi.rows[0]).toMatchObject({ term: "a;b", language: "zh-Hans" });

    const tsv = parseTermCsv("promo\t\tNORMALIZED\tko", {
      delimiter: "\t",
      defaultCategoryCode: "spam",
    });
    expect(tsv.errors).toEqual([]);
    expect(tsv.rows[0]).toMatchObject({
      term: "promo",
      categoryCode: "spam",
      matchKind: "NORMALIZED",
      language: "ko",
      action: "REVIEW",
    });
  });

  it("reports structured error codes for every validation failure", () => {
    const unterminated = parseTermCsv('term,category,matchKind\n"open quote,spam,EXACT', {
      defaultCategoryCode: "spam",
    });
    expect(unterminated.errors).toEqual([
      { line: 2, code: "UNTERMINATED_QUOTE", message: "Unterminated quoted CSV field" },
    ]);

    const csv = [
      ",spam,EXACT",
      "bad,spam,WILDCARD",
      "term,spam,EXACT,not_a_lang_1234567890_way_too_long_to_be_valid",
      "term,spam,EXACT,en,PURGE",
      "blank_norm,spam,NORMALIZED,en",
      "bad_rx,spam,REGEX,en",
      "ok_term,,CONTAINS,es",
    ].join("\n");

    const res = parseTermCsv(csv, {
      defaultCategoryCode: "spam",
      normalizedTermIsEmpty: (t) => t === "blank_norm",
      validateRegexPattern: (p) =>
        p === "bad_rx" ? { ok: false, code: "UNSAFE_REGEX", hint: "Nested quantifier" } : { ok: true },
    });

    expect(res.errors.map((e) => [e.line, e.code])).toEqual([
      [1, "EMPTY_TERM"],
      [2, "INVALID_MATCH_KIND"],
      [3, "INVALID_LANGUAGE"],
      [4, "INVALID_ACTION"],
      [5, "EMPTY_NORMALIZED"],
      [6, "INVALID_REGEX"],
    ]);
    expect(res.rows).toEqual([
      {
        line: 7,
        term: "ok_term",
        categoryCode: "spam",
        matchKind: "CONTAINS",
        language: "es",
        action: "REVIEW",
      },
    ]);
  });
});
