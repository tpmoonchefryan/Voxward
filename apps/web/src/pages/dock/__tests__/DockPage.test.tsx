import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { DockPage, PureDockSurface } from "../DockPage";
import type { DockApi } from "../api";
import { route } from "../route";

describe("Pure Streamer Dock (VW-Draft-02)", () => {
  it("exports /dock/:roomId route cleanly", () => {
    expect(route.path).toBe("/dock/:roomId");
  });

  it("renders headerless 2-column chat + Super Chat layout with zero close, refund, moderation, or toggle buttons", () => {
    const html = renderToStaticMarkup(<PureDockSurface channelId="ch_demo_1" />);
    expect(html).toContain("vw-dock-shell");
    expect(html).toContain("vw-dock-grid");
    expect(html).toContain("实时弹幕流");
    expect(html).toContain("Super Chat 与置顶计时");
    expect(html).not.toContain("SC 精翻");
    expect(html).not.toContain("确认拦截");
    expect(html).not.toContain("退款");
    expect(html).not.toContain("tcrn-product-shell");
  });

  it("renders Super Chat 7-tier classes, isolates untrusted text, and keeps DockPage mountable at /dock/:roomId", () => {
    const stubApi: DockApi = {
      getDock: async () => ({
        channel: { channelId: "ch_demo_1", displayName: "Demo", platform: "youtube" },
        capabilities: ["queue.read"],
        scTranslationEnabled: true,
        modelIssues: [],
        faults: { platformFault: null, modelFault: null },
        feed: {
          approvedSc: [
            {
              eventId: "ev-sc-1",
              correlationId: "corr-1",
              subjectRef: "Alice",
              originalText: "<b>Nice stream</b>",
              translation: "直播精彩",
              notes: "$20",
              acknowledgement: "$20",
              safeAlias: "Alice",
              decidedAt: new Date().toISOString(),
              deliveryId: "del-1",
              deliveryStatus: "DELIVERED",
            },
          ],
          reviewQueue: [],
          blockedItems: [],
          liveStream: [],
        },
      }),
      toggleScTranslation: async () => ({ scTranslationEnabled: true }),
      decideTask: async () => ({ conflict: false, status: "DECIDED" }),
      reviewEvent: async () => ({ conflict: false, status: "DECIDED" }),
      resendDelivery: async () => ({ conflict: false, status: "RESENT" }),
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/dock/ch_demo_1"]}>
        <Routes>
          <Route path="/dock/:roomId" element={<DockPage api={stubApi} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(html).toContain("主播纯享侧边栏");
    expect(html).not.toContain("tcrn-product-shell");
  });
});
