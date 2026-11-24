import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmActionDialog,
  EmptyState,
  Input,
  SearchInput,
  Select,
  Switch,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import type { ModerationItemView } from "../dock/api";
import {
  BlockedApiError,
  createBlockedApi,
  type BlockedApi,
  type ManualBlockedUserView,
} from "./api";

function nextOpId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deleteStatusLabel(status: string): string {
  switch (status) {
    case "DELETED":
      return "已同步删平台消息";
    case "PENDING":
      return "平台删消息队列中";
    case "FAILED":
      return "平台删消息失败";
    default:
      return "本地拦截记录";
  }
}

export function BlockedPage({ api }: { readonly api?: BlockedApi }) {
  const params = useParams();
  const { activeChannelId } = useVoxWardShell();
  const channelId = params.channelId ?? activeChannelId;
  const client = useMemo(() => api ?? createBlockedApi(), [api]);

  const [activeTab, setActiveTab] = useState<string>("records");
  const [records, setRecords] = useState<readonly ModerationItemView[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<readonly ManualBlockedUserView[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedIds, setExpandedIds] = useState<readonly string[]>([]);

  const [newSubjectRef, setNewSubjectRef] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newSyncYouTube, setNewSyncYouTube] = useState(false);

  const [pendingUnblockTarget, setPendingUnblockTarget] = useState<ManualBlockedUserView | null>(null);
  const [restoreBaseScore, setRestoreBaseScore] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "positive" | "danger" | "warning"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [recs, users] = await Promise.all([
        client.listBlockedRecords(channelId),
        client.listBlockedUsers(channelId),
      ]);
      setRecords(recs);
      setBlockedUsers(users);
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof BlockedApiError ? `加载失败 (${error.code})` : "无法获取拦截记录列表。",
      });
    }
  }, [channelId, client]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return records.filter((rec) => {
      if (statusFilter !== "ALL" && rec.platformDeleteStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        rec.subjectRef.toLowerCase().includes(q) ||
        (rec.originalText ?? "").toLowerCase().includes(q)
      );
    });
  }, [records, searchText, statusFilter]);

  const handleRejudge = async (
    eventId: string,
    classification: "ALLOW_MEANINGFUL" | "ALLOW_NOISE",
  ) => {
    setBusyKey(eventId);
    setNotice(null);
    try {
      const res = await client.rejudgeScoreOnly(channelId, eventId, {
        classification,
        operationId: nextOpId("rejudge"),
      });
      setNotice({
        tone: "positive",
        text: res.downstreamReissued
          ? "已完成重判并同步更新状态。"
          : `已完成评分重判（${classification === "ALLOW_MEANINGFUL" ? "恢复用户积分" : "仅改判不加分"}），绝不会重新发送历史发言到 OBS 投屏或主播侧边栏。`,
      });
      await loadData();
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof BlockedApiError ? `评分重判失败 (${error.code})` : "评分重判失败。",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddBlockedUser = async () => {
    const ref = newSubjectRef.trim();
    if (!ref) return;
    setBusyKey("add-user");
    setNotice(null);
    try {
      const users = await client.addBlockedUser(channelId, {
        subjectRef: ref,
        ...(newNickname.trim() ? { nickname: newNickname.trim() } : {}),
        ...(newReason.trim() ? { reason: newReason.trim() } : {}),
        syncYouTube: newSyncYouTube,
      });
      setBlockedUsers(users);
      setNewSubjectRef("");
      setNewNickname("");
      setNewReason("");
      setNewSyncYouTube(false);
      setNotice({ tone: "positive", text: "已将该观众加入本地黑名单管理列表。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof BlockedApiError ? `添加黑名单失败 (${error.code})` : "添加黑名单失败。",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmUnblock = async () => {
    if (pendingUnblockTarget === null) return;
    setBusyKey(pendingUnblockTarget.subjectRef);
    setNotice(null);
    try {
      const result = await client.removeBlockedUser(
        channelId,
        pendingUnblockTarget.subjectRef,
        restoreBaseScore,
      );
      setBlockedUsers(result.users);
      setNotice({
        tone: "positive",
        text: `已移出黑名单${result.youtubeUnbanned ? "，已解除关联的 YouTube 平台封禁记录" : ""}${result.restoreBaseScoreApplied ? "，并已恢复基础信任分" : ""}。`,
      });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof BlockedApiError ? `移出黑名单失败 (${error.code})` : "移出黑名单失败。",
      });
    } finally {
      setBusyKey(null);
      setPendingUnblockTarget(null);
    }
  };

  const userRows = blockedUsers.map((user) => ({
    subjectRef: <UntrustedText text={user.subjectRef} />,
    nickname: user.nickname ? <UntrustedText text={user.nickname} /> : <span className="vw-muted">未填备注</span>,
    reason: user.reason ? <UntrustedText text={user.reason} /> : <span className="vw-muted">无说明</span>,
    youtube: user.banId ? (
      <Badge tone="warning">已联动平台封禁</Badge>
    ) : (
      <Badge tone="neutral">仅本地生效</Badge>
    ),
    createdAt: new Date(user.createdAt).toLocaleString(),
    actions: (
      <div className="vw-table-actions">
        <Button
          size="sm"
          variant="secondary"
          disabled={busyKey !== null}
          onClick={() => {
            setRestoreBaseScore(true);
            setPendingUnblockTarget(user);
          }}
        >
          移除黑名单
        </Button>
      </div>
    ),
  }));

  return (
    <VoxWardShell
      activeNavId="blocked"
      channelId={channelId}
      showChannelSelector
      requireAuth
      pageTitle="拦截管理"
      pageDescription="复核已拦截消息并按需修正用户信任积分（不重发投屏），并管理频道人工黑名单用户。"
    >
      <div className="vw-stack-md">
        {notice ? <BannerNotice tone={notice.tone}>{notice.text}</BannerNotice> : null}

        <SectionTabs
          label="拦截管理视图切换"
          selectedId={activeTab}
          onSelect={setActiveTab}
          items={[
            { id: "records", label: `已确认拦截记录 (${records.length})` },
            { id: "users", label: `黑名单用户管理 (${blockedUsers.length})` },
          ]}
        >
          {activeTab === "records" ? (
            <div className="vw-stack-md">
              <section className="vw-panel-card" aria-label="拦截记录筛选">
                <div className="vw-row-wrap">
                  <div className="vw-field-col">
                    <label className="vw-field-label" htmlFor="blocked-search">
                      搜索观众或拦截文本
                    </label>
                    <SearchInput
                      id="blocked-search"
                      fill
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="按观众标识或发言片段过滤…"
                    />
                  </div>
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="blocked-status-filter">
                      平台同步状态
                    </label>
                    <Select
                      id="blocked-status-filter"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      options={[
                        { value: "ALL", label: "全部状态" },
                        { value: "DELETED", label: "已同步删平台消息" },
                        { value: "PENDING", label: "平台删消息队列中" },
                        { value: "FAILED", label: "平台删消息失败" },
                      ]}
                    />
                  </div>
                </div>
                <span className="vw-caption">
                  说明：评分重判只校准观众信任分与规则统计，不会把历史已拦截发言重新发送到 OBS 投屏或主播侧边栏。
                </span>
              </section>

              {filteredRecords.length === 0 ? (
                <div className="vw-panel-card">
                  <EmptyState
                    title="没有匹配的拦截记录"
                    description="频道暂无被确认拦截的消息，或当前过滤条件未命中任何条目。"
                  />
                </div>
              ) : (
                <div className="vw-stack-sm">
                  {filteredRecords.map((rec) => {
                    const expanded = expandedIds.includes(rec.eventId);
                    const rawText = rec.originalText ?? "";
                    const displayBody =
                      rawText.length > 100 && !expanded ? `${rawText.slice(0, 100)}…` : rawText;

                    return (
                      <article key={rec.eventId} className="vw-ward-line">
                        <div className="vw-row-between">
                          <strong>
                            <UntrustedText text={rec.subjectRef} />
                          </strong>
                          <div className="vw-row-wrap">
                            <Badge tone="danger">已拦截</Badge>
                            <Badge tone="neutral">{deleteStatusLabel(rec.platformDeleteStatus)}</Badge>
                            <span className="vw-caption">
                              {new Date(rec.decidedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {rawText ? (
                          <div>
                            <UntrustedText text={displayBody} />
                            {rawText.length > 100 ? (
                              <Button
                                size="sm"
                                variant="quiet"
                                onClick={() =>
                                  setExpandedIds((prev) =>
                                    prev.includes(rec.eventId)
                                      ? prev.filter((id) => id !== rec.eventId)
                                      : [...prev, rec.eventId],
                                  )
                                }
                              >
                                {expanded ? "收起原文" : "查看原文"}
                              </Button>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="vw-row-wrap">
                          <Button
                            size="sm"
                            variant="primary"
                            loading={busyKey === rec.eventId}
                            disabled={busyKey !== null}
                            onClick={() => void handleRejudge(rec.eventId, "ALLOW_MEANINGFUL")}
                          >
                            重判放行 (恢复积分)
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyKey !== null}
                            onClick={() => void handleRejudge(rec.eventId, "ALLOW_NOISE")}
                          >
                            放行 (不加分)
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="vw-stack-md">
              <section className="vw-panel-card" aria-label="添加黑名单用户">
                <strong>手动加入频道黑名单</strong>
                <div className="vw-row-wrap">
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="bl-user-ref">
                      观众标识
                    </label>
                    <Input
                      id="bl-user-ref"
                      value={newSubjectRef}
                      onChange={(event) => setNewSubjectRef(event.target.value)}
                      placeholder="例如：viewer-1024"
                    />
                  </div>
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="bl-user-nick">
                      备注昵称（可选）
                    </label>
                    <Input
                      id="bl-user-nick"
                      value={newNickname}
                      onChange={(event) => setNewNickname(event.target.value)}
                      placeholder="方便人工识别的备注"
                    />
                  </div>
                  <div className="vw-field-col">
                    <label className="vw-field-label" htmlFor="bl-user-reason">
                      拉黑原因
                    </label>
                    <Input
                      id="bl-user-reason"
                      value={newReason}
                      onChange={(event) => setNewReason(event.target.value)}
                      placeholder="连续恶意刷屏 / 外链骚扰"
                    />
                  </div>
                </div>
                <div className="vw-row-between">
                  <Switch
                    label="同步至 YouTube 直播间"
                    description="开启后将在本地记录外登记平台封禁凭据以便协同移出。"
                    checked={newSyncYouTube}
                    onChange={(event) => setNewSyncYouTube(event.target.checked)}
                  />
                  <Button
                    variant="primary"
                    loading={busyKey === "add-user"}
                    disabled={newSubjectRef.trim() === "" || busyKey !== null}
                    onClick={() => void handleAddBlockedUser()}
                  >
                    加入黑名单
                  </Button>
                </div>
              </section>

              <section className="vw-panel-card" aria-label="黑名单用户列表">
                <strong>已封禁用户 ({blockedUsers.length})</strong>
                <TableShell
                  label="黑名单用户管理表"
                  columns={[
                    { key: "subjectRef", label: "观众标识" },
                    { key: "nickname", label: "备注昵称" },
                    { key: "reason", label: "拉黑原因" },
                    { key: "youtube", label: "平台同步" },
                    { key: "createdAt", label: "加入时间" },
                    { key: "actions", label: "操作", align: "end" },
                  ]}
                  rows={userRows}
                  emptyState={
                    <EmptyState
                      title="黑名单用户列表为空"
                      description="被人工封禁或联动拉黑的观众将显示在此，支持随时移出并恢复信任积分。"
                    />
                  }
                />
              </section>
            </div>
          )}
        </SectionTabs>

        <ConfirmActionDialog
          open={pendingUnblockTarget !== null}
          onOpenChange={(open) => {
            if (!open) setPendingUnblockTarget(null);
          }}
          title="移出黑名单确认"
          message={
            <div className="vw-stack-sm">
              <span>
                确定将观众{" "}
                <strong>
                  <UntrustedText text={pendingUnblockTarget?.subjectRef ?? ""} />
                </strong>{" "}
                移出黑名单吗？
                {pendingUnblockTarget?.banId ? "（同时将撤销关联的 YouTube 封禁凭据。）" : ""}
              </span>
              <label className="vw-row-wrap">
                <Checkbox
                  checked={restoreBaseScore}
                  onChange={(event) => setRestoreBaseScore(event.target.checked)}
                />
                <span>同时恢复基础信任分</span>
              </label>
            </div>
          }
          confirmLabel="确认移出"
          cancelLabel="取消"
          tone="warning"
          onConfirm={() => void handleConfirmUnblock()}
          onCancel={() => setPendingUnblockTarget(null)}
        />
      </div>
    </VoxWardShell>
  );
}
