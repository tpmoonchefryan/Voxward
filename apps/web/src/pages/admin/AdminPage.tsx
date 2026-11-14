import { LIST_KINDS, TERM_MATCH_KINDS, type ListKind, type TermMatchKind } from "@voxward/contracts";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { UntrustedText } from "../../components/untrusted-text";
import {
  AdminApiFailure,
  adminMessageFor,
  createAdminApi,
  type AdminApi,
  type AdminSettingsView,
  type CandidateCardView,
  type ChannelContextView,
  type ChannelSummary,
  type MemberView,
  type ModelSelectionView,
  type ModelSettingsResponseView,
  type ModelSettingsView,
  type OutputsSummaryView,
  type RuleIssueView,
  type RulesStateView,
  type SettingsIssueView,
} from "./api";

type ModelSlotKey = "realtimeModeration" | "scTranslation" | "review";

const MODEL_SLOT_LABELS: readonly { readonly key: ModelSlotKey; readonly label: string }[] = [
  { key: "realtimeModeration", label: "实时审核模型" },
  { key: "scTranslation", label: "SC 精翻模型" },
  { key: "review", label: "复核模型" },
];

const EMPTY_MODEL_SETTINGS: ModelSettingsView = {
  realtimeModeration: null,
  scTranslation: null,
  review: null,
  scTranslationEnabled: false,
};

export interface AdminViewProps {
  readonly channelId: string;
  readonly channels: readonly ChannelSummary[];
  readonly context: ChannelContextView | null;
  readonly rules: RulesStateView | null;
  readonly ruleIssues: readonly RuleIssueView[];
  readonly modelIssues?: readonly SettingsIssueView[];
  readonly candidates: readonly CandidateCardView[];
  readonly members: readonly MemberView[];
  readonly modelSettings: ModelSettingsResponseView | null;
  readonly adminSettings: AdminSettingsView | null;
  readonly outputs: OutputsSummaryView | null;
  readonly error: string | null;
  readonly onPublishRules?: (ruleSet: unknown) => void;
  readonly onEditTerm?: (input: {
    readonly action: "ADD" | "RETIRE";
    readonly term: string;
    readonly matchKind: TermMatchKind;
    readonly language: string;
    readonly groupCode: string;
  }) => void;
  readonly onEditSubjectList?: (subjectKey: string, listKind: ListKind | null) => void;
  readonly onConfirmCandidate: (cardId: string) => void;
  readonly onRejectCandidate: (cardId: string) => void;
  readonly onGrantMember?: (input: {
    readonly accountId: string;
    readonly role: "CHANNEL_OWNER" | "MODERATOR" | "DATA_ADMIN";
    readonly logAccess: boolean;
    readonly dataAdmin: boolean;
  }) => void;
  readonly onRevokeMember: (accountId: string) => void;
  readonly onSaveModelSettings?: (settings: ModelSettingsView) => void;
  readonly onSaveAdminSettings?: (settings: AdminSettingsView) => void;
  readonly onIssueOutputGrant?: () => void;
  readonly onRevokeOutputGrant?: (grantId: string) => void;
  readonly onIssueOutputToken?: () => void;
  readonly onRevokeOutputToken?: (tokenId: string) => void;
}

export function AdminView(props: AdminViewProps) {
  const {
    channelId,
    channels,
    context,
    rules,
    ruleIssues,
    modelIssues: extraModelIssues = [],
    candidates,
    members,
    modelSettings,
    adminSettings,
    outputs,
    error,
  } = props;
  const caps = new Set(context?.capabilities ?? []);
  const canEditRules = caps.has("list.edit") || caps.has("score.config");
  const canEditList = caps.has("list.edit");

  const [ruleJsonText, setRuleJsonText] = useState<string>(
    () => (rules?.ruleSet ? JSON.stringify(rules.ruleSet, null, 2) : '{"version":"v1","groups":[]}'),
  );
  const [ruleJsonError, setRuleJsonError] = useState<string | null>(null);
  const [termText, setTermText] = useState("");
  const [termMatchKind, setTermMatchKind] = useState<TermMatchKind>("EXACT");
  const [termLanguage, setTermLanguage] = useState("zh");
  const [termGroupCode, setTermGroupCode] = useState("default");
  const [subjectKey, setSubjectKey] = useState("");
  const [subjectListKind, setSubjectListKind] = useState<ListKind>("BLACKLIST");

  const [memberAccountId, setMemberAccountId] = useState("");
  const [memberRole, setMemberRole] = useState<"CHANNEL_OWNER" | "MODERATOR" | "DATA_ADMIN">("MODERATOR");
  const [memberLogAccess, setMemberLogAccess] = useState(false);
  const [memberDataAdmin, setMemberDataAdmin] = useState(false);

  const [draftModelSettings, setDraftModelSettings] = useState<ModelSettingsView>(
    () => modelSettings?.settings ?? EMPTY_MODEL_SETTINGS,
  );
  const [draftAdminSettings, setDraftAdminSettings] = useState<AdminSettingsView | null>(
    () => adminSettings,
  );

  useEffect(() => {
    if (rules?.ruleSet !== undefined && rules.ruleSet !== null) {
      setRuleJsonText(JSON.stringify(rules.ruleSet, null, 2));
    }
  }, [rules?.version, rules?.ruleSet]);

  useEffect(() => {
    if (modelSettings !== null) {
      setDraftModelSettings(modelSettings.settings);
    }
  }, [modelSettings]);

  useEffect(() => {
    if (adminSettings !== null) {
      setDraftAdminSettings(adminSettings);
    }
  }, [adminSettings]);

  const availableModels = modelSettings?.capabilities.models ?? [];
  const combinedModelIssues = [...(modelSettings?.issues ?? []), ...extraModelIssues];

  function updateModelSlot(slot: ModelSlotKey, nextModelId: string) {
    if (!nextModelId) {
      setDraftModelSettings((prev) => ({ ...prev, [slot]: null }));
      return;
    }
    const modelCap = availableModels.find((m) => m.modelId === nextModelId);
    const prevSelection = draftModelSettings[slot];
    const nextReasoning =
      modelCap && modelCap.reasoningLevels.length > 0
        ? prevSelection !== null && modelCap.reasoningLevels.includes(prevSelection.reasoning ?? "")
          ? prevSelection.reasoning
          : (modelCap.reasoningLevels[0] ?? null)
        : null;
    const selection: ModelSelectionView = { modelId: nextModelId, reasoning: nextReasoning };
    setDraftModelSettings((prev) => ({ ...prev, [slot]: selection }));
  }

  function updateModelReasoning(slot: ModelSlotKey, nextReasoning: string) {
    setDraftModelSettings((prev) => {
      const current = prev[slot];
      if (current === null) return prev;
      return { ...prev, [slot]: { ...current, reasoning: nextReasoning || null } };
    });
  }

  function handlePublishRulesClick() {
    setRuleJsonError(null);
    try {
      const parsed: unknown = JSON.parse(ruleJsonText);
      props.onPublishRules?.(parsed);
    } catch {
      setRuleJsonError("规则 JSON 格式无效。");
    }
  }

  return (
    <main>
      <h1>频道管理台</h1>
      {error !== null ? (
        <p role="alert" data-testid="admin-error">
          {error}
        </p>
      ) : null}

      {!channelId ? (
        <section aria-label="频道选择">
          <h2>选择已授权频道</h2>
          {channels.length === 0 ? <p>暂无已授权频道。</p> : null}
          <ul>
            {channels.map((ch) => (
              <li key={ch.channelId}>
                <Link to={`/admin/${encodeURIComponent(ch.channelId)}`}>
                  <UntrustedText text={ch.displayName} /> ({ch.role})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {context !== null ? (
        <>
          <p>
            当前频道：<UntrustedText text={context.displayName} />（角色：{context.role}）
          </p>

          {(context.faults.platformFault !== null || context.faults.modelFault !== null) ? (
            <section role="alert" data-testid="admin-fault-banner">
              <h2>连接与系统故障状态</h2>
              {context.faults.platformFault !== null ? (
                <p>
                  平台连接故障：<UntrustedText text={context.faults.platformFault.code} /> —{" "}
                  <UntrustedText text={context.faults.platformFault.message} />
                </p>
              ) : null}
              {context.faults.modelFault !== null ? (
                <p>
                  模型服务故障：<UntrustedText text={context.faults.modelFault.code} /> —{" "}
                  <UntrustedText text={context.faults.modelFault.message} />
                </p>
              ) : null}
            </section>
          ) : null}

          <nav aria-label="关联面板入口">
            <h2>关联面板</h2>
            <ul>
              <li>
                <Link to={`/dock/${encodeURIComponent(channelId)}`}>主播 Dock</Link>
              </li>
              <li>
                <Link to={`/moderation/${encodeURIComponent(channelId)}`}>房管协作台</Link>
              </li>
              {caps.has("data.handle") ? (
                <li>
                  <Link to={`/data/${encodeURIComponent(channelId)}`}>用户数据面板</Link>
                </li>
              ) : null}
              {caps.has("logs.view") ? (
                <li>
                  <Link to={`/logs/${encodeURIComponent(channelId)}`}>日志查看器</Link>
                </li>
              ) : null}
            </ul>
          </nav>

          {caps.has("queue.read") || canEditRules ? (
            <section aria-label="规则名单与候选词">
              <h2>规则、名单与候选词（Q12 / Q50）</h2>
              {rules !== null ? (
                <p>
                  当前规则版本：v{rules.version}，有效词条 {rules.terms.length} 条，名单 {rules.entries.length} 条
                </p>
              ) : null}
              {ruleIssues.length > 0 ? (
                <ul data-testid="rule-issues">
                  {ruleIssues.map((issue, idx) => (
                    <li key={`${issue.code}-${idx}`}>
                      <UntrustedText text={issue.code} /> (<UntrustedText text={issue.ref} />)
                      {issue.hint !== undefined ? (
                        <>
                          {" — 建议："}
                          <UntrustedText text={issue.hint} />
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canEditRules ? (
                <div>
                  <h3>规则集发布（Q12）</h3>
                  <textarea
                    aria-label="规则集 JSON"
                    rows={5}
                    value={ruleJsonText}
                    onChange={(e) => setRuleJsonText(e.target.value)}
                  />
                  {ruleJsonError !== null ? <p role="alert">{ruleJsonError}</p> : null}
                  <button type="button" onClick={handlePublishRulesClick}>
                    发布规则
                  </button>
                </div>
              ) : null}

              <h3>词条列表</h3>
              {rules !== null && rules.terms.length > 0 ? (
                <ul>
                  {rules.terms.map((t) => (
                    <li key={t.id}>
                      <UntrustedText text={t.term} /> ({t.matchKind} / {t.language} / {t.groupCode})
                      {canEditList ? (
                        <button
                          type="button"
                          onClick={() =>
                            props.onEditTerm?.({
                              action: "RETIRE",
                              term: t.term,
                              matchKind: t.matchKind as TermMatchKind,
                              language: t.language,
                              groupCode: t.groupCode,
                            })
                          }
                        >
                          移除词条
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>暂无有效词条。</p>
              )}
              {canEditList ? (
                <div>
                  <input
                    aria-label="新增词条"
                    placeholder="输入词条"
                    value={termText}
                    onChange={(e) => setTermText(e.target.value)}
                  />
                  <select
                    aria-label="词条匹配模式"
                    value={termMatchKind}
                    onChange={(e) => setTermMatchKind(e.target.value as TermMatchKind)}
                  >
                    {TERM_MATCH_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="词条语言"
                    value={termLanguage}
                    onChange={(e) => setTermLanguage(e.target.value)}
                  />
                  <input
                    aria-label="词条分组"
                    value={termGroupCode}
                    onChange={(e) => setTermGroupCode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!termText.trim()) return;
                      props.onEditTerm?.({
                        action: "ADD",
                        term: termText.trim(),
                        matchKind: termMatchKind,
                        language: termLanguage.trim() || "zh",
                        groupCode: termGroupCode.trim() || "default",
                      });
                      setTermText("");
                    }}
                  >
                    添加词条
                  </button>
                </div>
              ) : null}

              <h3>主体黑白名单</h3>
              {rules !== null && rules.entries.length > 0 ? (
                <ul>
                  {rules.entries.map((entry) => (
                    <li key={entry.id}>
                      <UntrustedText text={entry.subjectKey} /> [{entry.listKind}]
                      {canEditList ? (
                        <button
                          type="button"
                          onClick={() => props.onEditSubjectList?.(entry.subjectKey, null)}
                        >
                          移出名单
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>暂无主体名单记录。</p>
              )}
              {canEditList ? (
                <div>
                  <input
                    aria-label="主体键"
                    placeholder="platformSubjectKey"
                    value={subjectKey}
                    onChange={(e) => setSubjectKey(e.target.value)}
                  />
                  <select
                    aria-label="名单类型"
                    value={subjectListKind}
                    onChange={(e) => setSubjectListKind(e.target.value as ListKind)}
                  >
                    {LIST_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!subjectKey.trim()) return;
                      props.onEditSubjectList?.(subjectKey.trim(), subjectListKind);
                      setSubjectKey("");
                    }}
                  >
                    保存主体名单
                  </button>
                </div>
              ) : null}

              <h3>候选词卡片</h3>
              {candidates.length === 0 ? <p>暂无候选词。</p> : null}
              <ul>
                {candidates.map((card) => (
                  <li key={card.id}>
                    <UntrustedText text={card.term} /> [{card.status}]
                    {card.note !== null ? (
                      <>
                        {" — "}
                        <UntrustedText text={card.note} />
                      </>
                    ) : null}
                    {canEditList && card.status === "PENDING_CONFIRMATION" ? (
                      <div>
                        <button type="button" onClick={() => props.onConfirmCandidate(card.id)}>
                          确认入库
                        </button>
                        <button type="button" onClick={() => props.onRejectCandidate(card.id)}>
                          拒绝
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {caps.has("members.manage") ? (
            <section aria-label="成员与权限管理">
              <h2>成员与权限（Q17 / Q34）</h2>
              <ul>
                {members.map((m) => (
                  <li key={m.accountId}>
                    <UntrustedText text={m.accountId} /> — {m.role}
                    {m.logAccess ? " [日志]" : ""}
                    {m.dataAdmin ? " [数据管理员]" : ""}
                    <button type="button" onClick={() => props.onRevokeMember(m.accountId)}>
                      撤销权限
                    </button>
                  </li>
                ))}
              </ul>
              <div>
                <h3>邀请 / 授予成员权限</h3>
                <input
                  aria-label="成员账号 ID"
                  placeholder="accountId"
                  value={memberAccountId}
                  onChange={(e) => setMemberAccountId(e.target.value)}
                />
                <select
                  aria-label="成员角色"
                  value={memberRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as "CHANNEL_OWNER" | "MODERATOR" | "DATA_ADMIN";
                    setMemberRole(nextRole);
                    if (nextRole !== "CHANNEL_OWNER") setMemberDataAdmin(false);
                  }}
                >
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="CHANNEL_OWNER">CHANNEL_OWNER</option>
                  <option value="DATA_ADMIN">DATA_ADMIN</option>
                </select>
                <label>
                  <input
                    type="checkbox"
                    aria-label="允许查看日志"
                    checked={memberLogAccess}
                    onChange={(e) => setMemberLogAccess(e.target.checked)}
                  />
                  允许查看日志
                </label>
                <label>
                  <input
                    type="checkbox"
                    aria-label="授予数据管理员（Q34）"
                    checked={memberRole === "CHANNEL_OWNER" && memberDataAdmin}
                    disabled={memberRole !== "CHANNEL_OWNER"}
                    onChange={(e) => setMemberDataAdmin(e.target.checked)}
                  />
                  数据管理员（仅频道主）
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!memberAccountId.trim()) return;
                    props.onGrantMember?.({
                      accountId: memberAccountId.trim(),
                      role: memberRole,
                      logAccess: memberLogAccess,
                      dataAdmin: memberRole === "CHANNEL_OWNER" ? memberDataAdmin : false,
                    });
                    setMemberAccountId("");
                  }}
                >
                  授予权限
                </button>
              </div>
            </section>
          ) : null}

          {caps.has("score.config") && modelSettings !== null ? (
            <section aria-label="模型配置">
              <h2>模型配置（Q48）</h2>
              <p>
                适配器：<UntrustedText text={modelSettings.capabilities.providerName} />（SC 精翻：
                {draftModelSettings.scTranslationEnabled ? "开启" : "关闭"}）
              </p>
              {availableModels.length === 0 ? <p>当前适配器未声明可用模型。</p> : null}
              {MODEL_SLOT_LABELS.map(({ key, label }) => {
                const selection = draftModelSettings[key];
                const selectedModel = availableModels.find((m) => m.modelId === selection?.modelId);
                const reasoningLevels = selectedModel?.reasoningLevels ?? [];
                return (
                  <div key={key}>
                    <label>
                      {label}模型
                      <select
                        aria-label={`${label}模型`}
                        value={selection?.modelId ?? ""}
                        onChange={(e) => updateModelSlot(key, e.target.value)}
                      >
                        <option value="">未配置</option>
                        {availableModels.map((m) => {
                          const displayName = (m as { readonly displayName?: string }).displayName ?? m.modelId;
                          return (
                            <option key={m.modelId} value={m.modelId}>
                              {displayName}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label>
                      {label}推理档位
                      <select
                        aria-label={`${label}推理档位`}
                        value={selection?.reasoning ?? ""}
                        disabled={selection === null || reasoningLevels.length === 0}
                        onChange={(e) => updateModelReasoning(key, e.target.value)}
                      >
                        <option value="">无推理档位</option>
                        {reasoningLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
              <label>
                <input
                  type="checkbox"
                  aria-label="启用 SC 精翻"
                  checked={draftModelSettings.scTranslationEnabled}
                  onChange={(e) =>
                    setDraftModelSettings((prev) => ({ ...prev, scTranslationEnabled: e.target.checked }))
                  }
                />
                启用 SC 精翻
              </label>
              <button type="button" onClick={() => props.onSaveModelSettings?.(draftModelSettings)}>
                保存模型配置
              </button>
              {combinedModelIssues.length > 0 ? (
                <ul data-testid="model-issues">
                  {combinedModelIssues.map((issue, idx) => (
                    <li key={`${issue.code}-${idx}`}>
                      {issue.code} ({issue.path})
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {caps.has("score.config") && adminSettings !== null && draftAdminSettings !== null ? (
            <section aria-label="评分队列与保留配置">
              <h2>评分、队列与保留策略</h2>
              <p>
                评分范围：{adminSettings.scoring.minScore} ~ {adminSettings.scoring.maxScore}（初始{" "}
                {adminSettings.scoring.initialScore}）
              </p>
              <p>
                队列并发：实时 {adminSettings.queue.realtimeConcurrency} / SC {adminSettings.queue.scConcurrency}
              </p>
              <p>
                保留天数：变更日志 {adminSettings.retention.changeLogDays} 天 / 技术日志{" "}
                {adminSettings.retention.technicalLogDays} 天 / 证据 {adminSettings.retention.evidenceDays} 天
              </p>
              <div>
                <label>
                  最低分
                  <input
                    type="number"
                    aria-label="最低分"
                    value={draftAdminSettings.scoring.minScore}
                    onChange={(e) =>
                      setDraftAdminSettings((prev) =>
                        prev ? { ...prev, scoring: { ...prev.scoring, minScore: Number(e.target.value) } } : prev,
                      )
                    }
                  />
                </label>
                <label>
                  初始分
                  <input
                    type="number"
                    aria-label="初始分"
                    value={draftAdminSettings.scoring.initialScore}
                    onChange={(e) =>
                      setDraftAdminSettings((prev) =>
                        prev ? { ...prev, scoring: { ...prev.scoring, initialScore: Number(e.target.value) } } : prev,
                      )
                    }
                  />
                </label>
                <label>
                  最高分
                  <input
                    type="number"
                    aria-label="最高分"
                    value={draftAdminSettings.scoring.maxScore}
                    onChange={(e) =>
                      setDraftAdminSettings((prev) =>
                        prev ? { ...prev, scoring: { ...prev.scoring, maxScore: Number(e.target.value) } } : prev,
                      )
                    }
                  />
                </label>
                <label>
                  实时并发
                  <input
                    type="number"
                    aria-label="实时并发"
                    value={draftAdminSettings.queue.realtimeConcurrency}
                    onChange={(e) =>
                      setDraftAdminSettings((prev) =>
                        prev
                          ? { ...prev, queue: { ...prev.queue, realtimeConcurrency: Number(e.target.value) } }
                          : prev,
                      )
                    }
                  />
                </label>
                <label>
                  SC 并发
                  <input
                    type="number"
                    aria-label="SC 并发"
                    value={draftAdminSettings.queue.scConcurrency}
                    onChange={(e) =>
                      setDraftAdminSettings((prev) =>
                        prev ? { ...prev, queue: { ...prev.queue, scConcurrency: Number(e.target.value) } } : prev,
                      )
                    }
                  />
                </label>
                <label>
                  技术日志保留天数
                  <input
                    type="number"
                    aria-label="技术日志保留天数"
                    value={draftAdminSettings.retention.technicalLogDays}
                    onChange={(e) =>
                      setDraftAdminSettings((prev) =>
                        prev
                          ? { ...prev, retention: { ...prev.retention, technicalLogDays: Number(e.target.value) } }
                          : prev,
                      )
                    }
                  />
                </label>
                <button type="button" onClick={() => props.onSaveAdminSettings?.(draftAdminSettings)}>
                  保存策略配置
                </button>
              </div>
            </section>
          ) : null}

          {(caps.has("output.manage") || caps.has("tokens.manage")) && outputs !== null ? (
            <section aria-label="输出端配置">
              <h2>输出端与只读凭据</h2>
              <p>
                原生输出授权：{outputs.grants.length} 个 | 只读输出令牌：{outputs.tokens.length} 个
              </p>
              {caps.has("output.manage") ? (
                <div>
                  <button type="button" onClick={() => props.onIssueOutputGrant?.()}>
                    签发输出授权
                  </button>
                  <ul>
                    {outputs.grants.map((g) => (
                      <li key={g.grantId}>
                        <UntrustedText text={g.grantId} /> ({g.outputKind} / {g.scope})
                        <button type="button" onClick={() => props.onRevokeOutputGrant?.(g.grantId)}>
                          吊销授权
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {caps.has("tokens.manage") ? (
                <div>
                  <button type="button" onClick={() => props.onIssueOutputToken?.()}>
                    签发只读令牌
                  </button>
                  <ul>
                    {outputs.tokens.map((t) => (
                      <li key={t.tokenId}>
                        <UntrustedText text={t.tokenId} /> ({t.createdAt})
                        <button type="button" onClick={() => props.onRevokeOutputToken?.(t.tokenId)}>
                          吊销令牌
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export interface AdminPageState {
  readonly channels: readonly ChannelSummary[];
  readonly context: ChannelContextView | null;
  readonly rules: RulesStateView | null;
  readonly ruleIssues: readonly RuleIssueView[];
  readonly modelIssues: readonly SettingsIssueView[];
  readonly candidates: readonly CandidateCardView[];
  readonly members: readonly MemberView[];
  readonly modelSettings: ModelSettingsResponseView | null;
  readonly adminSettings: AdminSettingsView | null;
  readonly outputs: OutputsSummaryView | null;
  readonly error: string | null;
}

export const INITIAL_ADMIN_PAGE_STATE: AdminPageState = {
  channels: [],
  context: null,
  rules: null,
  ruleIssues: [],
  modelIssues: [],
  candidates: [],
  members: [],
  modelSettings: null,
  adminSettings: null,
  outputs: null,
  error: null,
};

export function createAdminPageController(
  client: AdminApi,
  channelId: string,
  setState: (updater: (prev: AdminPageState) => AdminPageState) => void,
) {
  async function refresh() {
    setState((prev) => ({ ...prev, error: null }));
    try {
      if (!channelId) {
        const nextChannels = await client.listChannels();
        setState((prev) => ({ ...prev, channels: nextChannels, context: null }));
        return;
      }
      const ctx = await client.getContext(channelId);
      const caps = new Set(ctx.capabilities);
      const nextRules =
        caps.has("queue.read") || caps.has("list.edit") || caps.has("score.config")
          ? await client.getRules(channelId)
          : null;
      const nextCandidates = caps.has("queue.read") ? await client.listCandidates(channelId) : [];
      const nextMembers = caps.has("members.manage") ? await client.listMembers(channelId) : [];
      const nextModelSettings = caps.has("score.config") ? await client.getModelSettings(channelId) : null;
      const nextAdminSettings = caps.has("score.config") ? await client.getAdminSettings(channelId) : null;
      const nextOutputs =
        caps.has("output.manage") || caps.has("tokens.manage") ? await client.getOutputs(channelId) : null;
      setState((prev) => ({
        ...prev,
        context: ctx,
        rules: nextRules,
        candidates: nextCandidates,
        members: nextMembers,
        modelSettings: nextModelSettings,
        adminSettings: nextAdminSettings,
        outputs: nextOutputs,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        ruleIssues: err instanceof AdminApiFailure && err.issues !== undefined ? err.issues : prev.ruleIssues,
        modelIssues:
          err instanceof AdminApiFailure && err.settingsIssues !== undefined ? err.settingsIssues : prev.modelIssues,
        error: adminMessageFor(err),
      }));
    }
  }

  async function runMutation(action: () => Promise<unknown>) {
    setState((prev) => ({ ...prev, error: null, ruleIssues: [], modelIssues: [] }));
    try {
      await action();
      await refresh();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        ruleIssues: err instanceof AdminApiFailure && err.issues !== undefined ? err.issues : prev.ruleIssues,
        modelIssues:
          err instanceof AdminApiFailure && err.settingsIssues !== undefined ? err.settingsIssues : prev.modelIssues,
        error: adminMessageFor(err),
      }));
    }
  }

  return {
    refresh,
    publishRules: (ruleSet: unknown) => runMutation(() => client.publishRules(channelId, ruleSet)),
    editTerm: (input: Parameters<AdminApi["editTerm"]>[1]) => runMutation(() => client.editTerm(channelId, input)),
    editSubjectList: (key: string, listKind: ListKind | null) =>
      runMutation(() => client.editSubjectList(channelId, key, listKind)),
    confirmCandidate: (cardId: string) => runMutation(() => client.confirmCandidate(channelId, cardId)),
    rejectCandidate: (cardId: string) => runMutation(() => client.rejectCandidate(channelId, cardId)),
    grantMember: (input: Parameters<AdminApi["grantMember"]>[1]) =>
      runMutation(() => client.grantMember(channelId, input)),
    revokeMember: (accountId: string) => runMutation(() => client.revokeMember(channelId, accountId)),
    saveModelSettings: (settings: ModelSettingsView) =>
      runMutation(() => client.saveModelSettings(channelId, settings)),
    saveAdminSettings: (settings: AdminSettingsView) =>
      runMutation(() => client.saveAdminSettings(channelId, settings)),
    issueOutputGrant: () => runMutation(() => client.issueOutputGrant(channelId)),
    revokeOutputGrant: (grantId: string) => runMutation(() => client.revokeOutputGrant(channelId, grantId)),
    issueOutputToken: () => runMutation(() => client.issueOutputToken(channelId)),
    revokeOutputToken: (tokenId: string) => runMutation(() => client.revokeOutputToken(channelId, tokenId)),
  };
}

export function AdminPage({ api }: { readonly api?: AdminApi } = {}) {
  const { channelId = "" } = useParams();
  const client = useMemo(() => api ?? createAdminApi(), [api]);
  const [state, setState] = useState<AdminPageState>(INITIAL_ADMIN_PAGE_STATE);
  const controller = useMemo(() => createAdminPageController(client, channelId, setState), [client, channelId]);

  useEffect(() => {
    void controller.refresh();
  }, [controller]);

  return (
    <AdminView
      channelId={channelId}
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
      onPublishRules={(ruleSet) => void controller.publishRules(ruleSet)}
      onEditTerm={(input) => void controller.editTerm(input)}
      onEditSubjectList={(key, listKind) => void controller.editSubjectList(key, listKind)}
      onConfirmCandidate={(cardId) => void controller.confirmCandidate(cardId)}
      onRejectCandidate={(cardId) => void controller.rejectCandidate(cardId)}
      onGrantMember={(input) => void controller.grantMember(input)}
      onRevokeMember={(accountId) => void controller.revokeMember(accountId)}
      onSaveModelSettings={(settings) => void controller.saveModelSettings(settings)}
      onSaveAdminSettings={(settings) => void controller.saveAdminSettings(settings)}
      onIssueOutputGrant={() => void controller.issueOutputGrant()}
      onRevokeOutputGrant={(grantId) => void controller.revokeOutputGrant(grantId)}
      onIssueOutputToken={() => void controller.issueOutputToken()}
      onRevokeOutputToken={(tokenId) => void controller.revokeOutputToken(tokenId)}
    />
  );
}
