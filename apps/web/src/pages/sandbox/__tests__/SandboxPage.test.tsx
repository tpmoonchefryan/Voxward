import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SANDBOX_BANNER_TEXT, SandboxPage, SandboxView } from "../SandboxPage";
import type { SandboxSnapshot } from "../api";

const SNAPSHOT: SandboxSnapshot = {
  banner: SANDBOX_BANNER_TEXT,
  syntheticOnly: true,
  channelId: "ch_sandbox_1",
  subjects: [
    {
      subjectId: "sub_sb_1",
      subjectKey: "<img src=x onerror=alert(1)>",
      currentScore: 100,
      processingGeneration: 1,
      hasException: false,
    },
  ],
  reviewQueue: [
    {
      taskId: "task_1",
      eventId: "ev_1",
      correlationId: "corr_1",
      subjectRef: "user_q",
      kind: "MODERATION_REVIEW",
      status: "OPEN",
      originalText: "Can this <script> pass?",
    },
  ],
  blockedItems: [
    {
      eventId: "ev_blk_1",
      correlationId: "corr_2",
      subjectRef: "spammer_1",
      classification: "BLOCK",
      originalText: "spam link here",
    },
  ],
  approvedStage: [
    {
      eventId: "ev_ok_1",
      correlationId: "corr_3",
      subjectKey: "Supporter",
      text: "Thanks for the awesome stream!",
      translation: "直播真棒！",
      decidedAt: "2026-11-24T00:00:00.000Z",
    },
  ],
  changeLogs: [],
  technicalLogs: [],
  dataRequests: [],
  cacheEntryCount: 1,
};

describe("SandboxView & SandboxPage (VW-Draft-07)", () => {
  it("renders synthetic EnvironmentBanner, role switchers, 6 scenarios, stream simulator controls, and reuses formal workbenches", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SandboxView
          role="DEMO_STREAMER"
          capabilities={["sandbox.scenario", "review.decide", "stage.read"]}
          snapshot={SNAPSHOT}
          loading={false}
          error={null}
          onSelectRole={() => {}}
          onTriggerScenario={() => {}}
          onDecideReview={() => {}}
          onReset={() => {}}
        />
      </MemoryRouter>,
    );

    expect(html).toContain(SANDBOX_BANNER_TEXT);
    expect(html).toContain("实时弹幕流模拟器");
    expect(html).toContain("弹幕频率");
    expect(html).toContain("SC 进场间隔");
    expect(html).toContain("+ 立即进一条 SC");
    expect(html).toContain("OBS 投屏实时预览");
    expect(html).toContain("正式审核工作台视图");
    expect(html).toContain("Can this &lt;script&gt; pass?");
  });

  it("disables privacy delete scenario buttons when role lacks privacy.delete", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SandboxView
          role="DEMO_MODERATOR"
          capabilities={["sandbox.scenario", "review.decide", "stage.read"]}
          snapshot={SNAPSHOT}
          loading={false}
          error={null}
          onSelectRole={() => {}}
          onTriggerScenario={() => {}}
          onDecideReview={() => {}}
          onReset={() => {}}
        />
      </MemoryRouter>,
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?5\. 登记仅删数据请求/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?6\. 删除并加入记分例外/);
  });

  it("refuses backend views for DEMO_STAGE_VIEWER and renders embedded pure dock", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SandboxView
          role="DEMO_STAGE_VIEWER"
          capabilities={["stage.read"]}
          snapshot={SNAPSHOT}
          loading={false}
          error={null}
          onSelectRole={() => {}}
          onTriggerScenario={() => {}}
          onDecideReview={() => {}}
          onReset={() => {}}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("后台功能已按当前角色策略拒止");
    expect(html).toContain("纯净弹幕姬");
    expect(html).not.toContain("实时待审队列");
  });

  it("wraps SandboxPage in VoxWardShell with EnvironmentBanner in topBanner", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SandboxPage />
      </MemoryRouter>,
    );

    expect(html).toContain("tcrn-product-shell");
    expect(html).toContain(SANDBOX_BANNER_TEXT);
  });
});
