import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminPage, buildTermCsvTemplate } from "../AdminPage";
import { routes } from "../route";

describe("Admin & Settings Page (VW-Draft-04)", () => {
  it("exports both /admin/:channelId? and /settings/:channelId? routes", () => {
    expect(routes.map((r) => r.path)).toEqual(["/admin/:channelId?", "/settings/:channelId?"]);
  });

  it("renders SettingsLayout defaulting to 黑名单词条 with CSV template download and no 常规与外观 section", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/settings/ch_demo_1"]}>
        <Routes>
          <Route path="/settings/:channelId?" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("系统设置");
    expect(html).not.toContain("常规与外观");
    expect(html).toContain("规则与词库");
    expect(html).toContain("黑名单词条");
    expect(html).toContain("白名单词条");
    expect(html).toContain("下载 CSV 模板");
    expect(html).toContain("data-download-csv-template");
    expect(html).toContain("计分与运行策略");
    expect(html).toContain("数据保留策略");
  });

  it("builds valid CSV templates for both blacklist and whitelist term libraries", () => {
    const categories = [
      { code: "spam", label: "垃圾刷屏", listKind: "BLACKLIST" as const, description: "", createdAt: "2026-11-18T00:00:00Z" },
      { code: "sensitive", label: "高敏禁词", listKind: "BLACKLIST" as const, description: "", createdAt: "2026-11-18T00:00:00Z" },
      { code: "friendly", label: "常用热梗", listKind: "WHITELIST" as const, description: "", createdAt: "2026-11-18T00:00:00Z" },
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
