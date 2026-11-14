import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModerationView } from "../ModerationPage";
import type { ModerationSnapshot } from "../api";

const MOD_SNAPSHOT: ModerationSnapshot = {
  channel: { channelId: "ch-1", displayName: "Room 1", platform: "youtube" },
  capabilities: ["queue.read", "review.decide", "list.edit"],
  scTranslationEnabled: false,
  modelIssues: [],
  faults: { platformFault: null, modelFault: null },
  feed: {
    approvedSc: [],
    reviewQueue: [
      {
        taskId: "task-2",
        eventId: "ev-2",
        correlationId: "corr-2",
        subjectRef: "sub-2",
        kind: "REALTIME_REVIEW",
        status: "PENDING",
        deadlineAt: "2026-11-14T00:01:00.000Z",
        originalText: "hello <script>x</script>",
      },
    ],
    blockedItems: [],
    liveStream: [
      {
        eventId: "ev-blk-2",
        correlationId: "corr-blk-2",
        subjectRef: "sub-9",
        localStatus: "BLOCK",
        classification: "BLOCK",
        platformDeleteStatus: "UNKNOWN",
        bodyFolded: true,
        originalText: null,
        decidedAt: "2026-11-14T00:00:00.000Z",
        deliveryId: null,
        deliveryStatus: null,
      },
    ],
  },
};

describe("ModerationView", () => {
  it("renders queue, folded blocked item, separate local/platform status, and list actions", () => {
    const html = renderToStaticMarkup(
      <ModerationView
        channelId="ch-1"
        snapshot={MOD_SNAPSHOT}
        loading={false}
        error={null}
        conflict={{ conflict: true, reason: "CONCURRENT_MOD", current: null }}
        onDecideTask={() => {}}
        onReviewEvent={() => {}}
        onResend={() => {}}
        onBanSubject={() => {}}
      />,
    );

    expect(html).toContain("房管协作审核台");
    expect(html).toContain("并发裁决冲突（409）");
    expect(html).toContain("CONCURRENT_MOD");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(html).toContain("本地裁决：BLOCK");
    expect(html).toContain("平台删除状态：UNKNOWN");
    expect(html).toContain("违规正文已按权限折叠");
    expect(html).toContain("加入频道黑名单");
  });

  it("folds blocked body by default even when message.original is present", () => {
    const withOrig: ModerationSnapshot = {
      ...MOD_SNAPSHOT,
      capabilities: ["queue.read", "review.decide", "list.edit", "message.original"],
      feed: {
        ...MOD_SNAPSHOT.feed,
        liveStream: [
          {
            ...MOD_SNAPSHOT.feed.liveStream[0]!,
            originalText: "hidden-violation-text",
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      <ModerationView
        channelId="ch-1"
        snapshot={withOrig}
        loading={false}
        error={null}
        conflict={null}
        onDecideTask={() => {}}
        onReviewEvent={() => {}}
        onResend={() => {}}
        onBanSubject={() => {}}
      />,
    );
    expect(html).toContain("违规正文已默认折叠");
    expect(html).toContain("展开原文");
    expect(html).not.toContain("hidden-violation-text");
  });
});
