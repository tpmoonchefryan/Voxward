import type { InternalClassification } from "@voxward/contracts";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { UntrustedText } from "../../components/untrusted-text";
import {
  createDockApi,
  dockMessageFor,
  type ConflictNotice,
  type DockApi,
  type DockSnapshot,
  type ModerationItemView,
} from "./api";

const PLATFORM_DELETE_LABEL: Readonly<Record<string, string>> = {
  PENDING: "平台删除中",
  DELETED: "平台已删除",
  FAILED: "平台删除失败",
  UNKNOWN: "平台状态未知",
  NOT_APPLICABLE: "不适用",
};

export interface DockViewProps {
  readonly roomId: string;
  readonly snapshot: DockSnapshot | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly conflict: ConflictNotice | null;
  readonly onToggleSc: (enabled: boolean) => void;
  readonly onDecideTask: (taskId: string, classification: InternalClassification) => void;
  readonly onReviewEvent: (eventId: string, classification: InternalClassification) => void;
  readonly onResend: (deliveryId: string) => void;
}

export function FoldableBody({
  item,
  canViewOriginal,
  testId = "folded-body",
  defaultExpanded = false,
}: {
  readonly item: ModerationItemView;
  readonly canViewOriginal: boolean;
  readonly testId?: string;
  readonly defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!item.bodyFolded) {
    return <UntrustedText text={item.originalText ?? "（无正文）"} />;
  }
  if (!canViewOriginal || item.originalText === null) {
    return <span data-testid={testId}>违规正文已按权限折叠（缺少 message.original 权限）</span>;
  }
  return (
    <span>
      {expanded ? (
        <>
          <UntrustedText text={item.originalText} />{" "}
          <button type="button" onClick={() => setExpanded(false)}>
            收起原文
          </button>
        </>
      ) : (
        <>
          <span data-testid={testId}>违规正文已默认折叠</span>{" "}
          <button type="button" onClick={() => setExpanded(true)}>
            展开原文
          </button>
        </>
      )}
    </span>
  );
}

export function DockView(props: DockViewProps) {
  const { roomId, snapshot, loading, error, conflict } = props;
  const caps = new Set(snapshot?.capabilities ?? []);
  const canDecide = caps.has("review.decide");
  const canViewOriginal = caps.has("message.original");

  return (
    <main>
      <h1>主播副屏 Dock</h1>
      <p>
        房间 <UntrustedText text={roomId} />
      </p>

      {loading ? <p>正在加载频道数据…</p> : null}
      {error !== null ? (
        <p role="alert" data-testid="dock-error">
          {error}
        </p>
      ) : null}

      {conflict !== null ? (
        <section role="alert" data-testid="dock-conflict">
          <h2>并发冲突提示</h2>
          <p>
            其他房管或处理路径已先完成裁决（原因：<UntrustedText text={conflict.reason} />）。请以当前最新状态为准。
          </p>
        </section>
      ) : null}

      {snapshot !== null ? (
        <>
          {(snapshot.faults.platformFault !== null ||
            snapshot.faults.modelFault !== null ||
            snapshot.modelIssues.length > 0) ? (
            <section role="alert" data-testid="system-fault-banner">
              <h2>系统与连接故障（非内容违规）</h2>
              {snapshot.faults.platformFault !== null ? (
                <p>
                  平台连接故障（<UntrustedText text={snapshot.faults.platformFault.code} />）：
                  <UntrustedText text={snapshot.faults.platformFault.message} />
                </p>
              ) : null}
              {snapshot.faults.modelFault !== null ? (
                <p>
                  模型服务故障（<UntrustedText text={snapshot.faults.modelFault.code} />）：
                  <UntrustedText text={snapshot.faults.modelFault.message} />
                </p>
              ) : null}
              {snapshot.modelIssues.length > 0 ? (
                <p>模型配置存在 {snapshot.modelIssues.length} 项未就绪问题，不会伪装为观众违规。</p>
              ) : null}
            </section>
          ) : null}

          <section aria-label="SC 精翻控制">
            <h2>SC 精翻开关</h2>
            <p>当前状态：{snapshot.scTranslationEnabled ? "已开启" : "已关闭"}（关闭仅停止精翻，不停止安全审核）</p>
            {canDecide || caps.has("score.config") ? (
              <button
                type="button"
                onClick={() => props.onToggleSc(!snapshot.scTranslationEnabled)}
              >
                {snapshot.scTranslationEnabled ? "关闭 SC 精翻" : "开启 SC 精翻"}
              </button>
            ) : null}
          </section>

          <section aria-label="获准 SC">
            <h2>获准 Super Chat</h2>
            {snapshot.feed.approvedSc.length === 0 ? <p>暂无获准 SC。</p> : null}
            <ul>
              {snapshot.feed.approvedSc.map((item) => (
                <li key={item.eventId}>
                  <div>
                    <strong>观众原文：</strong>
                    {item.originalText !== null ? <UntrustedText text={item.originalText} /> : "（无正文）"}
                  </div>
                  {item.translation !== null ? (
                    <div>
                      <strong>AI 精翻（辅助）：</strong>
                      <UntrustedText text={item.translation} />
                    </div>
                  ) : null}
                  {item.notes !== null ? (
                    <div>
                      <strong>梗注：</strong>
                      <UntrustedText text={item.notes} />
                    </div>
                  ) : null}
                  {item.acknowledgement !== null ? (
                    <div>
                      <strong>答谢句：</strong>
                      <UntrustedText text={item.acknowledgement} />
                    </div>
                  ) : null}
                  {item.safeAlias !== null ? (
                    <div>
                      <strong>安全称呼读音：</strong>
                      <UntrustedText text={item.safeAlias} />
                    </div>
                  ) : null}
                  {canDecide && item.deliveryId !== null ? (
                    <button type="button" onClick={() => props.onResend(item.deliveryId!)}>
                      补发输出
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="审核队列">
            <h2>审核队列</h2>
            {snapshot.feed.reviewQueue.length === 0 ? <p>队列为空。</p> : null}
            <ul>
              {snapshot.feed.reviewQueue.map((task) => (
                <li key={task.taskId}>
                  <span>
                    任务 <UntrustedText text={task.taskId} />（{task.kind} / {task.status}）：
                    {task.originalText !== null ? <UntrustedText text={task.originalText} /> : "（无正文）"}
                  </span>
                  {canDecide ? (
                    <div>
                      <button type="button" onClick={() => props.onDecideTask(task.taskId, "ALLOW_MEANINGFUL")}>
                        放行（有意义）
                      </button>
                      <button type="button" onClick={() => props.onDecideTask(task.taskId, "ALLOW_NOISE")}>
                        放行（普通）
                      </button>
                      <button type="button" onClick={() => props.onDecideTask(task.taskId, "BLOCK")}>
                        拦截
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="实时流">
            <h2>实时流</h2>
            {snapshot.feed.liveStream.length === 0 ? <p>暂无实时流消息。</p> : null}
            <ul>
              {snapshot.feed.liveStream.map((item) => (
                <li key={item.eventId}>
                  <div>
                    <span>本地状态：{item.localStatus}</span>
                    {" | "}
                    <span>分类：{item.classification}</span>
                    {item.localStatus === "BLOCK" ? (
                      <>
                        {" | "}
                        <span>平台状态：{PLATFORM_DELETE_LABEL[item.platformDeleteStatus] ?? item.platformDeleteStatus}</span>
                      </>
                    ) : null}
                  </div>
                  <div>
                    <FoldableBody item={item} canViewOriginal={canViewOriginal} testId="live-folded-body" />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="已拦截复核">
            <h2>已拦截复核</h2>
            {snapshot.feed.blockedItems.length === 0 ? <p>暂无已拦截消息。</p> : null}
            <ul>
              {snapshot.feed.blockedItems.map((item) => (
                <li key={item.eventId}>
                  <div>
                    <span>本地状态：{item.localStatus}</span>
                    {" | "}
                    <span>平台状态：{PLATFORM_DELETE_LABEL[item.platformDeleteStatus] ?? item.platformDeleteStatus}</span>
                  </div>
                  <div>
                    <FoldableBody item={item} canViewOriginal={canViewOriginal} testId="folded-body" />
                  </div>
                  {canDecide ? (
                    <button type="button" onClick={() => props.onReviewEvent(item.eventId, "ALLOW_MEANINGFUL")}>
                      改判放行
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

export function DockPage({ api }: { readonly api?: DockApi } = {}) {
  const { roomId = "" } = useParams();
  const client = useMemo(() => api ?? createDockApi(), [api]);
  const [snapshot, setSnapshot] = useState<DockSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictNotice | null>(null);

  async function refresh() {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await client.getDock(roomId));
    } catch (err) {
      setSnapshot(null);
      setError(dockMessageFor(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [roomId]);

  async function handleToggleSc(enabled: boolean) {
    setError(null);
    try {
      await client.toggleScTranslation(roomId, enabled);
      await refresh();
    } catch (err) {
      setError(dockMessageFor(err));
    }
  }

  async function handleDecideTask(taskId: string, classification: InternalClassification) {
    setError(null);
    setConflict(null);
    try {
      const res = await client.decideTask(roomId, taskId, classification);
      if (res.conflict) setConflict(res);
      await refresh();
    } catch (err) {
      setError(dockMessageFor(err));
    }
  }

  async function handleReviewEvent(eventId: string, classification: InternalClassification) {
    setError(null);
    setConflict(null);
    try {
      const res = await client.reviewEvent(roomId, eventId, {
        operationId: `dock-review-${Date.now()}`,
        classification,
      });
      if (res.conflict) setConflict(res);
      await refresh();
    } catch (err) {
      setError(dockMessageFor(err));
    }
  }

  async function handleResend(deliveryId: string) {
    setError(null);
    setConflict(null);
    try {
      const res = await client.resendDelivery(roomId, deliveryId, `dock-resend-${Date.now()}`);
      if (res.conflict) setConflict(res);
      await refresh();
    } catch (err) {
      setError(dockMessageFor(err));
    }
  }

  return (
    <DockView
      roomId={roomId}
      snapshot={snapshot}
      loading={loading}
      error={error}
      conflict={conflict}
      onToggleSc={(enabled) => void handleToggleSc(enabled)}
      onDecideTask={(taskId, c) => void handleDecideTask(taskId, c)}
      onReviewEvent={(eventId, c) => void handleReviewEvent(eventId, c)}
      onResend={(deliveryId) => void handleResend(deliveryId)}
    />
  );
}
