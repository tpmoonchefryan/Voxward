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

  it("renders single-column YouTube Live stream in chronological bottom-up order with sticky SC overlay bar, inline SC item, untrusted isolation, and zero moderation or close buttons", () => {
    const baseMs = Date.now();
    const earlyIso = new Date(baseMs - 5_000).toISOString();
    const scIso = new Date(baseMs - 2_000).toISOString();
    const lateIso = new Date(baseMs - 500).toISOString();
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
                decidedAt: scIso,
                deliveryId: "del-1",
                deliveryStatus: "DELIVERED",
              },
            ],
            reviewQueue: [],
            blockedItems: [],
            liveStream: [
              {
                eventId: "ev-chat-late",
                correlationId: "corr-late",
                subjectRef: "LateUser",
                localStatus: "ALLOW",
                classification: "ALLOW_MEANINGFUL",
                platformDeleteStatus: "NOT_APPLICABLE",
                bodyFolded: false,
                originalText: "Newest bottom chat",
                decidedAt: lateIso,
                deliveryId: "del-late",
                deliveryStatus: "DELIVERED",
              },
              {
                eventId: "ev-chat-early",
                correlationId: "corr-early",
                subjectRef: "EarlyUser",
                localStatus: "ALLOW",
                classification: "ALLOW_MEANINGFUL",
                platformDeleteStatus: "NOT_APPLICABLE",
                bodyFolded: false,
                originalText: "Oldest top chat",
                decidedAt: earlyIso,
                deliveryId: "del-early",
                deliveryStatus: "DELIVERED",
              },
              {
                eventId: "ev-chat-blocked",
                correlationId: "corr-blocked",
                subjectRef: "BlockedSpammer",
                localStatus: "BLOCK",
                classification: "BLOCK",
                platformDeleteStatus: "PENDING",
                bodyFolded: true,
                originalText: "Hidden spam message",
                decidedAt: lateIso,
                deliveryId: null,
                deliveryStatus: null,
              },
            ],
          },
        }}
      />,
    );
    expect(html).toContain("vw-dock-shell");
    expect(html).toContain("vw-yt-stream-panel");
    expect(html).toContain("vw-stream-viewport");
    expect(html).toContain("vw-stream-track");
    expect(html).toContain("vw-stream-item");
    expect(html).toContain("Pure Danmaku Dock");
    expect(html).toContain("Live Chat Stream");
    expect(html).toContain("data-sc-overlay-bar");
    expect(html).toContain('data-sc-ticker-id="ev-sc-1"');
    expect(html).toContain("vw-sc-tier--t5");
    expect(html).toContain("<bdi>&lt;b&gt;Nice stream&lt;/b&gt;</bdi>");
    expect(html.indexOf("Oldest top chat")).toBeLessThan(html.indexOf("Nice stream"));
    expect(html.indexOf("Nice stream")).toBeLessThan(html.indexOf("Newest bottom chat"));
    expect(html).not.toContain("Hidden spam message");
    expect(html).not.toContain("Allow (Restore Score)");
    expect(html).not.toContain("Allow (No Score)");
    expect(html).not.toContain("Confirmed Block");
    expect(html).not.toContain("ALLOW_MEANINGFUL");
    expect(html).not.toContain("ALLOW_NOISE");
    expect(html).not.toContain("DELIVERED");
    expect(html).not.toContain("corr-early");
    expect(html).not.toContain("corr-late");
    expect(html).not.toContain("vw-dock-grid");
    expect(html).not.toContain("SC Translation");
    expect(html).not.toContain("Confirm Block");
    expect(html).not.toContain("tcrn-product-shell");
  });

  it("renders neutral unknown tier when an SC has unknown currency payment without fabricating $5", () => {
    const nowIso = new Date().toISOString();
    const html = renderToStaticMarkup(
      <PureDockSurface
        channelId="ch-1"
        initialSnapshot={{
          channel: { channelId: "ch-1", displayName: "Room", platform: "youtube" },
          capabilities: [],
          scTranslationEnabled: true,
          modelIssues: [],
          faults: { platformFault: null, modelFault: null },
          feed: {
            approvedSc: [
              {
                eventId: "ev-sc-unk",
                correlationId: "corr-sc-unk",
                subjectRef: "ViewerX",
                originalText: "Hello!",
                translation: "你好！",
                payment: { amountMicros: 50_000_000, currency: "XYZ", amountDisplay: "XYZ 50", tier: null },
                notes: null,
                acknowledgement: null,
                safeAlias: null,
                decidedAt: nowIso,
                deliveryId: null,
                deliveryStatus: null,
              },
            ],
            reviewQueue: [],
            blockedItems: [],
            liveStream: [],
          },
        }}
      />,
    );
    expect(html).toContain("vw-sc-card");
    expect(html).not.toContain("$5");
    expect(html).toContain("XYZ 50");
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
    expect(html).toContain("Pure Danmaku Dock");
    expect(html).toContain("vw-yt-stream-panel");
    expect(html).not.toContain("data-sc-overlay-bar");
    expect(html).not.toContain("tcrn-product-shell");
  });
});
