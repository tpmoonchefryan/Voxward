import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import type { InternalClassification } from "@voxward/contracts";
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Select,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { SuperChatCard, SuperChatOverlayBar } from "../../components/youtube-sc";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import {
  createModerationApi,
  moderationMessageFor,
  type CandidateCardView,
  type ModerationApi,
  type ModerationSnapshot,
  type TermCategoryView,
} from "./api";

function nextOpId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function classificationLabel(code: string): string {
  switch (code) {
    case "ALLOW_MEANINGFUL":
      return "恢复积分放行";
    case "ALLOW_NOISE":
      return "不加分放行";
    case "BLOCK":
      return "已确认拦截";
    default:
      return "处理完成";
  }
}

export interface ModerationWorkbenchProps {
  readonly channelId: string;
  readonly api?: ModerationApi;
  readonly initialSnapshot?: ModerationSnapshot | null;
  readonly onScStatusChange?: (enabled: boolean) => void;
  readonly pollIntervalMs?: number;
}

export function ModerationWorkbench({
  channelId,
  api,
  initialSnapshot = null,
  onScStatusChange,
  pollIntervalMs = 3000,
}: ModerationWorkbenchProps) {
  const client = useMemo(() => api ?? createModerationApi(), [api]);
  const [snapshot, setSnapshot] = useState<ModerationSnapshot | null>(initialSnapshot);
  const [candidates, setCandidates] = useState<readonly CandidateCardView[]>([]);
  const [categories, setCategories] = useState<readonly TermCategoryView[]>([]);
  const [activeTab, setActiveTab] = useState<string>("queue");
  const [selectedTaskIds, setSelectedTaskIds] = useState<readonly string[]>([]);
  const [expandedEventIds, setExpandedEventIds] = useState<readonly string[]>([]);
  const [candidateCategoryMap, setCandidateCategoryMap] = useState<Record<string, string>>({});
  const [conflictText, setConflictText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "positive" | "danger"; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [snap, candList, catList] = await Promise.all([
        client.getModeration(channelId),
        client.listCandidates(channelId).catch(() => []),
        client.listTermCategories(channelId).catch(() => []),
      ]);
      setSnapshot(snap);
      setCandidates(candList);
      setCategories(catList);
      onScStatusChange?.(snap.scTranslationEnabled);
      setSelectedTaskIds((prev) =>
        prev.filter((id) => snap.feed.reviewQueue.some((task) => task.taskId === id)),
      );
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error) });
    }
  }, [channelId, client, onScStatusChange]);

  useEffect(() => {
    void loadAll();
    const timer = window.setInterval(() => {
      void loadAll();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [loadAll, pollIntervalMs]);

  const queue = snapshot?.feed.reviewQueue ?? [];
  const liveStream = snapshot?.feed.liveStream ?? [];
  const scTickerItems = useMemo(
    () =>
      (snapshot?.feed.approvedSc ?? []).map((sc) => ({
        id: sc.eventId,
        author: sc.safeAlias ?? sc.subjectRef,
        amountText: sc.notes ?? sc.acknowledgement ?? "$5",
        text: sc.originalText,
        translation: sc.translation,
        decidedAtMs: Date.parse(sc.decidedAt) || Date.now(),
      })),
    [snapshot],
  );

  const blacklistCategories = useMemo(
    () => categories.filter((c) => c.listKind === "BLACKLIST"),
    [categories],
  );
  const pendingCandidates = useMemo(
    () => candidates.filter((c) => c.status === "PENDING_CONFIRMATION"),
    [candidates],
  );

  const allQueueSelected = queue.length > 0 && queue.every((q) => selectedTaskIds.includes(q.taskId));

  const toggleTaskSelection = (taskId: string, checked: boolean) => {
    setSelectedTaskIds((prev) =>
      checked ? [...new Set([...prev, taskId])] : prev.filter((id) => id !== taskId),
    );
  };

  const toggleAllTasks = (checked: boolean) => {
    setSelectedTaskIds(checked ? queue.map((q) => q.taskId) : []);
  };

  const handleDecideSingle = async (
    taskId: string,
    classification: InternalClassification,
  ) => {
    setBusyKey(taskId);
    setConflictText(null);
    setFeedback(null);
    try {
      const result = await client.decideTask(channelId, taskId, {
        operationId: nextOpId("decide"),
        classification,
      });
      if (result.conflict) {
        setConflictText(result.reason || "该条审核任务已被其他管理员处理，请刷新队列获取最新状态。");
        return;
      }
      setFeedback({
        tone: "positive",
        text: `已提交裁决：${classificationLabel(classification)}。`,
      });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error) });
    } finally {
      setBusyKey(null);
    }
  };

  const handleBatchDecide = async (classification: InternalClassification) => {
    if (selectedTaskIds.length === 0) return;
    setBusyKey("batch");
    setConflictText(null);
    setFeedback(null);
    try {
      let conflicts = 0;
      for (const taskId of selectedTaskIds) {
        const res = await client.decideTask(channelId, taskId, {
          operationId: nextOpId("batch"),
          classification,
        });
        if (res.conflict) conflicts += 1;
      }
      if (conflicts > 0) {
        setConflictText(`批量处理中有 ${conflicts} 条任务已被其他成员抢先处理，已保留冲突保护。`);
      } else {
        setFeedback({
          tone: "positive",
          text: `已批量完成 ${selectedTaskIds.length} 条审核任务（${classificationLabel(classification)}）。`,
        });
      }
      setSelectedTaskIds([]);
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error) });
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmCandidate = async (card: CandidateCardView) => {
    setBusyKey(card.id);
    setFeedback(null);
    try {
      await client.confirmCandidate(channelId, card.id);
      const chosenCategory = candidateCategoryMap[card.id] ?? blacklistCategories[0]?.code ?? "spam";
      await client.appendBlacklistTerm(channelId, {
        term: card.term,
        categoryCode: chosenCategory,
        matchKind: "CONTAINS",
      });
      setFeedback({ tone: "positive", text: "候选词已确认并写入对应黑名单分类词库。" });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error) });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRejectCandidate = async (card: CandidateCardView) => {
    setBusyKey(card.id);
    setFeedback(null);
    try {
      await client.rejectCandidate(channelId, card.id);
      setFeedback({ tone: "positive", text: "已忽略该候选词建议。" });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error) });
    } finally {
      setBusyKey(null);
    }
  };

  const handleResend = async (deliveryId: string) => {
    setBusyKey(deliveryId);
    try {
      await client.resendDelivery(channelId, deliveryId, nextOpId("resend"));
      setFeedback({ tone: "positive", text: "已重新发起下游投屏投递。" });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error) });
    } finally {
      setBusyKey(null);
    }
  };

  const toggleExpandBody = (id: string) => {
    setExpandedEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div className="vw-stack-md">
      {snapshot?.faults.platformFault ? (
        <BannerNotice tone="warning" title="直播平台连接提示">
          {snapshot.faults.platformFault.message}
        </BannerNotice>
      ) : null}

      {snapshot?.faults.modelFault ? (
        <BannerNotice tone="warning" title="AI 服务降级提示">
          {snapshot.faults.modelFault.message}
        </BannerNotice>
      ) : null}

      {conflictText ? (
        <BannerNotice
          tone="warning"
          title="审核状态并发冲突"
          actions={
            <Button size="sm" variant="secondary" onClick={() => void loadAll()}>
              立即刷新
            </Button>
          }
        >
          {conflictText}
        </BannerNotice>
      ) : null}

      {feedback ? <BannerNotice tone={feedback.tone}>{feedback.text}</BannerNotice> : null}

      <SectionTabs
        label="审核工作区视图"
        selectedId={activeTab}
        onSelect={setActiveTab}
        items={[
          { id: "queue", label: `实时审核工作台 (${queue.length})` },
          { id: "candidates", label: `AI 候选词待确认 (${pendingCandidates.length})` },
        ]}
      >
        {activeTab === "queue" ? (
          <div className="vw-grid-2">
            <section className="vw-panel-card" aria-label="实时待审队列">
              <div className="vw-row-between">
                <strong>实时待审队列 ({queue.length})</strong>
                <div className="vw-row-wrap">
                  <label className="vw-row-wrap">
                    <Checkbox
                      checked={allQueueSelected}
                      onChange={(event) => toggleAllTasks(event.target.checked)}
                    />
                    <span>全选</span>
                  </label>
                </div>
              </div>

              {selectedTaskIds.length > 0 ? (
                <div className="vw-row-wrap" role="region" aria-label="批量操作栏">
                  <span className="vw-muted">已选 {selectedTaskIds.length} 项：</span>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyKey !== null}
                    onClick={() => void handleBatchDecide("ALLOW_MEANINGFUL")}
                  >
                    重判放行 (恢复积分)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyKey !== null}
                    onClick={() => void handleBatchDecide("ALLOW_NOISE")}
                  >
                    放行 (不加分)
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyKey !== null}
                    onClick={() => void handleBatchDecide("BLOCK")}
                  >
                    确认拦截
                  </Button>
                </div>
              ) : null}

              {queue.length === 0 ? (
                <EmptyState
                  title="当前无待审核发言"
                  description="触发边界审查或模型待定的弹幕与 Super Chat 将自动进入此队列。"
                />
              ) : (
                <div className="vw-stack-sm">
                  {queue.map((item) => {
                    const checked = selectedTaskIds.includes(item.taskId);
                    const expanded = expandedEventIds.includes(item.taskId);
                    const original = item.originalText ?? "";
                    const displayBody =
                      original.length > 90 && !expanded ? `${original.slice(0, 90)}…` : original;

                    return (
                      <article
                        key={item.taskId}
                        className={checked ? "vw-ward-line vw-ward-line--selected" : "vw-ward-line"}
                      >
                        <div className="vw-row-between">
                          <label className="vw-row-wrap">
                            <Checkbox
                              checked={checked}
                              onChange={(event) =>
                                toggleTaskSelection(item.taskId, event.target.checked)
                              }
                            />
                            <strong>
                              <UntrustedText text={item.subjectRef} />
                            </strong>
                          </label>
                          <div className="vw-row-wrap">
                            <Badge tone="warning">待裁决</Badge>
                            <span className="vw-caption">
                              截止 {new Date(item.deadlineAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        {original ? (
                          <div className="vw-stack-sm">
                            <div>
                              <UntrustedText text={displayBody} />
                            </div>
                            {original.length > 90 ? (
                              <div>
                                <Button
                                  size="sm"
                                  variant="quiet"
                                  onClick={() => toggleExpandBody(item.taskId)}
                                >
                                  {expanded ? "收起原文" : "展开全文"}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="vw-caption">当前角色已折叠显示敏感原文片段</span>
                        )}

                        <div className="vw-ward-line__actions">
                          <Button
                            variant="primary"
                            size="sm"
                            loading={busyKey === item.taskId}
                            disabled={busyKey !== null}
                            onClick={() => void handleDecideSingle(item.taskId, "ALLOW_MEANINGFUL")}
                          >
                            重判放行 (恢复积分)
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busyKey !== null}
                            onClick={() => void handleDecideSingle(item.taskId, "ALLOW_NOISE")}
                          >
                            放行 (不加分)
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={busyKey !== null}
                            onClick={() => void handleDecideSingle(item.taskId, "BLOCK")}
                          >
                            确认拦截
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="vw-panel-card vw-yt-stream-panel" aria-label="审核旁路实时流与醒目留言条">
              <div className="vw-row-between">
                <strong>实时审核旁路流与 SC 置顶条</strong>
                <span className="vw-caption">{liveStream.length} 条近期记录</span>
              </div>

              <SuperChatOverlayBar items={scTickerItems} />

              {liveStream.length === 0 ? (
                <EmptyState
                  title="暂无近期旁路消息"
                  description="频道进入直播状态后，系统判定的所有消息与投递回执会同步列于此处。"
                />
              ) : (
                <div className="vw-dock-scroll">
                  {liveStream.map((entry) => {
                    const expanded = expandedEventIds.includes(entry.eventId);
                    const scMatch = scTickerItems.find((sc) => sc.id === entry.eventId);
                    const rowText = entry.originalText ?? "";
                    const isLong = rowText.length > 100;

                    if (scMatch && entry.localStatus === "ALLOW") {
                      return <SuperChatCard key={entry.eventId} item={scMatch} />;
                    }

                    return (
                      <article
                        key={entry.eventId}
                        className={
                          entry.localStatus === "BLOCK"
                            ? "vw-chat-row vw-chat-row--flagged"
                            : "vw-chat-row"
                        }
                      >
                        <div className="vw-row-between">
                          <strong>
                            <UntrustedText text={entry.subjectRef} />
                          </strong>
                          <div className="vw-row-wrap">
                            <Badge tone={entry.localStatus === "BLOCK" ? "danger" : "positive"}>
                              {classificationLabel(entry.classification)}
                            </Badge>
                          </div>
                        </div>
                        {rowText ? (
                          <div>
                            <UntrustedText
                              text={
                                entry.bodyFolded && !expanded && isLong
                                  ? `${rowText.slice(0, 100)}…`
                                  : rowText
                              }
                            />
                            {entry.bodyFolded || isLong ? (
                              <Button
                                size="sm"
                                variant="quiet"
                                onClick={() => toggleExpandBody(entry.eventId)}
                              >
                                {expanded ? "收起内容" : "查看原文"}
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                        {entry.deliveryId && entry.deliveryStatus === "FAILED" ? (
                          <div className="vw-row-between">
                            <span className="vw-caption">下游投屏投递失败</span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleResend(entry.deliveryId!)}
                            >
                              重新投递
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="vw-panel-card" aria-label="AI 候选词待确认">
            <div className="vw-row-between">
              <strong>AI 提取候选敏感词 ({pendingCandidates.length})</strong>
              <span className="vw-muted">确认后将归入所选黑名单分类</span>
            </div>
            {pendingCandidates.length === 0 ? (
              <EmptyState
                title="暂无待确认候选词"
                description="当模型发现疑似新兴黑话或绕过变形词时，会在此提交人工确认。"
              />
            ) : (
              <div className="vw-stack-sm">
                {pendingCandidates.map((card) => {
                  const chosenCat =
                    candidateCategoryMap[card.id] ?? blacklistCategories[0]?.code ?? "spam";
                  return (
                    <article key={card.id} className="vw-ward-line">
                      <div className="vw-row-between">
                        <strong>
                          <UntrustedText text={card.term} />
                        </strong>
                        <Badge tone="warning">待人工确认</Badge>
                      </div>
                      {card.note ? (
                        <div className="vw-muted">
                          <UntrustedText text={card.note} />
                        </div>
                      ) : null}
                      <div className="vw-input-action-row">
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor={`cand-cat-${card.id}`}>
                            归入黑名单分类
                          </label>
                          <Select
                            id={`cand-cat-${card.id}`}
                            value={chosenCat}
                            onChange={(event) =>
                              setCandidateCategoryMap((prev) => ({
                                ...prev,
                                [card.id]: event.target.value,
                              }))
                            }
                            options={
                              blacklistCategories.length > 0
                                ? blacklistCategories.map((c) => ({
                                    value: c.code,
                                    label: c.label,
                                  }))
                                : [{ value: "spam", label: "垃圾刷屏" }]
                            }
                          />
                        </div>
                        <div className="vw-row-wrap">
                          <Button
                            size="sm"
                            variant="primary"
                            loading={busyKey === card.id}
                            disabled={busyKey !== null}
                            onClick={() => void handleConfirmCandidate(card)}
                          >
                            确认加入黑名单
                          </Button>
                          <Button
                            size="sm"
                            variant="quiet"
                            disabled={busyKey !== null}
                            onClick={() => void handleRejectCandidate(card)}
                          >
                            忽略
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </SectionTabs>
    </div>
  );
}

export function ModerationPage({ api }: { readonly api?: ModerationApi }) {
  const params = useParams();
  const { activeChannelId } = useVoxWardShell();
  const resolvedChannelId = params.channelId ?? activeChannelId;
  const [scEnabled, setScEnabled] = useState(false);

  return (
    <VoxWardShell
      activeNavId="moderation"
      channelId={resolvedChannelId}
      showChannelSelector
      requireAuth
      pageTitle="实时审核"
      pageDescription="两栏协同处理待审队列与直播旁路流，并审核 AI 自动提取的新增敏感候选词。"
      pageMeta={
        <Badge tone={scEnabled ? "positive" : "neutral"}>
          {scEnabled ? "SC 精翻已开启" : "SC 精翻未开启"}
        </Badge>
      }
    >
      <ModerationWorkbench
        channelId={resolvedChannelId}
        api={api}
        onScStatusChange={setScEnabled}
      />
    </VoxWardShell>
  );
}
