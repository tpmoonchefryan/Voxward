import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import type { InternalClassification } from "@voxward/contracts";
import { formatTime } from "../../i18n/format";
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
import {
  SuperChatCard,
  SuperChatOverlayBar,
  useLiveStreamAutoScroll,
  type SuperChatItemDisplay,
} from "../../components/youtube-sc";
import { MODERATION_COPY, pickLocale, type ModerationCopy, type VoxWardLocale } from "../../i18n";
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

function classificationLabel(code: string, copy: ModerationCopy): string {
  switch (code) {
    case "ALLOW_MEANINGFUL":
      return copy.classAllowScore;
    case "ALLOW_NOISE":
      return copy.classAllowNoScore;
    case "BLOCK":
      return copy.classBlock;
    default:
      return copy.classDone;
  }
}

export interface ModerationWorkbenchProps {
  readonly channelId: string;
  readonly api?: ModerationApi;
  readonly initialSnapshot?: ModerationSnapshot | null;
  readonly onScStatusChange?: (enabled: boolean) => void;
  readonly pollIntervalMs?: number;
  readonly locale?: VoxWardLocale;
}

export function ModerationWorkbench({
  channelId,
  api,
  initialSnapshot = null,
  onScStatusChange,
  pollIntervalMs = 3000,
  locale,
}: ModerationWorkbenchProps) {
  const { locale: shellLocale } = useVoxWardShell();
  const resolvedLocale = locale ?? shellLocale;
  const copy = pickLocale(MODERATION_COPY, resolvedLocale);

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
      setFeedback({ tone: "danger", text: moderationMessageFor(error, resolvedLocale) });
    }
  }, [channelId, client, onScStatusChange, resolvedLocale]);

  useEffect(() => {
    if (initialSnapshot !== null) {
      setSnapshot(initialSnapshot);
    }
  }, [initialSnapshot]);

  useEffect(() => {
    void loadAll();
    const timer = window.setInterval(() => {
      void loadAll();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [loadAll, pollIntervalMs]);

  const queue = snapshot?.feed.reviewQueue ?? [];
  const liveStream = snapshot?.feed.liveStream ?? [];
  const scTickerItems = useMemo<readonly SuperChatItemDisplay[]>(
    () =>
      (snapshot?.feed.approvedSc ?? []).map((sc) => ({
        id: sc.eventId,
        author: sc.safeAlias ?? sc.subjectRef,
        amountText: sc.amountDisplay ?? null,
        payment: sc.payment ?? (sc.amountDisplay === undefined ? null : undefined),
        text: sc.originalText,
        translation: sc.translation,
        translationDetails: sc,
        decidedAtMs: Date.parse(sc.decidedAt) || Date.now(),
      })),
    [snapshot],
  );

  type UnifiedModerationEntry =
    | {
        readonly kind: "sc";
        readonly id: string;
        readonly decidedAtMs: number;
        readonly item: SuperChatItemDisplay;
      }
    | {
        readonly kind: "chat";
        readonly id: string;
        readonly decidedAtMs: number;
        readonly entry: (typeof liveStream)[number];
      };

  const unifiedStream = useMemo<readonly UnifiedModerationEntry[]>(() => {
    const scById = new Map(scTickerItems.map((sc) => [sc.id, sc]));
    const seenIds = new Set<string>();
    const combined: UnifiedModerationEntry[] = [];

    for (const entry of liveStream) {
      seenIds.add(entry.eventId);
      const scMatch = scById.get(entry.eventId);
      const decidedAtMs = Date.parse(entry.decidedAt) || scMatch?.decidedAtMs || 0;
      if (scMatch && entry.localStatus === "ALLOW") {
        combined.push({ kind: "sc", id: entry.eventId, decidedAtMs, item: scMatch });
      } else {
        combined.push({ kind: "chat", id: entry.eventId, decidedAtMs, entry });
      }
    }

    for (const sc of scTickerItems) {
      if (seenIds.has(sc.id)) continue;
      combined.push({
        kind: "sc",
        id: sc.id,
        decidedAtMs: sc.decidedAtMs ?? 0,
        item: sc,
      });
    }

    return combined.sort((a, b) => a.decidedAtMs - b.decidedAtMs);
  }, [liveStream, scTickerItems]);

  const streamItemIds = useMemo(
    () => unifiedStream.map((entry) => (entry.kind === "sc" ? `sc-${entry.id}` : `chat-${entry.id}`)),
    [unifiedStream],
  );
  const { viewportRef, trackRef, handleScroll, handleWheel } = useLiveStreamAutoScroll(streamItemIds);

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
        setConflictText(result.reason || copy.conflictDefault);
        return;
      }
      setFeedback({
        tone: "positive",
        text: copy.decidedFeedback(classificationLabel(classification, copy)),
      });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error, resolvedLocale) });
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
        setConflictText(copy.batchConflictFeedback(conflicts));
      } else {
        setFeedback({
          tone: "positive",
          text: copy.batchDoneFeedback(
            selectedTaskIds.length,
            classificationLabel(classification, copy),
          ),
        });
      }
      setSelectedTaskIds([]);
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error, resolvedLocale) });
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
      setFeedback({ tone: "positive", text: copy.candidateConfirmed });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error, resolvedLocale) });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRejectCandidate = async (card: CandidateCardView) => {
    setBusyKey(card.id);
    setFeedback(null);
    try {
      await client.rejectCandidate(channelId, card.id);
      setFeedback({ tone: "positive", text: copy.candidateRejected });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error, resolvedLocale) });
    } finally {
      setBusyKey(null);
    }
  };

  const handleResend = async (deliveryId: string) => {
    setBusyKey(deliveryId);
    try {
      await client.resendDelivery(channelId, deliveryId, nextOpId("resend"));
      setFeedback({ tone: "positive", text: copy.resentSuccess });
      await loadAll();
    } catch (error) {
      setFeedback({ tone: "danger", text: moderationMessageFor(error, resolvedLocale) });
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
        <BannerNotice tone="warning" title={copy.conflictTitle}>
          {snapshot.faults.platformFault.message}
        </BannerNotice>
      ) : null}

      {snapshot?.faults.modelFault ? (
        <BannerNotice tone="warning" title={copy.conflictTitle}>
          {snapshot.faults.modelFault.message}
        </BannerNotice>
      ) : null}

      {conflictText ? (
        <BannerNotice
          tone="warning"
          title={copy.conflictTitle}
          actions={
            <Button size="sm" variant="secondary" onClick={() => void loadAll()}>
              {copy.refreshNow}
            </Button>
          }
        >
          {conflictText}
        </BannerNotice>
      ) : null}

      {feedback ? <BannerNotice tone={feedback.tone}>{feedback.text}</BannerNotice> : null}

      <SectionTabs
        label={copy.tabAria}
        selectedId={activeTab}
        onSelect={setActiveTab}
        items={[
          { id: "queue", label: copy.queueTab(queue.length) },
          { id: "candidates", label: copy.candidatesTab(pendingCandidates.length) },
        ]}
      >
        {activeTab === "queue" ? (
          <div className="vw-grid-2">
            <section className="vw-panel-card" aria-label={copy.queueAria}>
              <div className="vw-row-between">
                <strong>{copy.queueHeading(queue.length)}</strong>
                <div className="vw-row-wrap">
                  <label className="vw-row-wrap">
                    <Checkbox
                      checked={allQueueSelected}
                      onChange={(event) => toggleAllTasks(event.target.checked)}
                    />
                    <span>{copy.selectAll}</span>
                  </label>
                </div>
              </div>

              {selectedTaskIds.length > 0 ? (
                <div className="vw-row-wrap" role="region" aria-label={copy.queueAria}>
                  <span className="vw-muted">{copy.selectedPrefix(selectedTaskIds.length)}</span>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyKey !== null}
                    onClick={() => void handleBatchDecide("ALLOW_MEANINGFUL")}
                  >
                    {copy.approveWithScore}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyKey !== null}
                    onClick={() => void handleBatchDecide("ALLOW_NOISE")}
                  >
                    {copy.approveNoScore}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyKey !== null}
                    onClick={() => void handleBatchDecide("BLOCK")}
                  >
                    {copy.confirmBlock}
                  </Button>
                </div>
              ) : null}

              {queue.length === 0 ? (
                <EmptyState
                  title={copy.queueEmptyTitle}
                  description={copy.queueEmptyDesc}
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
                            <Badge tone="warning">{copy.pendingBadge}</Badge>
                            <span className="vw-caption">
                              {copy.deadlinePrefix}
                              {formatTime(item.deadlineAt, resolvedLocale)}
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
                                  {expanded ? copy.collapseOriginal : copy.expandFull}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="vw-caption">{copy.foldedSnippetNotice}</span>
                        )}

                        <div className="vw-ward-line__actions">
                          <Button
                            variant="primary"
                            size="sm"
                            loading={busyKey === item.taskId}
                            disabled={busyKey !== null}
                            onClick={() => void handleDecideSingle(item.taskId, "ALLOW_MEANINGFUL")}
                          >
                            {copy.approveWithScore}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busyKey !== null}
                            onClick={() => void handleDecideSingle(item.taskId, "ALLOW_NOISE")}
                          >
                            {copy.approveNoScore}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={busyKey !== null}
                            onClick={() => void handleDecideSingle(item.taskId, "BLOCK")}
                          >
                            {copy.confirmBlock}
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="vw-panel-card vw-yt-stream-panel" aria-label={copy.streamAria}>
              <div className="vw-row-between">
                <strong>{copy.streamHeading}</strong>
                <span className="vw-caption">{copy.streamRecentCount(unifiedStream.length)}</span>
              </div>

              <SuperChatOverlayBar items={scTickerItems} locale={resolvedLocale} />

              {unifiedStream.length === 0 ? (
                <EmptyState
                  title={copy.streamEmptyTitle}
                  description={copy.streamEmptyDesc}
                />
              ) : (
                <div
                  ref={viewportRef}
                  className="vw-dock-scroll vw-stream-viewport"
                  onScroll={handleScroll}
                  onWheel={handleWheel}
                >
                  <div className="vw-stream-clip">
                    <div ref={trackRef} className="vw-stream-track">
                      {unifiedStream.map((streamEntry) => {
                        if (streamEntry.kind === "sc") {
                          return (
                            <div
                              key={`sc-${streamEntry.id}`}
                              className="vw-stream-item"
                              data-stream-kind="sc"
                            >
                              <SuperChatCard item={streamEntry.item} locale={resolvedLocale} />
                            </div>
                          );
                        }

                        const entry = streamEntry.entry;
                        const expanded = expandedEventIds.includes(entry.eventId);
                        const rowText = entry.originalText ?? "";
                        const isLong = rowText.length > 100;

                        return (
                          <div
                            key={`chat-${entry.eventId}`}
                            className="vw-stream-item"
                            data-stream-kind="chat"
                          >
                            <article
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
                                    {classificationLabel(entry.classification, copy)}
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
                                      {expanded ? copy.collapseContent : copy.viewOriginal}
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                              {entry.deliveryId && entry.deliveryStatus === "FAILED" ? (
                                <div className="vw-row-between">
                                  <span className="vw-caption">{copy.deliveryFailed}</span>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => void handleResend(entry.deliveryId!)}
                                  >
                                    {copy.resendBtn}
                                  </Button>
                                </div>
                              ) : null}
                            </article>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="vw-panel-card" aria-label={copy.candidatesAria}>
            <div className="vw-row-between">
              <strong>{copy.candidatesHeading(pendingCandidates.length)}</strong>
              <span className="vw-muted">{copy.candidatesHint}</span>
            </div>
            {pendingCandidates.length === 0 ? (
              <EmptyState
                title={copy.candidatesEmptyTitle}
                description={copy.candidatesEmptyDesc}
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
                        <Badge tone="warning">{copy.pendingConfirmBadge}</Badge>
                      </div>
                      {card.note ? (
                        <div className="vw-muted">
                          <UntrustedText text={card.note} />
                        </div>
                      ) : null}
                      <div className="vw-input-action-row">
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor={`cand-cat-${card.id}`}>
                            {copy.assignCategoryLabel}
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
                                : [{ value: "spam", label: copy.defaultSpamCategory }]
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
                            {copy.confirmAddBlacklist}
                          </Button>
                          <Button
                            size="sm"
                            variant="quiet"
                            disabled={busyKey !== null}
                            onClick={() => void handleRejectCandidate(card)}
                          >
                            {copy.ignoreBtn}
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
      pageTitle={(locale) => pickLocale(MODERATION_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(MODERATION_COPY, locale).pageDescription}
      pageMeta={(locale) => {
        const c = pickLocale(MODERATION_COPY, locale);
        return (
          <Badge tone={scEnabled ? "positive" : "neutral"}>
            {scEnabled ? c.scOn : c.scOff}
          </Badge>
        );
      }}
    >
      <ModerationWorkbench
        channelId={resolvedChannelId}
        api={api}
        onScStatusChange={setScEnabled}
      />
    </VoxWardShell>
  );
}
