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

  it("renders single-column YouTube Live stream with sticky SC overlay bar, 7-tier classes, untrusted isolation, and zero moderation or close buttons", () => {
    const nowIso = new Date().toISOString();
    const html = renderToStaticMarkup(
      <PureDockSurface
        channelId="ch_demo_1"
        initialSnapshot={{
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
                decidedAt: nowIso,
                deliveryId: "del-1",
                deliveryStatus: "DELIVERED",
              },
            ],
            reviewQueue: [],
            blockedItems: [],
            liveStream: [],
          },
        }}
      />,
    );
    expect(html).toContain("vw-dock-shell");
    expect(html).toContain("vw-yt-stream-panel");
    expect(html).toContain("纯净弹幕姬");
    expect(html).toContain("纯净弹幕流");
    expect(html).toContain("data-sc-overlay-bar");
    expect(html).toContain('data-sc-ticker-id="ev-sc-1"');
    expect(html).toContain("vw-sc-tier--t5");
    expect(html).toContain("<bdi>&lt;b&gt;Nice stream&lt;/b&gt;</bdi>");
    expect(html).not.toContain("vw-dock-grid");
    expect(html).not.toContain("SC 精翻");
    expect(html).not.toContain("确认拦截");
    expect(html).not.toContain("退款");
    expect(html).not.toContain("tcrn-product-shell");
  });

  it("keeps DockPage mountable at /dock/:roomId without shell chrome", () => {
    const stubApi: DockApi = {
      getDock: async () => ({
        channel: { channelId: "ch_demo_1", displayName: "Demo", platform: "youtube" },
        capabilities: ["queue.read"],
        scTranslationEnabled: true,
        modelIssues: [],
        faults: { platformFault: null, modelFault: null },
        feed: {
          approvedSc: [],
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
    expect(html).toContain("纯净弹幕姬");
    expect(html).toContain("vw-yt-stream-panel");
    expect(html).not.toContain("data-sc-overlay-bar");
    expect(html).not.toContain("tcrn-product-shell");
  });
});
