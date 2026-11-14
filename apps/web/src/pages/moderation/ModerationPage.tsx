import type { InternalClassification } from "@voxward/contracts";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { UntrustedText } from "../../components/untrusted-text";
import {
  createModerationApi,
  moderationMessageFor,
  type ConflictNotice,
  type ModerationApi,
  type ModerationSnapshot,
} from "./api";

export interface ModerationViewProps {
  readonly channelId: string;
  readonly snapshot: ModerationSnapshot | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly conflict: ConflictNotice | null;
  readonly onDecideTask: (taskId: string, classification: InternalClassification) => void;
  readonly onReviewEvent: (eventId: string, classification: InternalClassification) => void;
  readonly onResend: (deliveryId: string) => void;
  readonly onBanSubject: (subjectRef: string) => void;
}

export function ModerationView(props: ModerationViewProps) {
  const { channelId, snapshot, loading, error, conflict } = props;
  const caps = new Set(snapshot?.capabilities ?? []);
  const canDecide = caps.has("review.decide");
  const canEditList = caps.has("list.edit");

  return (
    <main>
      <h1>房管协作审核台</h1>
      <p>
        频道 <UntrustedText text={channelId} />（远端浏览器协作，无需本地房管软件）
      </p>

      {loading ? <p>正在加载审核台…</p> : null}
      {error !== null ? (
        <p role="alert" data-testid="moderation-error">
          {error}
        </p>
      ) : null}

      {conflict !== null ? (
        <section role="alert" data-testid="moderation-conflict">
          <h2>并发裁决冲突（409）</h2>
          <p>
            该记录已被其他房管或路径处理（原因：<UntrustedText text={conflict.reason} />）。
          </p>
        </section>
      ) : null}

      {snapshot !== null ? (
        <>
          {(snapshot.faults.platformFault !== null || snapshot.faults.modelFault !== null) ? (
            <section role="alert" data-testid="moderation-fault-banner">
              <h2>系统连接故障（非违规）</h2>
              {snapshot.faults.platformFault !== null ? (
                <p>
                  平台故障：<UntrustedText text={snapshot.faults.platformFault.code} /> —{" "}
                  <UntrustedText text={snapshot.faults.platformFault.message} />
                </p>
              ) : null}
              {snapshot.faults.modelFault !== null ? (
                <p>
                  模型故障：<UntrustedText text={snapshot.faults.modelFault.code} /> —{" "}
                  <UntrustedText text={snapshot.faults.modelFault.message} />
                </p>
              ) : null}
            </section>
          ) : null}

          <section aria-label="待裁决队列">
            <h2>待裁决队列</h2>
            {snapshot.feed.reviewQueue.length === 0 ? <p>暂无待处理任务。</p> : null}
            <ul>
              {snapshot.feed.reviewQueue.map((task) => (
                <li key={task.taskId}>
                  <span>
                    <UntrustedText text={task.taskId} /> ({task.kind})：
                    {task.originalText !== null ? <UntrustedText text={task.originalText} /> : "（无正文）"}
                  </span>
                  {canDecide ? (
                    <div>
                      <button type="button" onClick={() => props.onDecideTask(task.taskId, "ALLOW_MEANINGFUL")}>
                        放行
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

          <section aria-label="实时流与已拦截复核">
            <h2>实时流与已拦截复核</h2>
            {snapshot.feed.liveStream.length === 0 ? <p>暂无消息记录。</p> : null}
            <ul>
              {snapshot.feed.liveStream.map((item) => (
                <li key={item.eventId}>
                  <div>
                    <strong>本地裁决：{item.localStatus}</strong>
                    {" | "}
                    <span>平台删除状态：{item.platformDeleteStatus}</span>
                  </div>
                  <div>
                    {item.bodyFolded ? (
                      <span data-testid="moderation-folded-body">违规正文已按权限折叠</span>
                    ) : (
                      <UntrustedText text={item.originalText ?? "（无正文）"} />
                    )}
                  </div>
                  <div>
                    {canDecide ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            props.onReviewEvent(item.eventId, item.localStatus === "BLOCK" ? "ALLOW_MEANINGFUL" : "BLOCK")
                          }
                        >
                          {item.localStatus === "BLOCK" ? "改判放行" : "改判拦截"}
                        </button>
                        {item.deliveryId !== null ? (
                          <button type="button" onClick={() => props.onResend(item.deliveryId!)}>
                            补发
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {canEditList ? (
                      <button type="button" onClick={() => props.onBanSubject(item.subjectRef)}>
                        加入频道黑名单
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

export function ModerationPage({ api }: { readonly api?: ModerationApi } = {}) {
  const { channelId = "" } = useParams();
  const client = useMemo(() => api ?? createModerationApi(), [api]);
  const [snapshot, setSnapshot] = useState<ModerationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictNotice | null>(null);

  async function refresh() {
    if (!channelId) return;
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await client.getModeration(channelId));
    } catch (err) {
      setSnapshot(null);
      setError(moderationMessageFor(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [channelId]);

  async function handleDecideTask(taskId: string, classification: InternalClassification) {
    setError(null);
    setConflict(null);
    try {
      const res = await client.decideTask(channelId, taskId, classification);
      if (res.conflict) setConflict(res);
      await refresh();
    } catch (err) {
      setError(moderationMessageFor(err));
    }
  }

  async function handleReviewEvent(eventId: string, classification: InternalClassification) {
    setError(null);
    setConflict(null);
    try {
      const res = await client.reviewEvent(channelId, eventId, {
        operationId: `mod-review-${Date.now()}`,
        classification,
      });
      if (res.conflict) setConflict(res);
      await refresh();
    } catch (err) {
      setError(moderationMessageFor(err));
    }
  }

  async function handleResend(deliveryId: string) {
    setError(null);
    setConflict(null);
    try {
      const res = await client.resendDelivery(channelId, deliveryId, `mod-resend-${Date.now()}`);
      if (res.conflict) setConflict(res);
      await refresh();
    } catch (err) {
      setError(moderationMessageFor(err));
    }
  }

  async function handleBanSubject(subjectRef: string) {
    setError(null);
    try {
      await client.editSubjectList(channelId, subjectRef, "BLACKLIST");
      await refresh();
    } catch (err) {
      setError(moderationMessageFor(err));
    }
  }

  return (
    <ModerationView
      channelId={channelId}
      snapshot={snapshot}
      loading={loading}
      error={error}
      conflict={conflict}
      onDecideTask={(taskId, c) => void handleDecideTask(taskId, c)}
      onReviewEvent={(eventId, c) => void handleReviewEvent(eventId, c)}
      onResend={(deliveryId) => void handleResend(deliveryId)}
      onBanSubject={(subjectRef) => void handleBanSubject(subjectRef)}
    />
  );
}
