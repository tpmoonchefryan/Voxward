import { describe, expect, it } from "vitest";
import { decodeCsvBuffer, previewTermCsv } from "../csv";

describe("web CSV encoding decode & delimiter preview", () => {
  it("decodes UTF-8 (stripping BOM), GB18030, Shift_JIS, and EUC-KR buffers", () => {
    const utf8Bom = new Uint8Array([0xef, 0xbb, 0xbf, 0x74, 0x65, 0x72, 0x6d]).buffer;
    expect(decodeCsvBuffer(utf8Bom, "utf-8")).toBe("term");

    // GB18030 for "测试" -> B2 E2 CA D4
    const gbBytes = new Uint8Array([0xb2, 0xe2, 0xca, 0xd4]).buffer;
    expect(decodeCsvBuffer(gbBytes, "gb18030")).toBe("测试");

    // Shift_JIS for "テスト" -> 83 65 83 58 83 67
    const sjisBytes = new Uint8Array([0x83, 0x65, 0x83, 0x58, 0x83, 0x67]).buffer;
    expect(decodeCsvBuffer(sjisBytes, "shift_jis")).toBe("テスト");

    // EUC-KR for "안녕" -> BE C8 B3 E7
    const euckrBytes = new Uint8Array([0xbe, 0xc8, 0xb3, 0xe7]).buffer;
    expect(decodeCsvBuffer(euckrBytes, "euc-kr")).toBe("안녕");
  });

  it("previews RFC-4180 records with quoted newlines across comma, semicolon, and tab delimiters", () => {
    const semi = [
      "term;category;matchKind;language",
      '"line1\nline2";spam;EXACT;en',
      "two;abuse;CONTAINS;ja",
      "three;spam;REGEX;ko",
    ].join("\n");

    const previewSemi = previewTermCsv(semi, ";", 2);
    expect(previewSemi).toEqual({
      hasHeader: true,
      rows: [
        ["line1\nline2", "spam", "EXACT", "en"],
        ["two", "abuse", "CONTAINS", "ja"],
      ],
      totalRows: 3,
      unterminatedQuote: false,
    });

    const tsv = "hello\tfriendly\tEXACT\tfr";
    expect(previewTermCsv(tsv, "\t", 5)).toEqual({
      hasHeader: false,
      rows: [["hello", "friendly", "EXACT", "fr"]],
      totalRows: 1,
      unterminatedQuote: false,
    });

    const broken = previewTermCsv('"unclosed,spam,EXACT', ",", 5);
    expect(broken.unterminatedQuote).toBe(true);
  });
});
