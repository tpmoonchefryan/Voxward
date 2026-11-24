import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { buildVoxWardNavModel, VoxWardShell } from "../index";
import type { ShellPreferencesClient } from "../shell-preferences-api";

describe("VoxWardShell & navigation model", () => {
  it("keeps left workspace and right backoffice pin groups aligned without capability gating leakage", () => {
    const restricted = buildVoxWardNavModel({
      locale: "zh-CN",
      activeId: "moderation",
      channelId: "ch_1",
      channel: {
        channelId: "ch_1",
        displayName: "Main Channel",
        platform: "youtube",
        role: "MODERATOR",
        logAccess: false,
        dataAdmin: false,
        capabilities: ["queue.read", "review.decide", "list.edit"],
      },
    });

    const leftItems = restricted.navGroups[0]?.items ?? [];
    const rightItems = restricted.rightNavGroups[0]?.items ?? [];

    expect(leftItems.find((i) => i.id === "moderation")?.disabled).toBe(false);
    expect(leftItems.find((i) => i.id === "dock")?.label).toBe("纯净弹幕姬");
    expect(leftItems.find((i) => i.id === "overlay")).toBeUndefined();
    expect(leftItems.find((i) => i.id === "data")?.disabled).toBe(true);
    expect(rightItems.find((i) => i.id === "logs")?.disabled).toBe(true);
    expect(rightItems.find((i) => i.id === "users")?.disabled).toBe(true);
  });

  it("renders ProductShell with 用户偏好 theme dropdown and links sign-in to standalone /login page", () => {
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
      <MemoryRouter initialEntries={["/"]}>
        <VoxWardShell
          activeNavId="overview"
          pageTitle="工作台总览"
          pageDescription="实时运行态"
          client={stubClient}
        >
          <div>Shell body</div>
        </VoxWardShell>
      </MemoryRouter>,
    );

    expect(html).toContain("tcrn-product-shell");
    expect(html).toContain('data-product-shell-semantic-api="menu-pins-theme-locale"');
    expect(html).toContain("data-shell-avatar");
    expect(html).toContain("主题与语言");
    expect(html).toContain("登录账号");
    expect(html).toContain("纯净弹幕姬");
    expect(html).toContain("工作台总览");
    expect(html).toContain("Shell body");
    expect(html).not.toContain("tcrn-shell-theme-toggle");
    expect(html).not.toContain("OBS 投屏");
    expect(html).not.toContain("登录 VoxWard 工作台");
  });
});
