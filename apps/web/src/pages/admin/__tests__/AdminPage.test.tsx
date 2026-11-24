import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminPage, buildTermCsvTemplate } from "../AdminPage";
import { routes } from "../route";

describe("Admin & Settings Page (VW-Draft-04)", () => {
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
});
