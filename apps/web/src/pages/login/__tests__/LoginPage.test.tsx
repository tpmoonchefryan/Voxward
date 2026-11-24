import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { LoginPage, sanitizeLoginNext } from "../LoginPage";
import { route } from "../route";
import type { ShellPreferencesClient } from "../../../shell/shell-preferences-api";

describe("Standalone LoginPage (/login)", () => {
  it("exports /login route and sanitizes next redirect parameter safely", () => {
    expect(route.path).toBe("/login");
    expect(sanitizeLoginNext(null)).toBe("/moderation/ch_demo_1");
    expect(sanitizeLoginNext("//evil.example")).toBe("/moderation/ch_demo_1");
    expect(sanitizeLoginNext("https://evil.example")).toBe("/moderation/ch_demo_1");
    expect(sanitizeLoginNext("/login?foo=1")).toBe("/moderation/ch_demo_1");
    expect(sanitizeLoginNext("/integrations/ch_demo_1")).toBe("/integrations/ch_demo_1");
  });

  it("renders focused single-card DS sign-in form with registered VoxWard lockup and clean copy", () => {
    const stubClient: ShellPreferencesClient = {
      getSession: async () => null,
      login: async () => {
        throw new Error("NOT_CALLED");
      },
      logout: async () => {},
      listChannels: async () => [],
      getShellPreferences: async () => null,
      saveShellPreferences: async (input) => input,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/login?next=/users/ch_demo_1"]}>
        <Routes>
          <Route path="/login" element={<LoginPage client={stubClient} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain('data-product-id="voxward"');
    expect(html).toContain("直播互动审核系统");
    expect(html).toContain("登录账号");
    expect(html).toContain("显示");
    expect(html).toContain("确认登录");
    expect(html).not.toContain("结界");
    expect(html).not.toContain("tcrn-product-shell");
  });
});
