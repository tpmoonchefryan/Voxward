import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { BlockedPage } from "../BlockedPage";
import { createBlockedApi } from "../api";
import { route } from "../route";

describe("Blocked Management Page (VW-Draft-03B)", () => {
  it("exports /channels/:channelId/blocked route", () => {
    expect(route.path).toBe("/channels/:channelId/blocked");
  });

  it("calls score-only rejudge and remove with restoreBaseScore=true cleanly", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    const api = createBlockedApi(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: typeof init?.body === "string" ? init.body : undefined });
      if (url === "/auth/session") {
        return new Response(JSON.stringify({ csrfToken: "csrf-1" }), { status: 200 });
      }
      if (method === "POST" && url.endsWith("/blocked/ev-1/rejudge")) {
        return new Response(
          JSON.stringify({ scoreOnly: true, downstreamReissued: false, status: "REJUDGED" }),
          { status: 200 },
        );
      }
      if (method === "DELETE") {
        return new Response(
          JSON.stringify({
            removed: null,
            youtubeUnbanned: true,
            restoreBaseScoreApplied: true,
            users: [],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ users: [] }), { status: 200 });
    });

    const rejudge = await api.rejudgeScoreOnly("ch_1", "ev-1", {
      classification: "ALLOW_MEANINGFUL",
      operationId: "op-1",
    });
    expect(rejudge.scoreOnly).toBe(true);
    expect(rejudge.downstreamReissued).toBe(false);

    const unblock = await api.removeBlockedUser("ch_1", "viewer_42", true);
    expect(unblock.youtubeUnbanned).toBe(true);
    expect(unblock.restoreBaseScoreApplied).toBe(true);
    expect(calls.some((c) => c.url.includes("/blocked-users/viewer_42?restoreBaseScore=true"))).toBe(true);
  });

  it("renders blocked records tab, score-only guidance, and blocklist user controls", () => {
    const stubApi = {
      listBlockedRecords: vi.fn(async () => []),
      rejudgeScoreOnly: vi.fn(async () => ({ scoreOnly: true, downstreamReissued: false })),
      listBlockedUsers: vi.fn(async () => []),
      addBlockedUser: vi.fn(async () => []),
      removeBlockedUser: vi.fn(async () => ({
        removed: null,
        youtubeUnbanned: false,
        restoreBaseScoreApplied: false,
        users: [],
      })),
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/channels/ch_1/blocked"]}>
        <Routes>
          <Route path="/channels/:channelId/blocked" element={<BlockedPage api={stubApi} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("拦截管理");
    expect(html).toContain("已确认拦截记录");
    expect(html).toContain("黑名单用户管理");
    expect(html).toContain("评分重判只校准观众信任分与规则统计");
  });
});
