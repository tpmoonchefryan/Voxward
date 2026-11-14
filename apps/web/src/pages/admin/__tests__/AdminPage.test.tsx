import { MemoryRouter, Route, Routes } from "react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  AdminPage,
  AdminView,
  createAdminPageController,
  INITIAL_ADMIN_PAGE_STATE,
  type AdminPageState,
} from "../AdminPage";
import { AdminApiFailure, type AdminApi, type ChannelContextView, type ModelSettingsResponseView } from "../api";

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

  it("B11: renders real Q48 model options and drives AdminPage container mutations (saveModelSettings, publishRules Q12, grantMember Q17/Q34, outputs)", async () => {
    const modelResponse: ModelSettingsResponseView = {
      settings: {
        realtimeModeration: { modelId: "gpt-5.4-mini", reasoning: "low" },
        scTranslation: { modelId: "gpt-5.4", reasoning: "medium" },
        review: { modelId: "gpt-5.4", reasoning: "high" },
        scTranslationEnabled: true,
      },
      issues: [],
      capabilities: {
        contractVersion: "1",
        providerName: "synthetic",
        supportsCancel: true,
        models: [
          { modelId: "gpt-5.4-mini", reasoningLevels: ["low", "medium"] },
          { modelId: "gpt-5.4", reasoningLevels: ["medium", "high"] },
        ],
      },
      modelFault: null,
    };

    const api: AdminApi = {
      listChannels: vi.fn(async () => []),
      getContext: vi.fn(async () => OWNER_CTX),
      getRules: vi.fn(async () => ({ version: 2, ruleSet: { version: "v1", groups: [] }, terms: [], entries: [] })),
      publishRules: vi.fn(async () => {
        throw new AdminApiFailure(400, "RULE_SET_INVALID", [
          { code: "REGEX_REJECTED", ref: "r1", hint: "split branches" },
        ]);
      }),
      editSubjectList: vi.fn(async () => ({ status: "applied" })),
      editTerm: vi.fn(async () => ({ status: "applied" })),
      listCandidates: vi.fn(async () => []),
      confirmCandidate: vi.fn(async () => {
        throw new Error("unused");
      }),
      rejectCandidate: vi.fn(async () => {
        throw new Error("unused");
      }),
      listMembers: vi.fn(async () => []),
      grantMember: vi.fn(async (channelId, input) => ({
        channelId,
        accountId: input.accountId,
        role: input.role,
        logAccess: input.logAccess,
        dataAdmin: input.dataAdmin,
        grantedAt: "2026-11-14T00:00:00.000Z",
      })),
      revokeMember: vi.fn(async () => undefined),
      getModelSettings: vi.fn(async () => modelResponse),
      saveModelSettings: vi.fn(async (_channelId, settings) => ({ ...modelResponse, settings })),
      getAdminSettings: vi.fn(async () => ({
        scoring: { initialScore: 50, minScore: 0, maxScore: 100, rewardDelta: 2, penaltyDelta: 10 },
        queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 20, taskDeadlineMs: 15000 },
        retention: { changeLogDays: 30, technicalLogDays: 14, evidenceDays: 7 },
      })),
      saveAdminSettings: vi.fn(async (_channelId, settings) => settings),
      getOutputs: vi.fn(async () => ({
        grants: [{ grantId: "grant-1", outputKind: "OBS", scope: "SC", createdAt: "2026-11-14T00:00:00.000Z" }],
        tokens: [{ tokenId: "tok-1", createdAt: "2026-11-14T00:00:00.000Z" }],
      })),
      issueOutputGrant: vi.fn(async () => ({ grantId: "grant-2" })),
      revokeOutputGrant: vi.fn(async () => undefined),
      issueOutputToken: vi.fn(async () => ({ tokenId: "tok-2" })),
      revokeOutputToken: vi.fn(async () => undefined),
    };

    // Container mounts cleanly
    const mountHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/admin/ch-1"]}>
        <Routes>
          <Route path="/admin/:channelId" element={<AdminPage api={api} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(mountHtml).toContain("频道管理台");

    // Drive controller used by <AdminPage />
    let state: AdminPageState = INITIAL_ADMIN_PAGE_STATE;
    const controller = createAdminPageController(api, "ch-1", (updater) => {
      state = updater(state);
    });
    await controller.refresh();

    const htmlAfterLoad = renderToStaticMarkup(
      <MemoryRouter>
        <AdminView
          channelId="ch-1"
          channels={state.channels}
          context={state.context}
          rules={state.rules}
          ruleIssues={state.ruleIssues}
          modelIssues={state.modelIssues}
          candidates={state.candidates}
          members={state.members}
          modelSettings={state.modelSettings}
          adminSettings={state.adminSettings}
          outputs={state.outputs}
          error={state.error}
          onConfirmCandidate={() => {}}
          onRejectCandidate={() => {}}
          onRevokeMember={() => {}}
        />
      </MemoryRouter>,
    );
    expect(htmlAfterLoad).toContain("gpt-5.4-mini");
    expect(htmlAfterLoad).toContain("gpt-5.4");
    expect(htmlAfterLoad).toContain("保存模型配置");
    expect(htmlAfterLoad).toContain("发布规则");
    expect(htmlAfterLoad).toContain("授予权限");
    expect(htmlAfterLoad).toContain("grant-1");
    expect(htmlAfterLoad).toContain("tok-1");

    await controller.saveModelSettings(modelResponse.settings);
    expect(api.saveModelSettings).toHaveBeenCalledWith("ch-1", modelResponse.settings);

    await controller.publishRules({ version: "v1", groups: [] });
    expect(state.ruleIssues).toEqual([{ code: "REGEX_REJECTED", ref: "r1", hint: "split branches" }]);
    expect(state.modelIssues).toEqual([]);

    await controller.grantMember({ accountId: "acc-2", role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true });
    expect(api.grantMember).toHaveBeenCalledWith("ch-1", {
      accountId: "acc-2",
      role: "CHANNEL_OWNER",
      logAccess: true,
      dataAdmin: true,
    });

    await controller.editTerm({ action: "ADD", term: "bad", matchKind: "EXACT", language: "zh", groupCode: "g1" });
    await controller.editSubjectList("yt-viewer-1", "BLACKLIST");
    await controller.saveAdminSettings(state.adminSettings!);
    await controller.issueOutputGrant();
    await controller.revokeOutputGrant("grant-1");
    await controller.issueOutputToken();
    await controller.revokeOutputToken("tok-1");
    expect(api.editTerm).toHaveBeenCalledTimes(1);
    expect(api.editSubjectList).toHaveBeenCalledTimes(1);
    expect(api.saveAdminSettings).toHaveBeenCalledTimes(1);
    expect(api.issueOutputGrant).toHaveBeenCalledTimes(1);
    expect(api.revokeOutputGrant).toHaveBeenCalledTimes(1);
    expect(api.issueOutputToken).toHaveBeenCalledTimes(1);
    expect(api.revokeOutputToken).toHaveBeenCalledTimes(1);
  });
});
