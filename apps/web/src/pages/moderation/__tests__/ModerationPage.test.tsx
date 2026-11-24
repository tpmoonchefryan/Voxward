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
    expect(html).toContain("实时审核");
    expect(html).toContain("SC 精翻");
  });

  it("renders equal-height 2-col workbench, half-width parentheses action labels, and AI candidate tab", () => {
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

    expect(html).toContain("实时审核工作台");
    expect(html).toContain("AI 候选词待确认");
    expect(html).toContain("实时待审队列");
    expect(html).toContain("实时审核旁路流与 SC 置顶条");
    expect(html).not.toContain("切换 SC 精翻");
  });
});
