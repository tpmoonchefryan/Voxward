import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SandboxView } from "../SandboxPage";
import type { SandboxSnapshot } from "../api";
import { route } from "../route";

const SAMPLE_SNAPSHOT: SandboxSnapshot = {
  banner: "SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）",
  syntheticOnly: true,
  channelId: "sandbox-ch-01",
  subjects: [
    {
      subjectId: "sbx-sub-alice",
      subjectKey: "demo-viewer-alice",
      currentScore: 11,
      processingGeneration: 1,
      hasException: true,
    },
  ],
  reviewQueue: [
    {
      taskId: "sbx-task-1",
      eventId: "sbx-ev-1",
      correlationId: "sbx-corr-1",
      subjectRef: "demo-viewer-charlie",
      kind: "REALTIME_REVIEW",
      status: "PENDING",
      originalText: "<script>alert(1)</script>",
    },
  ],
  blockedItems: [
    {
      eventId: "sbx-ev-2",
      correlationId: "sbx-corr-2",
      subjectRef: "demo-viewer-bob",
      classification: "BLOCK",
      originalText: "spam-link-xyz",
    },
  ],
  approvedStage: [
    {
      eventId: "sbx-ev-3",
      correlationId: "sbx-corr-3",
      subjectKey: "demo-viewer-hana",
      text: "神回ありがとう！",
      translation: "Thanks for the awesome stream!",
      decidedAt: "2026-11-14T00:00:00.000Z",
    },
  ],
  changeLogs: [
    {
      id: "sbx-chg-1",
      changeKind: "DECISION",
      summary: "SANDBOX_ALLOW scenario=superchat-translation",
      correlationId: "sbx-corr-3",
    },
  ],
  technicalLogs: [
    {
      id: "sbx-tlog-1",
      stage: "MODERATION",
      status: "OK",
      correlationId: "sbx-corr-3",
    },
  ],
  dataRequests: [
    {
      id: "sbx-req-1",
      subjectId: "sbx-sub-alice",
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      executionState: "COMPLETED",
    },
  ],
  cacheEntryCount: 1,
};

describe("SandboxPage", () => {
  it("exports /sandbox route", () => {
    expect(route.path).toBe("/sandbox");
  });

  it("renders synthetic banner, scenarios, escaped untrusted text, stage output, and privacy status", () => {
    const html = renderToStaticMarkup(
      <SandboxView
        role="DEMO_STREAMER"
        capabilities={["sandbox.read", "sandbox.scenario", "sandbox.reset", "review.decide", "stage.read", "logs.read"]}
        snapshot={SAMPLE_SNAPSHOT}
        loading={false}
        error={null}
        onSelectRole={() => {}}
        onTriggerScenario={() => {}}
        onDecideReview={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）");
    expect(html).toContain("正常聊天评分");
    expect(html).toContain("一键重置沙盒");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Thanks for the awesome stream!");
    expect(html).toContain("DELETE_AND_EXCEPT");
    expect(html).toContain("记分例外：是");
  });

  it("disables privacy delete scenario buttons when role lacks privacy.delete", () => {
    const html = renderToStaticMarkup(
      <SandboxView
        role="DEMO_MODERATOR"
        capabilities={["sandbox.read", "sandbox.scenario", "review.decide", "logs.read"]}
        snapshot={SAMPLE_SNAPSHOT}
        loading={false}
        error={null}
        onSelectRole={() => {}}
        onTriggerScenario={() => {}}
        onDecideReview={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>隐私仅删除 \(DELETE\)<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>删除并加例外 \(DELETE_AND_EXCEPT\)<\/button>/);
  });

  it("hides review queue, blocked originalText, subject details, and logs for DEMO_STAGE_VIEWER", () => {
    const html = renderToStaticMarkup(
      <SandboxView
        role="DEMO_STAGE_VIEWER"
        capabilities={["sandbox.read", "stage.read"]}
        snapshot={SAMPLE_SNAPSHOT}
        loading={false}
        error={null}
        onSelectRole={() => {}}
        onTriggerScenario={() => {}}
        onDecideReview={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）");
    expect(html).toContain("Thanks for the awesome stream!");
    expect(html).not.toContain("<h2>人工审核队列");
    expect(html).not.toContain("已拦截内容");
    expect(html).not.toContain("观众评分与隐私例外状态");
    expect(html).not.toContain("变更日志");
    expect(html).not.toContain("spam-link-xyz");
    expect(html).not.toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
