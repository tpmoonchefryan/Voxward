import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DockView } from "../DockPage";
import type { DockSnapshot } from "../api";

const SNAPSHOT: DockSnapshot = {
  channel: { channelId: "ch-1", displayName: "Room 1", platform: "youtube" },
  capabilities: ["queue.read", "review.decide"],
  scTranslationEnabled: true,
  modelIssues: [{ code: "SELECTION_NOT_CONFIGURED", path: "/scTranslation" }],
  faults: {
    platformFault: { code: "YT_QUOTA", message: "quota exceeded" },
    modelFault: { code: "MODEL_TIMEOUT", message: "provider timed out" },
  },
  feed: {
    approvedSc: [
      {
        eventId: "ev-sc",
        correlationId: "corr-sc",
        subjectRef: "sub-1",
        originalText: "<b>Original SC</b>",
        translation: "翻译正文",
        notes: "梗注说明",
        acknowledgement: "感谢支持",
        safeAlias: "safe-user",
        decidedAt: "2026-11-14T00:00:00.000Z",
        deliveryId: "del-1",
        deliveryStatus: "SENT",
      },
    ],
    reviewQueue: [
      {
        taskId: "task-1",
        eventId: "ev-q1",
        correlationId: "corr-q1",
        subjectRef: "sub-2",
        kind: "REALTIME_REVIEW",
        status: "PENDING",
        deadlineAt: "2026-11-14T00:01:00.000Z",
        originalText: "queued text",
      },
    ],
    blockedItems: [
      {
        eventId: "ev-blk",
        correlationId: "corr-blk",
        subjectRef: "sub-3",
        localStatus: "BLOCK",
        classification: "BLOCK",
        platformDeleteStatus: "FAILED",
        bodyFolded: true,
        originalText: null,
        decidedAt: "2026-11-14T00:00:00.000Z",
        deliveryId: null,
        deliveryStatus: null,
      },
    ],
    liveStream: [],
  },
};

describe("DockView", () => {
  it("separates SC original vs AI translation, folds blocked body without message.original, and shows faults & conflicts", () => {
    const html = renderToStaticMarkup(
      <DockView
        roomId="ch-1"
        snapshot={SNAPSHOT}
        loading={false}
        error={null}
        conflict={{ conflict: true, reason: "ALREADY_DECIDED", current: null }}
        onToggleSc={() => {}}
        onDecideTask={() => {}}
        onReviewEvent={() => {}}
        onResend={() => {}}
      />,
    );

    expect(html).toContain("系统与连接故障（非内容违规）");
    expect(html).toContain("YT_QUOTA");
    expect(html).toContain("MODEL_TIMEOUT");
    expect(html).toContain("并发冲突提示");
    expect(html).toContain("ALREADY_DECIDED");
    expect(html).toContain("观众原文：");
    expect(html).toContain("&lt;b&gt;Original SC&lt;/b&gt;");
    expect(html).toContain("<bdi>");
    expect(html).toContain("AI 精翻（辅助）：");
    expect(html).toContain("翻译正文");
    expect(html).toContain("安全称呼读音：");
    expect(html).toContain("safe-user");
    expect(html).toContain("本地状态：BLOCK");
    expect(html).toContain("平台状态：平台删除失败");
    expect(html).toContain("违规正文已按权限折叠");
  });
});
