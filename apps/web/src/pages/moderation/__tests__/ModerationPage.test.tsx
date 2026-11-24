import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ModerationPage, ModerationWorkbench } from "../ModerationPage";
import type { ModerationApi } from "../api";
import { route } from "../route";

describe("Moderation Console (VW-Draft-03)", () => {
  it("mounts inside VoxWardShell with read-only SC translation badge and no interactive SC toggle", () => {
    expect(route.path).toBe("/moderation/:channelId");

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/moderation/ch_1"]}>
        <Routes>
          <Route path="/moderation/:channelId" element={<ModerationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("tcrn-product-shell");
    expect(html).toContain("Live Moderation");
    expect(html).toContain("SC Translation");
  });

  it("renders equal-height 2-col workbench, parenthesized action labels, and AI candidate tab in English by default", () => {
    const mockApi: ModerationApi = {
      getModeration: async () => ({
        channel: { channelId: "ch_1", displayName: "Demo", platform: "youtube" },
        capabilities: ["queue.read", "review.decide", "message.original"],
        scTranslationEnabled: false,
        modelIssues: [],
        faults: { platformFault: null, modelFault: null },
        feed: { approvedSc: [], reviewQueue: [], blockedItems: [], liveStream: [] },
      }),
      decideTask: async () => ({ conflict: false, status: "DECIDED" }),
      reviewEvent: async () => ({ conflict: false, status: "DECIDED" }),
      resendDelivery: async () => ({ conflict: false, status: "RESENT" }),
      editSubjectList: async () => ({ status: "OK" }),
      editTerm: async () => ({ status: "OK" }),
      listCandidates: async () => [],
      confirmCandidate: async () => {
        throw new Error("NONE");
      },
      rejectCandidate: async () => {
        throw new Error("NONE");
      },
      listTermCategories: async () => [],
      appendBlacklistTerm: async () => {},
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ModerationWorkbench channelId="ch_1" api={mockApi} pollIntervalMs={60_000} />
      </MemoryRouter>,
    );

    expect(html).toContain("Live Queue");
    expect(html).toContain("AI Term Candidates");
    expect(html).toContain("Review Queue (0)");
    expect(html).toContain("Live Bypass Feed &amp; Pinned SC");
    expect(html).toContain("vw-yt-stream-panel");
    expect(html).not.toContain("拦截时同步删除平台消息");
    expect(html).not.toContain("切换 SC 精翻");
  });

  it("renders unified bottom-up moderation stream with inline SC card and no close button", () => {
    const baseMs = Date.now();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ModerationWorkbench
          channelId="ch_1"
          pollIntervalMs={60_000}
          initialSnapshot={{
            channel: { channelId: "ch_1", displayName: "Demo", platform: "youtube" },
            capabilities: ["queue.read", "review.decide", "message.original"],
            scTranslationEnabled: true,
            modelIssues: [],
            faults: { platformFault: null, modelFault: null },
            feed: {
              approvedSc: [
                {
                  eventId: "ev-sc-mid",
                  correlationId: "corr-sc",
                  subjectRef: "Hana_Music",
                  originalText: "SC mid stream message",
                  translation: "中间插播的醒目留言",
                  notes: "$50",
                  acknowledgement: "$50",
                  safeAlias: "Hana_Music",
                  decidedAt: new Date(baseMs - 2_000).toISOString(),
                  deliveryId: "del-sc",
                  deliveryStatus: "DELIVERED",
                },
              ],
              reviewQueue: [],
              blockedItems: [],
              liveStream: [
                {
                  eventId: "ev-chat-late",
                  correlationId: "corr-late",
                  subjectRef: "LateModChat",
                  localStatus: "ALLOW",
                  classification: "ALLOW_MEANINGFUL",
                  platformDeleteStatus: "NOT_APPLICABLE",
                  bodyFolded: false,
                  originalText: "Latest chat at bottom",
                  decidedAt: new Date(baseMs - 500).toISOString(),
                  deliveryId: "del-late",
                  deliveryStatus: "DELIVERED",
                },
                {
                  eventId: "ev-chat-early",
                  correlationId: "corr-early",
                  subjectRef: "EarlyModChat",
                  localStatus: "ALLOW",
                  classification: "ALLOW_MEANINGFUL",
                  platformDeleteStatus: "NOT_APPLICABLE",
                  bodyFolded: false,
                  originalText: "Oldest chat at top",
                  decidedAt: new Date(baseMs - 5_000).toISOString(),
                  deliveryId: "del-early",
                  deliveryStatus: "DELIVERED",
                },
              ],
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("vw-stream-viewport");
    expect(html).toContain("vw-stream-track");
    expect(html).toContain("vw-stream-item");
    expect(html).toContain("vw-sc-tier--t6");
    expect(html.indexOf("Oldest chat at top")).toBeLessThan(html.indexOf("SC mid stream message"));
    expect(html.indexOf("SC mid stream message")).toBeLessThan(html.indexOf("Latest chat at bottom"));
    expect(html).not.toContain("收起置顶卡片");
  });
});
