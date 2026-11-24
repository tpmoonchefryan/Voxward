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

  it("renders Halloween-themed login card defaulting to English with garlands, pumpkins, and 5-locale switcher", () => {
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

    expect(html).toContain('data-tcrn-theme="halloween"');
    expect(html).toContain('lang="en"');
    expect(html).toContain("data-login-locale-toggle");
    expect(html).toContain("English");
    expect(html).toContain("vw-login-garland-top");
    expect(html).toContain("vw-login-garland-bottom");
    expect(html).toContain("vw-login-pumpkin-left");
    expect(html).toContain("vw-login-pumpkin-right");
    expect(html).toContain('data-product-id="voxward"');
    expect(html).toContain("Account");
    expect(html).toContain("Show");
    expect(html).toContain("Sign in");
    expect(html).not.toContain("tcrn-product-shell");
  });
});
