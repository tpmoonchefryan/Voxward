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
  type ModelSettingsResponseView,
  type OutputsSummaryView,
  type RuleIssueView,
  type RulesStateView,
} from "./api";

export interface AdminViewProps {
  readonly channelId: string;
  readonly channels: readonly ChannelSummary[];
  readonly context: ChannelContextView | null;
  readonly rules: RulesStateView | null;
  readonly ruleIssues: readonly RuleIssueView[];
  readonly candidates: readonly CandidateCardView[];
  readonly members: readonly MemberView[];
  readonly modelSettings: ModelSettingsResponseView | null;
  readonly adminSettings: AdminSettingsView | null;
  readonly outputs: OutputsSummaryView | null;
  readonly error: string | null;
  readonly onConfirmCandidate: (cardId: string) => void;
  readonly onRejectCandidate: (cardId: string) => void;
  readonly onRevokeMember: (accountId: string) => void;
}

export function AdminView(props: AdminViewProps) {
  const { channelId, channels, context, rules, ruleIssues, candidates, members, modelSettings, adminSettings, outputs, error } = props;
  const caps = new Set(context?.capabilities ?? []);

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

          {caps.has("queue.read") || caps.has("list.edit") || caps.has("score.config") ? (
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
                    {caps.has("list.edit") && card.status === "PENDING_CONFIRMATION" ? (
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
            </section>
          ) : null}

          {caps.has("score.config") && modelSettings !== null ? (
            <section aria-label="模型配置">
              <h2>模型配置（Q48）</h2>
              <p>
                适配器：<UntrustedText text={modelSettings.capabilities.providerName} />（SC 精翻：
                {modelSettings.settings.scTranslationEnabled ? "开启" : "关闭"}）
              </p>
              {modelSettings.issues.length > 0 ? (
                <ul data-testid="model-issues">
                  {modelSettings.issues.map((issue, idx) => (
                    <li key={`${issue.code}-${idx}`}>
                      {issue.code} ({issue.path})
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {caps.has("score.config") && adminSettings !== null ? (
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
            </section>
          ) : null}

          {(caps.has("output.manage") || caps.has("tokens.manage")) && outputs !== null ? (
            <section aria-label="输出端配置">
              <h2>输出端与只读凭据</h2>
              <p>
                原生输出授权：{outputs.grants.length} 个 | 只读输出令牌：{outputs.tokens.length} 个
              </p>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export function AdminPage({ api }: { readonly api?: AdminApi } = {}) {
  const { channelId = "" } = useParams();
  const client = useMemo(() => api ?? createAdminApi(), [api]);
  const [channels, setChannels] = useState<readonly ChannelSummary[]>([]);
  const [context, setContext] = useState<ChannelContextView | null>(null);
  const [rules, setRules] = useState<RulesStateView | null>(null);
  const [ruleIssues, setRuleIssues] = useState<readonly RuleIssueView[]>([]);
  const [candidates, setCandidates] = useState<readonly CandidateCardView[]>([]);
  const [members, setMembers] = useState<readonly MemberView[]>([]);
  const [modelSettings, setModelSettings] = useState<ModelSettingsResponseView | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettingsView | null>(null);
  const [outputs, setOutputs] = useState<OutputsSummaryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      if (!channelId) {
        setChannels(await client.listChannels());
        setContext(null);
        return;
      }
      const ctx = await client.getContext(channelId);
      setContext(ctx);
      const caps = new Set(ctx.capabilities);
      if (caps.has("queue.read") || caps.has("list.edit") || caps.has("score.config")) {
        setRules(await client.getRules(channelId));
      }
      if (caps.has("queue.read")) setCandidates(await client.listCandidates(channelId));
      if (caps.has("members.manage")) setMembers(await client.listMembers(channelId));
      if (caps.has("score.config")) {
        setModelSettings(await client.getModelSettings(channelId));
        setAdminSettings(await client.getAdminSettings(channelId));
      }
      if (caps.has("output.manage") || caps.has("tokens.manage")) {
        setOutputs(await client.getOutputs(channelId));
      }
    } catch (err) {
      if (err instanceof AdminApiFailure && err.issues !== undefined) setRuleIssues(err.issues);
      setError(adminMessageFor(err));
    }
  }

  useEffect(() => {
    void refresh();
  }, [channelId]);

  return (
    <AdminView
      channelId={channelId}
      channels={channels}
      context={context}
      rules={rules}
      ruleIssues={ruleIssues}
      candidates={candidates}
      members={members}
      modelSettings={modelSettings}
      adminSettings={adminSettings}
      outputs={outputs}
      error={error}
      onConfirmCandidate={(cardId) => void client.confirmCandidate(channelId, cardId).then(() => refresh())}
      onRejectCandidate={(cardId) => void client.rejectCandidate(channelId, cardId).then(() => refresh())}
      onRevokeMember={(accountId) => void client.revokeMember(channelId, accountId).then(() => refresh())}
    />
  );
}
