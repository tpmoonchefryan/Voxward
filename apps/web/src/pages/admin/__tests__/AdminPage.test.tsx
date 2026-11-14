import { MemoryRouter } from "react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminView } from "../AdminPage";
import type { ChannelContextView } from "../api";

const OWNER_CTX: ChannelContextView = {
  channelId: "ch-1",
  displayName: "Room 1",
  platform: "youtube",
  role: "CHANNEL_OWNER",
  logAccess: true,
  dataAdmin: true,
  capabilities: [
    "queue.read",
    "review.decide",
    "list.edit",
    "score.config",
    "output.manage",
    "members.manage",
    "tokens.manage",
    "message.original",
    "subject.evidence",
    "data.handle",
    "logs.view",
  ],
  faults: {
    platformFault: { code: "YT_DISCONNECTED", message: "stream offline" },
    modelFault: null,
  },
};

const MOD_CTX: ChannelContextView = {
  channelId: "ch-1",
  displayName: "Room 1",
  platform: "youtube",
  role: "MODERATOR",
  logAccess: false,
  dataAdmin: false,
  capabilities: ["queue.read", "review.decide", "list.edit", "message.original"],
  faults: { platformFault: null, modelFault: null },
};

describe("AdminView", () => {
  it("renders all authorized admin sections, Q12 hints, Q50 candidates, Q48 models, and Data/Log links for owner", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminView
          channelId="ch-1"
          channels={[]}
          context={OWNER_CTX}
          rules={{ version: 3, ruleSet: null, terms: [], entries: [] }}
          ruleIssues={[
            {
              code: "REGEX_REJECTED",
              ref: "r1",
              hint: "write the alternatives as top-level branches, such as a|b, or split them into several rules",
            },
          ]}
          candidates={[
            {
              id: "cand-1",
              term: "spamword",
              note: "repeated spam",
              sourceCorrelationId: "corr-1",
              status: "PENDING_CONFIRMATION",
              ruleVersion: null,
            },
          ]}
          members={[
            {
              channelId: "ch-1",
              accountId: "acc-1",
              role: "CHANNEL_OWNER",
              logAccess: true,
              dataAdmin: true,
              grantedAt: "2026-11-14T00:00:00.000Z",
            },
          ]}
          modelSettings={{
            settings: { realtimeModeration: null, scTranslation: null, review: null, scTranslationEnabled: false },
            issues: [{ code: "SELECTION_NOT_CONFIGURED", path: "/realtimeModeration" }],
            capabilities: { contractVersion: "1", providerName: "synthetic", supportsCancel: true },
            modelFault: null,
          }}
          adminSettings={{
            scoring: { initialScore: 50, minScore: 0, maxScore: 100, rewardDelta: 2, penaltyDelta: 10 },
            queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 20, taskDeadlineMs: 15000 },
            retention: { changeLogDays: 30, technicalLogDays: 14, evidenceDays: 7 },
          }}
          outputs={{ grants: [], tokens: [] }}
          error={null}
          onConfirmCandidate={() => {}}
          onRejectCandidate={() => {}}
          onRevokeMember={() => {}}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("连接与系统故障状态");
    expect(html).toContain("YT_DISCONNECTED");
    expect(html).toContain("用户数据面板");
    expect(html).toContain("日志查看器");
    expect(html).toContain("REGEX_REJECTED");
    expect(html).toContain("write the alternatives as top-level branches");
    expect(html).toContain("spamword");
    expect(html).toContain("确认入库");
    expect(html).toContain("拒绝");
    expect(html).toContain("[数据管理员]");
    expect(html).toContain("模型配置（Q48）");
    expect(html).toContain("评分、队列与保留策略");
    expect(html).toContain("输出端与只读凭据");
  });

  it("hides owner-only sections and Data/Log links from a moderator without those capabilities", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminView
          channelId="ch-1"
          channels={[]}
          context={MOD_CTX}
          rules={{ version: 1, ruleSet: null, terms: [], entries: [] }}
          ruleIssues={[]}
          candidates={[]}
          members={[]}
          modelSettings={null}
          adminSettings={null}
          outputs={null}
          error={null}
          onConfirmCandidate={() => {}}
          onRejectCandidate={() => {}}
          onRevokeMember={() => {}}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("规则、名单与候选词");
    expect(html).not.toContain("成员与权限（Q17 / Q34）");
    expect(html).not.toContain("模型配置（Q48）");
    expect(html).not.toContain("评分、队列与保留策略");
    expect(html).not.toContain("输出端与只读凭据");
    expect(html).not.toContain("用户数据面板");
    expect(html).not.toContain("日志查看器");
  });
});
