import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Divider,
  EmptyState,
  EnvironmentBanner,
  Select,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { VoxWardShell, type VoxWardNavId } from "../../shell";
import type { DataApi, SubjectPanel } from "../data/api";
import { DataComplianceSurface } from "../data/DataPanel";
import type { DockApi, DockSnapshot } from "../dock/api";
import { PureDockSurface } from "../dock/DockPage";
import type { ModerationApi } from "../moderation/api";
import { ModerationWorkbench } from "../moderation/ModerationPage";
import { createInitialStageState, type StageState } from "../overlay/api";
import { StageView } from "../overlay/Stage";
import {
  createSandboxApi,
  type DemoRole,
  type SandboxApi,
  type SandboxSnapshot,
  type ScenarioId,
} from "./api";
import {
  appendBounded,
  CHAT_CADENCE_OPTIONS,
  createInitialSimulatedFeed,
  DEFAULT_CHAT_INTERVAL_MS,
  DEFAULT_SC_INTERVAL_MS,
  MAX_SIMULATED_CHATS,
  MAX_SIMULATED_SCS,
  nextSimulatedChat,
  nextSimulatedSuperChat,
  SC_INTERVAL_OPTIONS,
  type SimulatedChatEntry,
  type SimulatedScEntry,
} from "./stream-simulator";

export const SANDBOX_BANNER_TEXT = "SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）";

const DEMO_ROLES: readonly { readonly id: DemoRole; readonly label: string }[] = [
  { id: "DEMO_STREAMER", label: "主播视图" },
  { id: "DEMO_MODERATOR", label: "房管视图" },
  { id: "DEMO_PRIVACY_AUDITOR", label: "数据合规员" },
  { id: "DEMO_STAGE_VIEWER", label: "无后台访客" },
];

const SANDBOX_SCENARIOS: readonly { readonly id: ScenarioId; readonly label: string }[] = [
  { id: "normal-scoring", label: "1. 正常弹幕计分" },
  { id: "spam-toxicity-block", label: "2. 恶意与垃圾拦截" },
  { id: "superchat-translation", label: "3. SC 精翻与等级展示" },
  { id: "manual-review", label: "4. 触发人工审核队列" },
  { id: "privacy-delete", label: "5. 登记仅删数据请求" },
  { id: "privacy-delete-and-except", label: "6. 删除并加入记分例外" },
];

export interface SandboxViewProps {
  readonly role: DemoRole;
  readonly capabilities: readonly string[];
  readonly snapshot: SandboxSnapshot | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly showInlineBanner?: boolean;
  readonly simulatedChats?: readonly SimulatedChatEntry[];
  readonly simulatedScs?: readonly SimulatedScEntry[];
  readonly streamRunning?: boolean;
  readonly chatIntervalMs?: number;
  readonly scIntervalMs?: number;
  readonly nextScInSec?: number;
  readonly streamStats?: { readonly chatCount: number; readonly scCount: number };
  readonly onSelectRole: (role: DemoRole) => void;
  readonly onTriggerScenario: (scenario: ScenarioId) => void;
  readonly onDecideReview: (taskId: string, classification: "ALLOW" | "BLOCK") => void;
  readonly onReset: () => void;
  readonly onToggleStream?: () => void;
  readonly onChatIntervalChange?: (ms: number) => void;
  readonly onScIntervalChange?: (ms: number) => void;
  readonly onPushScNow?: () => void;
}

function toDockSnapshot(
  snap: SandboxSnapshot | null,
  simulatedChats: readonly SimulatedChatEntry[],
  simulatedScs: readonly SimulatedScEntry[],
  blockedFallbackIso: string,
): DockSnapshot {
  const chId = snap?.channelId ?? "ch_sandbox_1";
  const scMap = new Map<string, DockSnapshot["feed"]["approvedSc"][number]>();

  for (const item of snap?.approvedStage ?? []) {
    const hasAmount = item.amountDisplay !== undefined && item.amountDisplay !== null;
    if (!hasAmount && item.translation === null) {
      continue;
    }
    const notes = item.amountDisplay ?? "$10";
    scMap.set(item.eventId, {
      eventId: item.eventId,
      correlationId: item.correlationId,
      subjectRef: item.subjectKey,
      originalText: item.text,
      translation: item.translation,
      notes,
      acknowledgement: notes,
      safeAlias: item.subjectKey,
      decidedAt: item.decidedAt,
      deliveryId: item.eventId,
      deliveryStatus: "DELIVERED",
    });
  }

  for (const sc of simulatedScs) {
    scMap.set(sc.id, {
      eventId: sc.id,
      correlationId: sc.id,
      subjectRef: sc.author,
      originalText: sc.text,
      translation: sc.translation,
      notes: sc.amountText,
      acknowledgement: sc.amountText,
      safeAlias: sc.author,
      decidedAt: sc.decidedAt,
      deliveryId: sc.id,
      deliveryStatus: "DELIVERED",
    });
  }

  const scItems = [...scMap.values()].sort(
    (a, b) => (Date.parse(b.decidedAt) || 0) - (Date.parse(a.decidedAt) || 0),
  );

  const streamMap = new Map<string, DockSnapshot["feed"]["liveStream"][number]>();
  for (const item of snap?.approvedStage ?? []) {
    streamMap.set(item.eventId, {
      eventId: item.eventId,
      correlationId: item.correlationId,
      subjectRef: item.subjectKey,
      localStatus: "ALLOW",
      classification: "ALLOW_MEANINGFUL",
      platformDeleteStatus: "NOT_APPLICABLE",
      bodyFolded: false,
      originalText: item.text,
      decidedAt: item.decidedAt,
      deliveryId: item.eventId,
      deliveryStatus: "DELIVERED",
    });
  }
  for (const item of snap?.blockedItems ?? []) {
    streamMap.set(item.eventId, {
      eventId: item.eventId,
      correlationId: item.correlationId,
      subjectRef: item.subjectRef,
      localStatus: "BLOCK",
      classification: item.classification,
      platformDeleteStatus: "NOT_APPLICABLE",
      bodyFolded: false,
      originalText: item.originalText,
      decidedAt: blockedFallbackIso,
      deliveryId: null,
      deliveryStatus: null,
    });
  }
  for (const chat of simulatedChats) {
    streamMap.set(chat.id, {
      eventId: chat.id,
      correlationId: chat.id,
      subjectRef: chat.author,
      localStatus: "ALLOW",
      classification: "ALLOW_MEANINGFUL",
      platformDeleteStatus: "NOT_APPLICABLE",
      bodyFolded: false,
      originalText: chat.text,
      decidedAt: chat.decidedAt,
      deliveryId: chat.id,
      deliveryStatus: "DELIVERED",
    });
  }
  for (const sc of simulatedScs) {
    streamMap.set(sc.id, {
      eventId: sc.id,
      correlationId: sc.id,
      subjectRef: sc.author,
      localStatus: "ALLOW",
      classification: "ALLOW_MEANINGFUL",
      platformDeleteStatus: "NOT_APPLICABLE",
      bodyFolded: false,
      originalText: sc.text,
      decidedAt: sc.decidedAt,
      deliveryId: sc.id,
      deliveryStatus: "DELIVERED",
    });
  }

  const liveStream = [...streamMap.values()]
    .sort((a, b) => (Date.parse(b.decidedAt) || 0) - (Date.parse(a.decidedAt) || 0))
    .slice(0, 60);

  return {
    channel: { channelId: chId, displayName: "演练虚拟频道", platform: "youtube" },
    capabilities: ["queue.read", "review.decide", "message.original"],
    scTranslationEnabled: true,
    modelIssues: [],
    faults: { platformFault: null, modelFault: null },
    feed: {
      approvedSc: scItems,
      reviewQueue: (snap?.reviewQueue ?? []).map((task) => ({
        taskId: task.taskId,
        eventId: task.eventId,
        correlationId: task.correlationId,
        subjectRef: task.subjectRef,
        kind: task.kind,
        status: task.status,
        deadlineAt: new Date(Date.now() + 180_000).toISOString(),
        originalText: task.originalText,
      })),
      blockedItems: liveStream.filter((m) => m.localStatus === "BLOCK"),
      liveStream,
    },
  };
}

function toSandboxStageState(dockSnap: DockSnapshot): StageState {
  const futureValidUntil = "2099-01-01T00:00:00.000Z";
  const merged = new Map<
    string,
    {
      readonly deliveryId: string;
      readonly decidedAtMs: number;
      readonly label: string;
      readonly text: string;
      readonly translation: string | null;
    }
  >();

  for (const m of dockSnap.feed.liveStream) {
    if (m.localStatus !== "ALLOW" || m.originalText === null) continue;
    merged.set(m.eventId, {
      deliveryId: `stage-chat-${m.eventId}`,
      decidedAtMs: Date.parse(m.decidedAt) || 0,
      label: m.subjectRef,
      text: m.originalText,
      translation: null,
    });
  }

  for (const sc of dockSnap.feed.approvedSc) {
    merged.set(sc.eventId, {
      deliveryId: `stage-sc-${sc.eventId}`,
      decidedAtMs: Date.parse(sc.decidedAt) || 0,
      label: `${sc.safeAlias ?? sc.subjectRef} · ${sc.notes ?? "$20"}`,
      text: sc.originalText ?? "",
      translation: sc.translation,
    });
  }

  const ordered = [...merged.values()]
    .sort((a, b) => a.decidedAtMs - b.decidedAtMs)
    .slice(-14)
    .map((item, idx) => ({
      deliveryId: item.deliveryId,
      deliverySequence: idx + 1,
      platformOrder: idx + 1,
      validUntil: futureValidUntil,
      validUntilMs: Number.MAX_SAFE_INTEGER,
      label: item.label,
      text: item.text,
      translation: item.translation,
    }));

  return {
    ...createInitialStageState("connected"),
    activeDeliveries: ordered,
  };
}

export function SandboxView({
  role,
  capabilities,
  snapshot,
  loading,
  error,
  showInlineBanner = true,
  simulatedChats = [],
  simulatedScs = [],
  streamRunning = true,
  chatIntervalMs = DEFAULT_CHAT_INTERVAL_MS,
  scIntervalMs = DEFAULT_SC_INTERVAL_MS,
  nextScInSec = 8,
  streamStats = { chatCount: simulatedChats.length, scCount: simulatedScs.length },
  onSelectRole,
  onTriggerScenario,
  onDecideReview,
  onReset,
  onToggleStream,
  onChatIntervalChange,
  onScIntervalChange,
  onPushScNow,
}: SandboxViewProps) {
  const [tab, setTab] = useState<string>("moderation");
  const caps = useMemo(() => new Set(capabilities), [capabilities]);
  const canModerate = caps.has("review.decide") || caps.has("queue.read");
  const canPrivacy = caps.has("privacy.delete");
  const canStage = caps.has("stage.read") || role === "DEMO_STAGE_VIEWER";

  const blockedFallbackIso = useMemo(() => {
    void snapshot;
    return new Date().toISOString();
  }, [snapshot]);

  const dockSnap = useMemo(
    () => toDockSnapshot(snapshot, simulatedChats, simulatedScs, blockedFallbackIso),
    [snapshot, simulatedChats, simulatedScs, blockedFallbackIso],
  );
  const sandboxStageState = useMemo(() => toSandboxStageState(dockSnap), [dockSnap]);

  const sandboxDockApi: DockApi = useMemo(
    () => ({
      getDock: async () => dockSnap,
      toggleScTranslation: async () => ({ scTranslationEnabled: true }),
      decideTask: async (_cid, taskId, classification) => {
        onDecideReview(taskId, classification === "BLOCK" ? "BLOCK" : "ALLOW");
        return { conflict: false, status: "DECIDED" };
      },
      reviewEvent: async () => ({ conflict: false, status: "DECIDED" }),
      resendDelivery: async () => ({ conflict: false, status: "RESENT" }),
    }),
    [dockSnap, onDecideReview],
  );

  const sandboxModerationApi: ModerationApi = useMemo(
    () => ({
      getModeration: sandboxDockApi.getDock,
      decideTask: async (_cid, taskId, input) => sandboxDockApi.decideTask(_cid, taskId, input.classification),
      reviewEvent: sandboxDockApi.reviewEvent,
      resendDelivery: sandboxDockApi.resendDelivery,
      editSubjectList: async () => ({ status: "OK" }),
      editTerm: async () => ({ status: "OK" }),
      listCandidates: async () => [],
      confirmCandidate: async () => {
        throw new Error("SANDBOX_READONLY_CANDIDATE");
      },
      rejectCandidate: async () => {
        throw new Error("SANDBOX_READONLY_CANDIDATE");
      },
      listTermCategories: async () => [
        { code: "spam", label: "垃圾刷屏", listKind: "BLACKLIST", description: "", createdAt: "" },
      ],
      appendBlacklistTerm: async () => {},
    }),
    [sandboxDockApi],
  );

  const sandboxDataApi: DataApi = useMemo(
    () => ({
      capabilities: async () => ({ dataHandle: canPrivacy }),
      subject: async (_cid, subjectRef): Promise<SubjectPanel> => {
        const sub =
          snapshot?.subjects.find((s) => s.subjectKey === subjectRef || s.subjectId === subjectRef) ??
          snapshot?.subjects[0];
        return {
          subjectRef: sub?.subjectKey ?? subjectRef,
          currentScore: sub?.currentScore ?? 100,
          identity: { kind: "SYNTHETIC", effectiveFrom: new Date().toISOString() },
          list: null,
          exception: sub?.hasException
            ? { active: true, createdAt: new Date().toISOString() }
            : null,
          ledgerEntryCount: 1,
          retention: [{ category: "沙盒合成积分流水", count: 1, retentionDays: 30 }],
          requests: (snapshot?.dataRequests ?? []).map((r) => {
            const nowStr = new Date().toISOString();
            return {
              requestId: r.id,
              subjectRef: r.subjectId,
              kind: "DELETE" as const,
              mode:
                r.mode === "DELETE_AND_EXCEPT"
                  ? ("DELETE_AND_EXCEPT" as const)
                  : ("DELETE_DATA_ONLY" as const),
              requestSource: "OPERATOR_INITIATED" as const,
              verification: { state: "PENDING" as const, method: null, decidedAt: null },
              execution: r.executionState,
              stage: r.executionState,
              targets: [],
              counts: {
                done: 0,
                failed: 0,
                pending: r.executionState === "AWAITING_EXECUTION" ? 1 : 0,
              },
              createdAt: nowStr,
              updatedAt: nowStr,
            };
          }),
          notices: ["PROVIDER_COPY_NOT_CONTROLLED"],
        };
      },
      register: async (_cid, input) => {
        onTriggerScenario(
          input.mode === "DELETE_AND_EXCEPT" ? "privacy-delete-and-except" : "privacy-delete",
        );
        const nowStr = new Date().toISOString();
        return {
          requestId: `req-sb-${Date.now()}`,
          subjectRef: input.subjectRef,
          kind: input.kind,
          mode: input.mode ?? "DELETE_DATA_ONLY",
          requestSource: input.requestSource,
          verification: { state: "PENDING", method: null, decidedAt: null },
          execution: "PENDING",
          stage: "AWAITING_VERIFICATION",
          targets: [],
          counts: { done: 0, failed: 0, pending: 0 },
          createdAt: nowStr,
          updatedAt: nowStr,
        };
      },
      decideVerification: async (_cid, requestId) => {
        const nowStr = new Date().toISOString();
        return {
          requestId,
          subjectRef: snapshot?.subjects[0]?.subjectKey ?? "sb_user_1",
          kind: "DELETE",
          mode: "DELETE_DATA_ONLY",
          requestSource: "OPERATOR_INITIATED",
          verification: {
            state: "VERIFIED",
            method: "ACCOUNT_OWNERSHIP",
            decidedAt: nowStr,
          },
          execution: "QUEUED",
          stage: "AWAITING_EXECUTION",
          targets: [],
          counts: { done: 0, failed: 0, pending: 1 },
          createdAt: nowStr,
          updatedAt: nowStr,
        };
      },
    }),
    [canPrivacy, onTriggerScenario, snapshot],
  );

  return (
    <main className="vw-stack-lg" aria-label="演示沙盒工作区">
      {showInlineBanner ? (
        <EnvironmentBanner
          label={SANDBOX_BANNER_TEXT}
          state={{ state: "local_only", label: "合成环境" }}
          tone="warning"
          locale="zh-CN"
        />
      ) : null}
      {error ? <BannerNotice tone="danger">{error}</BannerNotice> : null}

      <section className="vw-panel-card" aria-label="沙盒演示控制台">
        <div className="vw-row-between">
          <strong>当前角色与合成情景控制台</strong>
          <div className="vw-row-wrap">
            <Badge tone="accent">{DEMO_ROLES.find((r) => r.id === role)?.label ?? role}</Badge>
            <Button size="sm" variant="secondary" disabled={loading} onClick={onReset}>
              一键重置沙盒状态
            </Button>
          </div>
        </div>

        <div className="vw-row-wrap" role="group" aria-label="演示角色切换">
          {DEMO_ROLES.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={role === item.id ? "primary" : "secondary"}
              disabled={loading}
              onClick={() => onSelectRole(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="vw-row-wrap" role="group" aria-label="预设业务演示场景">
          {SANDBOX_SCENARIOS.map((sc) => {
            const isPrivacyScenario =
              sc.id === "privacy-delete" || sc.id === "privacy-delete-and-except";
            const scenarioDisabled =
              loading || role === "DEMO_STAGE_VIEWER" || (isPrivacyScenario && !canPrivacy);
            return (
              <Button
                key={sc.id}
                size="sm"
                variant="quiet"
                disabled={scenarioDisabled}
                disabledReason={
                  role === "DEMO_STAGE_VIEWER"
                    ? "仅舞台访客角色无权触发后台剧情"
                    : isPrivacyScenario && !canPrivacy
                      ? "当前演练角色缺少数据合规处理权限"
                      : undefined
                }
                onClick={() => onTriggerScenario(sc.id)}
              >
                {sc.label}
              </Button>
            );
          })}
        </div>

        <Divider />

        <div className="vw-stack-sm" data-sandbox-stream-controls="">
          <div className="vw-row-between">
            <div className="vw-row-wrap">
              <strong>实时弹幕流模拟器</strong>
              <Badge
                tone={streamRunning ? "positive" : "neutral"}
                data-stream-status={streamRunning ? "running" : "paused"}
              >
                {`${streamRunning ? "弹幕流运行中" : "弹幕流已暂停"} · 弹幕 ${streamStats.chatCount} / SC ${streamStats.scCount}`}
              </Badge>
              {streamRunning ? (
                <span className="vw-caption">{`约 ${nextScInSec} 秒后进下一条 SC`}</span>
              ) : null}
            </div>
            <div className="vw-row-wrap">
              <Button
                size="sm"
                variant={streamRunning ? "secondary" : "primary"}
                data-stream-toggle=""
                onClick={() => onToggleStream?.()}
              >
                {streamRunning ? "暂停弹幕流" : "继续弹幕流"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                data-stream-push-sc=""
                onClick={() => onPushScNow?.()}
              >
                + 立即进一条 SC
              </Button>
            </div>
          </div>

          <div className="vw-input-action-row">
            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor="sbx-chat-cadence">
                弹幕频率
              </label>
              <Select
                id="sbx-chat-cadence"
                value={String(chatIntervalMs)}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(next)) onChatIntervalChange?.(next);
                }}
                options={CHAT_CADENCE_OPTIONS.map((opt) => ({
                  value: String(opt.value),
                  label: opt.label,
                }))}
              />
            </div>

            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor="sbx-sc-interval">
                SC 进场间隔
              </label>
              <Select
                id="sbx-sc-interval"
                value={String(scIntervalMs)}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(next)) onScIntervalChange?.(next);
                }}
                options={SC_INTERVAL_OPTIONS.map((opt) => ({
                  value: String(opt.value),
                  label: opt.label,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      {role === "DEMO_STAGE_VIEWER" ? (
        <div className="vw-stack-md">
          <section className="vw-panel-card">
            <EmptyState
              tone="warning"
              title="后台功能已按当前角色策略拒止"
              description="「无后台访客」仅拥有公开舞台只读视角；审阅裁决、数据导出及情景触发能力均已禁用。如需体验正式管理员或房管界面，请在顶部横幅切换示范角色。"
            />
          </section>
          {canStage ? (
            <PureDockSurface
              channelId={dockSnap.channel.channelId}
              api={sandboxDockApi}
              initialSnapshot={dockSnap}
              pollIntervalMs={30000}
            />
          ) : null}
        </div>
      ) : (
        <SectionTabs
          label="沙盒复用的正式业务工作台"
          selectedId={tab}
          onSelect={setTab}
          items={[
            { id: "moderation", label: "正式审核工作台视图" },
            { id: "dock", label: "纯净弹幕姬预览" },
            { id: "overlay", label: "OBS 投屏实时预览" },
            { id: "data", label: "数据合规工作台视图" },
            { id: "subjects", label: "沙盒积分与日志快照" },
          ]}
        >
          {tab === "moderation" ? (
            canModerate ? (
              <ModerationWorkbench
                channelId={dockSnap.channel.channelId}
                api={sandboxModerationApi}
                initialSnapshot={dockSnap}
                pollIntervalMs={30000}
              />
            ) : (
              <div className="vw-panel-card">
                <EmptyState
                  tone="warning"
                  title="当前演练角色不具备审核裁决权限"
                  description="当前选择的是数据合规员角色；请切回「主播视图」或「房管视图」体验审核工作台。"
                />
              </div>
            )
          ) : tab === "dock" ? (
            <PureDockSurface
              channelId={dockSnap.channel.channelId}
              api={sandboxDockApi}
              initialSnapshot={dockSnap}
              pollIntervalMs={30000}
            />
          ) : tab === "overlay" ? (
            <div className="vw-obs-preview-frame" data-sandbox-obs-preview="">
              <StageView state={sandboxStageState} previewMode />
            </div>
          ) : tab === "data" ? (
            <DataComplianceSurface
              channelId={dockSnap.channel.channelId}
              api={sandboxDataApi}
              forceDataHandle={canPrivacy}
            />
          ) : (
            <div className="vw-stack-md">
              <section className="vw-panel-card">
                <strong>演练观众当前信任分（合成内存态）</strong>
                <TableShell
                  label="演练观众积分表"
                  columns={[
                    { key: "subject", label: "观众标识" },
                    { key: "score", label: "信任分" },
                    { key: "gen", label: "状态代数" },
                    { key: "exception", label: "例外状态" },
                  ]}
                  rows={(snapshot?.subjects ?? []).map((s) => ({
                    subject: <UntrustedText text={s.subjectKey} />,
                    score: s.currentScore,
                    gen: s.processingGeneration,
                    exception: s.hasException ? "加入记分例外" : "正常计分",
                  }))}
                  emptyState={<EmptyState title="暂无演示观众数据" />}
                />
              </section>
            </div>
          )}
        </SectionTabs>
      )}
    </main>
  );
}

export function SandboxPage({ api }: { readonly api?: SandboxApi }) {
  const client = useMemo(() => api ?? createSandboxApi(), [api]);
  const [role, setRole] = useState<DemoRole>("DEMO_STREAMER");
  const [capabilities, setCapabilities] = useState<readonly string[]>([
    "sandbox.scenario",
    "review.decide",
    "stage.read",
  ]);
  const [snapshot, setSnapshot] = useState<SandboxSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialFeed = useMemo(() => createInitialSimulatedFeed(), []);
  const [simulatedChats, setSimulatedChats] = useState<readonly SimulatedChatEntry[]>(
    () => initialFeed.chats,
  );
  const [simulatedScs, setSimulatedScs] = useState<readonly SimulatedScEntry[]>(
    () => initialFeed.scs,
  );
  const [streamRunning, setStreamRunning] = useState(true);
  const [chatIntervalMs, setChatIntervalMs] = useState(DEFAULT_CHAT_INTERVAL_MS);
  const [scIntervalMs, setScIntervalMs] = useState(DEFAULT_SC_INTERVAL_MS);
  const [nextScInSec, setNextScInSec] = useState(() => Math.ceil(DEFAULT_SC_INTERVAL_MS / 1000));
  const [streamStats, setStreamStats] = useState(() => ({
    chatCount: initialFeed.chats.length,
    scCount: initialFeed.scs.length,
  }));

  const chatSeqRef = useRef(initialFeed.nextChatSeq);
  const scSeqRef = useRef(initialFeed.nextScSeq);
  const nextScAtRef = useRef(0);

  const pushNextSc = useCallback((nowMs: number, intervalMs: number) => {
    const seq = scSeqRef.current;
    scSeqRef.current += 1;
    const entry = nextSimulatedSuperChat(seq, nowMs);
    setSimulatedScs((prev) => appendBounded(prev, entry, MAX_SIMULATED_SCS));
    setStreamStats((prev) => ({ ...prev, scCount: prev.scCount + 1 }));
    nextScAtRef.current = nowMs + intervalMs;
    setNextScInSec(Math.max(1, Math.ceil(intervalMs / 1000)));
  }, []);

  useEffect(() => {
    if (!streamRunning) {
      return;
    }
    const timer = window.setInterval(() => {
      const nowMs = Date.now();
      const seq = chatSeqRef.current;
      chatSeqRef.current += 1;
      const entry = nextSimulatedChat(seq, nowMs);
      setSimulatedChats((prev) => appendBounded(prev, entry, MAX_SIMULATED_CHATS));
      setStreamStats((prev) => ({ ...prev, chatCount: prev.chatCount + 1 }));
    }, chatIntervalMs);
    return () => window.clearInterval(timer);
  }, [streamRunning, chatIntervalMs]);

  useEffect(() => {
    if (!streamRunning) {
      return;
    }
    if (nextScAtRef.current <= Date.now()) {
      const nowMs = Date.now();
      nextScAtRef.current = nowMs + scIntervalMs;
      setNextScInSec(Math.max(1, Math.ceil(scIntervalMs / 1000)));
    }
    const timer = window.setInterval(() => {
      const nowMs = Date.now();
      const remainingMs = nextScAtRef.current - nowMs;
      if (remainingMs <= 80) {
        pushNextSc(nowMs, scIntervalMs);
        return;
      }
      setNextScInSec(Math.max(1, Math.ceil(remainingMs / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [streamRunning, scIntervalMs, pushNextSc]);

  const loadState = useCallback(
    async (targetRole: DemoRole) => {
      setLoading(true);
      try {
        const next = await client.getState(targetRole);
        setRole(next.role);
        setCapabilities(next.capabilities);
        setSnapshot(next.snapshot);
        setError(null);
      } catch {
        setError("无法连接本地演示沙盒引擎，请确认沙盒服务已运行。");
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  useEffect(() => {
    void loadState("DEMO_STREAMER");
  }, [loadState]);

  const handleSelectRole = async (nextRole: DemoRole) => {
    await loadState(nextRole);
  };

  const handleTriggerScenario = async (scenario: ScenarioId) => {
    setLoading(true);
    try {
      const nextSnap = await client.runScenario(role, scenario);
      setSnapshot(nextSnap);
      setError(null);
    } catch {
      setError("触发演示场景失败。");
    } finally {
      setLoading(false);
    }
  };

  const handleDecideReview = async (taskId: string, classification: "ALLOW" | "BLOCK") => {
    setLoading(true);
    try {
      const nextSnap = await client.decideReview(role, taskId, classification);
      setSnapshot(nextSnap);
      setError(null);
    } catch {
      setError("演示审阅提交失败。");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const nextSnap = await client.reset(role);
      setSnapshot(nextSnap);
      const resetFeed = createInitialSimulatedFeed();
      chatSeqRef.current = resetFeed.nextChatSeq;
      scSeqRef.current = resetFeed.nextScSeq;
      nextScAtRef.current = Date.now() + scIntervalMs;
      setSimulatedChats(resetFeed.chats);
      setSimulatedScs(resetFeed.scs);
      setStreamStats({
        chatCount: resetFeed.chats.length,
        scCount: resetFeed.scs.length,
      });
      setNextScInSec(Math.max(1, Math.ceil(scIntervalMs / 1000)));
      setError(null);
    } catch {
      setError("重置沙盒失败。");
    } finally {
      setLoading(false);
    }
  };

  const overrideDisabledIds: Partial<Record<VoxWardNavId, string>> =
    role === "DEMO_STAGE_VIEWER"
      ? {
          moderation: "仅舞台访客角色无后台审核权限",
          blocked: "仅舞台访客角色无拦截管理权限",
          data: "仅舞台访客角色无数据合规权限",
          logs: "仅舞台访客角色无审计日志权限",
          integrations: "仅舞台访客角色无集成管理权限",
          users: "仅舞台访客角色无成员管理权限",
          settings: "仅舞台访客角色无系统设置权限",
        }
      : {};

  return (
    <VoxWardShell
      activeNavId="sandbox"
      showChannelSelector={false}
      overrideDisabledIds={overrideDisabledIds}
      topBanner={
        <EnvironmentBanner
          label={SANDBOX_BANNER_TEXT}
          state={{ state: "local_only", label: "合成环境" }}
          tone="warning"
          locale="zh-CN"
        />
      }
      pageTitle="交互演练沙盒"
      pageDescription="直接复用 VoxWard 正式工作台页面演练审核、SC 精翻、评分重判、数据清理及四角色权限收敛。"
    >
      <SandboxView
        role={role}
        capabilities={capabilities}
        snapshot={snapshot}
        loading={loading}
        error={error}
        showInlineBanner={false}
        simulatedChats={simulatedChats}
        simulatedScs={simulatedScs}
        streamRunning={streamRunning}
        chatIntervalMs={chatIntervalMs}
        scIntervalMs={scIntervalMs}
        nextScInSec={nextScInSec}
        streamStats={streamStats}
        onSelectRole={(r) => void handleSelectRole(r)}
        onTriggerScenario={(s) => void handleTriggerScenario(s)}
        onDecideReview={(id, cls) => void handleDecideReview(id, cls)}
        onReset={() => void handleReset()}
        onToggleStream={() => setStreamRunning((prev) => !prev)}
        onChatIntervalChange={(ms) => setChatIntervalMs(ms)}
        onScIntervalChange={(ms) => {
          setScIntervalMs(ms);
          nextScAtRef.current = Date.now() + ms;
          setNextScInSec(Math.max(1, Math.ceil(ms / 1000)));
        }}
        onPushScNow={() => pushNextSc(Date.now(), scIntervalMs)}
      />
    </VoxWardShell>
  );
}
