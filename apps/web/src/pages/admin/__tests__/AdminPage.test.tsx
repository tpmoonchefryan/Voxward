import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminPage } from "../AdminPage";
import { routes } from "../route";

describe("Admin & Settings Page (VW-Draft-04)", () => {
  it("exports both /admin/:channelId? and /settings/:channelId? routes", () => {
    expect(routes.map((r) => r.path)).toEqual(["/admin/:channelId?", "/settings/:channelId?"]);
  });

  it("renders single-category SettingsLayout with 常规与外观, 规则与词库 sub-items, 计分与运行策略, and 数据保留策略", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/settings/ch_demo_1"]}>
        <Routes>
          <Route path="/settings/:channelId?" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("系统设置");
    expect(html).toContain("常规与外观");
    expect(html).toContain("规则与词库");
    expect(html).toContain("黑名单词条");
    expect(html).toContain("白名单词条");
    expect(html).toContain("计分与运行策略");
    expect(html).toContain("数据保留策略");
    expect(html).not.toContain("当前频道");
  });
});
