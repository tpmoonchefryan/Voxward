import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { VOXWARD_SUPPORTED_LOCALES } from "../../i18n";
import { buildVoxWardNavModel, VOXWARD_LOCALES, VoxWardShell } from "../index";
import type { ShellPreferencesClient } from "../shell-preferences-api";

describe("VoxWardShell & navigation model", () => {
  it("supports all 5 locales and keeps left/right pin groups capability-gated across locales", () => {
    expect(VOXWARD_LOCALES.map((item) => item.locale)).toEqual(VOXWARD_SUPPORTED_LOCALES);

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

    const jaModel = buildVoxWardNavModel({ locale: "ja", activeId: "overview", channelId: "ch_1" });
    expect(jaModel.currentLabel).toBe("概要");
    const koModel = buildVoxWardNavModel({ locale: "ko", activeId: "overview", channelId: "ch_1" });
    expect(koModel.currentLabel).toBe("개요");
    const frModel = buildVoxWardNavModel({ locale: "fr", activeId: "overview", channelId: "ch_1" });
    expect(frModel.currentLabel).toBe("Vue d'ensemble");
  });

  it("defaults ProductShell to halloween + English with 5-language & theme preferences dropdown", () => {
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
          pageTitle="Workspace Overview"
          pageDescription="Live status"
          client={stubClient}
        >
          <div>Shell body</div>
        </VoxWardShell>
      </MemoryRouter>,
    );

    expect(html).toContain("tcrn-product-shell");
    expect(html).toContain('data-product-shell-semantic-api="menu-pins-theme-locale"');
    expect(html).toContain('data-tcrn-theme="halloween"');
    expect(html).toContain('data-current-locale="en"');
    expect(html).toContain("data-shell-avatar");
    expect(html).toContain("theme and language");
    expect(html).toContain("Sign in");
    expect(html).toContain("Pure Danmaku Dock");
    expect(html).toContain("Workspace Overview");
    expect(html).toContain("Shell body");
    expect(html).not.toContain("tcrn-shell-theme-toggle");
  });
});
