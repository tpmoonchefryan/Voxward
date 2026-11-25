import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminPage, buildTermCsvTemplate } from "../AdminPage";
import { csvCopy, decodeTermCsv } from "../csv";
import { routes } from "../route";
import { localizeTermCategory } from "../term-category-copy";
import { DEFAULT_TERM_LANGUAGE, TermLanguageSelect } from "../TermLanguageSelect";
import { moveScTarget, ScLanguageSelects } from "../ScLanguageSelects";

describe("Admin & Settings Page (VW-Draft-04)", () => {
  it("offers only supported term languages plus the unrestricted default", () => {
    const defaultHtml = renderToStaticMarkup(
      <TermLanguageSelect id="new-term-language" locale="fr" value={DEFAULT_TERM_LANGUAGE} onSelect={() => {}} />,
    );
    expect(defaultHtml).toContain('<option value="und" selected="">Toutes les langues</option>');
    expect(defaultHtml).toContain('<option value="fr">français</option>');
    expect([...defaultHtml.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]))
      .toEqual(["und", "en", "zh-CN", "ja", "ko", "fr"]);
    expect(defaultHtml).not.toContain("<input");
  });

  it("renders saved SC target order and hides targets already selected in other rows", () => {
    const html = renderToStaticMarkup(<ScLanguageSelects locale="en" source="auto" targets={["fr", "ja"]}
      onSource={() => {}} onTargets={() => {}} />);
    const [source, first, second] = [...html.matchAll(/<select\b[^>]*>([\s\S]*?)<\/select>/g)].map((match) => match[1]);
    expect(source).toContain('<option value="auto" selected="">');
    expect(first).toContain('<option value="fr" selected="">');
    expect(first).not.toContain('<option value="ja"');
    expect(second).toContain('<option value="ja" selected="">');
    expect(second).not.toContain('<option value="fr"');
    expect(moveScTarget(["fr", "ja"], 0, 1)).toEqual(["ja", "fr"]);
    expect(moveScTarget(["fr", "ja"], 0, -1)).toEqual(["fr", "ja"]);
    expect(html).toContain("Add target");
    expect(html).toContain("Remove");
  });

  it("localizes only built-in categories and preserves operator copy", () => {
    const category = { code: "spam", label: "迷惑情報", description: "原文", listKind: "BLACKLIST" as const, createdAt: "" };
    expect(localizeTermCategory({ ...category, builtIn: true }, "fr").description).toContain("publicités");
    expect(localizeTermCategory(category, "fr")).toBe(category);
  });

  it("exports both /admin/:channelId? and /settings/:channelId? routes", () => {
    expect(routes.map((r) => r.path)).toEqual(["/admin/:channelId?", "/settings/:channelId?"]);
  });

  it("renders SettingsLayout defaulting to Blacklist Terms with CSV template download and no General & Appearance section", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/settings/ch_demo_1"]}>
        <Routes>
          <Route path="/settings/:channelId?" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Settings");
    expect(html).not.toContain("General &amp; Appearance");
    expect(html).toContain("Rules &amp; Wordlists");
    expect(html).toContain("Blacklist Terms");
    expect(html).toContain("Whitelist Terms");
    expect(html).toContain("Download CSV Template");
    expect(html).toContain("data-download-csv-template");
    expect(html).toContain("Scoring &amp; Runtime");
    expect(html).toContain("Data Retention");
    expect(html).toMatch(/<select[^>]*id="wordlist-language"/);
  });

  it("builds valid CSV templates for both blacklist and whitelist term libraries", () => {
    const categories = [
      { code: "spam", label: "Spam", listKind: "BLACKLIST" as const, description: "", createdAt: "2026-11-18T00:00:00Z" },
      { code: "sensitive", label: "Sensitive", listKind: "BLACKLIST" as const, description: "", createdAt: "2026-11-18T00:00:00Z" },
      { code: "friendly", label: "Friendly", listKind: "WHITELIST" as const, description: "", createdAt: "2026-11-18T00:00:00Z" },
    ];

    const blk = buildTermCsvTemplate("BLACKLIST", categories);
    expect(blk.filename).toBe("voxward-blacklist-template.csv");
    expect(blk.content).toContain("term,category,matchKind");
    expect(blk.content).toContain(",spam,EXACT");
    expect(blk.content).toContain(",sensitive,REGEX");

    const wht = buildTermCsvTemplate("WHITELIST", categories);
    expect(wht.filename).toBe("voxward-whitelist-template.csv");
    expect(wht.content).toContain("term,category,matchKind");
    expect(wht.content).toContain(",friendly,EXACT");
    expect(wht.content).toContain(",friendly,CONTAINS");
  });

  it("decodes a BOM or selected legacy encoding without replacing invalid bytes silently", () => {
    const sjis = new Uint8Array([0x93, 0xfa, 0x96, 0x7b]).buffer;
    const korean = new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb]).buffer;
    expect(decodeTermCsv(new TextEncoder().encode("\uFEFF日本").buffer, "utf-8")).toBe("日本");
    expect(() => decodeTermCsv(sjis, "utf-8")).toThrow();
    expect(decodeTermCsv(sjis, "shift_jis")).toBe("日本");
    expect(decodeTermCsv(korean, "euc-kr")).toBe("한글");
    expect(csvCopy("fr").error("CSV_INVALID_QUOTING")).toBe("Guillemets invalides");
  });
});
