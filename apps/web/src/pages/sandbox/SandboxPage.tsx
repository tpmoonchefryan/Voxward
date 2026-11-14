import { useCallback, useEffect, useMemo, useState } from "react";
import { UntrustedText } from "../../components/untrusted-text";
import {
  createSandboxApi,
  type DemoRole,
  type SandboxSnapshot,
  type ScenarioId,
} from "./api";

export const SANDBOX_BANNER_TEXT = "SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）";

const ROLE_OPTIONS: readonly { readonly role: DemoRole; readonly label: string }[] = [
  { role: "DEMO_STREAMER", label: "演示主播 (DEMO_STREAMER)" },
  { role: "DEMO_MODERATOR", label: "演示房管 (DEMO_MODERATOR)" },
  { role: "DEMO_PRIVACY_AUDITOR", label: "演示隐私审计 (DEMO_PRIVACY_AUDITOR)" },
  { role: "DEMO_STAGE_VIEWER", label: "演示舞台观众 (DEMO_STAGE_VIEWER)" },
];

const SCENARIO_BUTTONS: readonly { readonly id: ScenarioId; readonly label: string }[] = [
  { id: "normal-scoring", label: "正常聊天评分" },
  { id: "spam-toxicity-block", label: "垃圾/毒性拦截" },
  { id: "superchat-translation", label: "SuperChat 精翻" },
  { id: "manual-review", label: "人工审核队列" },
  { id: "privacy-delete", label: "隐私仅删除 (DELETE)" },
  { id: "privacy-delete-and-except", label: "删除并加例外 (DELETE_AND_EXCEPT)" },
];

export interface SandboxViewProps {
  readonly role: DemoRole;
  readonly capabilities: readonly string[];
  readonly snapshot: SandboxSnapshot | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSelectRole: (role: DemoRole) => void;
  readonly onTriggerScenario: (scenario: ScenarioId) => void;
  readonly onDecideReview: (taskId: string, classification: "ALLOW" | "BLOCK") => void;
  readonly onReset: () => void;
}

export function SandboxView(props: SandboxViewProps) {
  const { role, capabilities, snapshot, loading, error, onSelectRole, onTriggerScenario, onDecideReview, onReset } = props;
  const caps = new Set(capabilities);
  const canScenario = caps.has("sandbox.scenario");
  const canPrivacyDelete = caps.has("privacy.delete");
  const canDecide = caps.has("review.decide");
  const canReset = caps.has("sandbox.reset");
  const canStage = caps.has("stage.read");
  const canLogs = caps.has("logs.read");
  const canInspectSubjects = canDecide || canLogs;

  return (
    <main>
      <div
        role="banner"
        data-testid="sandbox-banner"
        style={{ background: "#fff3cd", color: "#664d03", padding: "12px 16px", fontWeight: 700 }}
      >
        {snapshot?.banner ?? SANDBOX_BANNER_TEXT}
      </div>

      <h1>VoxWard 隔离合成演示沙盒</h1>

      <section aria-label="有限演示角色切换">
        <h2>有限演示角色（严禁生产管理员）</h2>
        <label>
          当前角色：
          <select
            aria-label="演示角色选择"
            value={role}
            onChange={(e) => onSelectRole(e.target.value as DemoRole)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.role} value={opt.role}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p data-testid="sandbox-capabilities">权限：{capabilities.join(", ") || "无"}</p>
      </section>

      <section aria-label="预设场景与重置">
        <h2>预设演示场景</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SCENARIO_BUTTONS.map((btn) => {
            const isPrivacyBtn = btn.id === "privacy-delete" || btn.id === "privacy-delete-and-except";
            const allowed = canScenario && (!isPrivacyBtn || canPrivacyDelete);
            return (
              <button
                key={btn.id}
                type="button"
                disabled={!allowed || loading}
                onClick={() => onTriggerScenario(btn.id)}
              >
                {btn.label}
              </button>
            );
          })}
          <button type="button" disabled={!canReset || loading} onClick={onReset}>
            一键重置沙盒
          </button>
        </div>
      </section>

      {error !== null ? (
        <p role="alert" data-testid="sandbox-error">
          错误：{error}
        </p>
      ) : null}

      {snapshot !== null ? (
        <>
          {canInspectSubjects ? (
            <section aria-label="评分与隐私状态">
              <h2>观众评分与隐私例外状态（内存缓存条数：{snapshot.cacheEntryCount}）</h2>
              <ul>
                {snapshot.subjects.map((sub) => (
                  <li key={sub.subjectId}>
                    <UntrustedText text={sub.subjectKey} /> — 分数：{sub.currentScore} ｜ 代次：
                    {sub.processingGeneration} ｜ 记分例外：{sub.hasException ? "是" : "否"}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canDecide ? (
            <section aria-label="人工审核队列">
              <h2>人工审核队列（{snapshot.reviewQueue.length}）</h2>
              <ul>
                {snapshot.reviewQueue.map((item) => (
                  <li key={item.taskId}>
                    <UntrustedText text={item.subjectRef} />：<UntrustedText text={item.originalText ?? ""} />{" "}
                    <button type="button" onClick={() => onDecideReview(item.taskId, "ALLOW")}>
                      放行
                    </button>
                    <button type="button" onClick={() => onDecideReview(item.taskId, "BLOCK")}>
                      拦截
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canStage ? (
            <section aria-label="舞台已批准输出">
              <h2>舞台 / 叠加层已批准输出（{snapshot.approvedStage.length}）</h2>
              <ul>
                {snapshot.approvedStage.map((item) => (
                  <li key={item.eventId}>
                    <strong>
                      <UntrustedText text={item.subjectKey} />
                    </strong>
                    ：原文「<UntrustedText text={item.text} />」
                    {item.translation !== null ? (
                      <>
                        {" "}
                        ｜ 译文「<UntrustedText text={item.translation} />」
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canInspectSubjects ? (
            <section aria-label="已拦截内容">
              <h2>已拦截内容（{snapshot.blockedItems.length}）</h2>
              <ul>
                {snapshot.blockedItems.map((item) => (
                  <li key={item.eventId}>
                    <UntrustedText text={item.subjectRef} /> [{item.classification}]：
                    <UntrustedText text={canDecide ? (item.originalText ?? "（已折叠）") : "（已折叠）"} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canLogs ? (
            <section aria-label="日志与数据请求监视">
              <h2>变更日志（{snapshot.changeLogs.length}）与技术日志（{snapshot.technicalLogs.length}）</h2>
              <ul>
                {snapshot.changeLogs.slice(0, 8).map((log) => (
                  <li key={log.id}>
                    [{log.changeKind}] <UntrustedText text={log.summary ?? ""} />
                  </li>
                ))}
              </ul>
              <h3>隐私数据请求（{snapshot.dataRequests.length}）</h3>
              <ul>
                {snapshot.dataRequests.map((req) => (
                  <li key={req.id}>
                    {req.kind} ({req.mode ?? "N/A"}) — {req.executionState}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export function SandboxPage() {
  const api = useMemo(() => createSandboxApi(), []);
  const [role, setRole] = useState<DemoRole>("DEMO_STREAMER");
  const [capabilities, setCapabilities] = useState<readonly string[]>([]);
  const [snapshot, setSnapshot] = useState<SandboxSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(
    async (targetRole: DemoRole) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getState(targetRole);
        setCapabilities(res.capabilities);
        setSnapshot(res.snapshot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "LOAD_FAILED");
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void loadState(role);
  }, [loadState, role]);

  const handleTriggerScenario = async (scenario: ScenarioId) => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.runScenario(role, scenario);
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SCENARIO_FAILED");
    } finally {
      setLoading(false);
    }
  };

  const handleDecideReview = async (taskId: string, classification: "ALLOW" | "BLOCK") => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.decideReview(role, taskId, classification);
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DECIDE_FAILED");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.reset(role);
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "RESET_FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SandboxView
      role={role}
      capabilities={capabilities}
      snapshot={snapshot}
      loading={loading}
      error={error}
      onSelectRole={(nextRole) => setRole(nextRole)}
      onTriggerScenario={(scenario) => void handleTriggerScenario(scenario)}
      onDecideReview={(taskId, classification) => void handleDecideReview(taskId, classification)}
      onReset={() => void handleReset()}
    />
  );
}
