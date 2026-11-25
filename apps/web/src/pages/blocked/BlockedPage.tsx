import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { formatDateTime } from "../../i18n/format";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmActionDialog,
  EmptyState,
  Input,
  SearchInput,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { BLOCKED_COPY, pickLocale } from "../../i18n";
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

function BlockedSurface({
  channelId,
  api,
}: {
  readonly channelId: string;
  readonly api?: BlockedApi;
}) {
  const { locale } = useVoxWardShell();
  const copy = pickLocale(BLOCKED_COPY, locale);
  const client = useMemo(() => api ?? createBlockedApi(), [api]);

  const [activeTab, setActiveTab] = useState<string>("records");
  const [records, setRecords] = useState<readonly ModerationItemView[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<readonly ManualBlockedUserView[]>([]);
  const [searchText, setSearchText] = useState("");
  const [expandedIds, setExpandedIds] = useState<readonly string[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubjectRef, setNewSubjectRef] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newReason, setNewReason] = useState("");

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
        text: error instanceof BlockedApiError ? copy.loadFailedCode(error.code) : copy.loadFailed,
      });
    }
  }, [channelId, client, copy]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return records.filter((rec) => {
      if (!q) return true;
      return (
        rec.subjectRef.toLowerCase().includes(q) ||
        (rec.originalText ?? "").toLowerCase().includes(q)
      );
    });
  }, [records, searchText]);

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
          ? copy.rejudgeSynced
          : copy.rejudgeScoreOnly(classification === "ALLOW_MEANINGFUL"),
      });
      await loadData();
    } catch (error) {
      setNotice({
        tone: "danger",
        text:
          error instanceof BlockedApiError ? copy.rejudgeFailedCode(error.code) : copy.rejudgeFailed,
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
      });
      setBlockedUsers(users);
      setNewSubjectRef("");
      setNewNickname("");
      setNewReason("");
      setShowAddForm(false);
      setNotice({ tone: "positive", text: copy.userAddedSuccess });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof BlockedApiError ? copy.userAddFailedCode(error.code) : copy.userAddFailed,
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
        text: copy.userRemovedSuccess(result.restoreBaseScoreApplied),
      });
    } catch (error) {
      setNotice({
        tone: "danger",
        text:
          error instanceof BlockedApiError
            ? copy.userRemoveFailedCode(error.code)
            : copy.userRemoveFailed,
      });
    } finally {
      setBusyKey(null);
      setPendingUnblockTarget(null);
    }
  };

  const userRows = blockedUsers.map((user) => ({
    subjectRef: <UntrustedText text={user.subjectRef} />,
    nickname: user.nickname ? <UntrustedText text={user.nickname} /> : <span className="vw-muted">{copy.noNickname}</span>,
    reason: user.reason ? <UntrustedText text={user.reason} /> : <span className="vw-muted">{copy.noReason}</span>,
    createdAt: formatDateTime(user.createdAt, locale),
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
          {copy.removeBtn}
        </Button>
      </div>
    ),
  }));

  return (
    <div className="vw-stack-md">
      {notice ? <BannerNotice tone={notice.tone}>{notice.text}</BannerNotice> : null}

      <SectionTabs
        label={copy.tabsAria}
        selectedId={activeTab}
        onSelect={setActiveTab}
        items={[
          { id: "records", label: copy.recordsTab(records.length) },
          { id: "users", label: copy.usersTab(blockedUsers.length) },
        ]}
      >
        {activeTab === "records" ? (
          <div className="vw-stack-md">
            <section className="vw-panel-card" aria-label={copy.searchAria}>
              <div className="vw-input-action-row">
                <div className="vw-field-col">
                  <label className="vw-field-label" htmlFor="blocked-search">
                    {copy.searchLabel}
                  </label>
                  <SearchInput
                    id="blocked-search"
                    fill
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                  />
                </div>
              </div>
              <span className="vw-caption">{copy.scoreOnlyGuidance}</span>
            </section>

            {filteredRecords.length === 0 ? (
              <div className="vw-panel-card">
                <EmptyState title={copy.emptyRecordsTitle} description={copy.emptyRecordsDesc} />
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
                          <Badge tone="danger">{copy.blockedBadge}</Badge>
                          <span className="vw-caption">
                            {formatDateTime(rec.decidedAt, locale)}
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
                              {expanded ? copy.collapseOriginal : copy.viewOriginal}
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
                          {copy.approveWithScore}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyKey !== null}
                          onClick={() => void handleRejudge(rec.eventId, "ALLOW_NOISE")}
                        >
                          {copy.approveNoScore}
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
            <section className="vw-panel-card" aria-label={copy.usersAria}>
              <div className="vw-row-between">
                <strong>{copy.bannedUsersHeading(blockedUsers.length)}</strong>
                <Button
                  size="sm"
                  variant={showAddForm ? "secondary" : "primary"}
                  onClick={() => setShowAddForm((prev) => !prev)}
                >
                  {showAddForm ? copy.cancelAddBtn : copy.addManualBtn}
                </Button>
              </div>

              {showAddForm ? (
                <div className="vw-panel-card vw-panel-card--quiet" aria-label={copy.addFormAria}>
                  <strong>{copy.addFormTitle}</strong>
                  <div className="vw-input-action-row">
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="bl-user-ref">
                        {copy.subjectRefLabel}
                      </label>
                      <Input
                        id="bl-user-ref"
                        value={newSubjectRef}
                        onChange={(event) => setNewSubjectRef(event.target.value)}
                        placeholder={copy.subjectRefPlaceholder}
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="bl-user-nick">
                        {copy.nicknameLabel}
                      </label>
                      <Input
                        id="bl-user-nick"
                        value={newNickname}
                        onChange={(event) => setNewNickname(event.target.value)}
                        placeholder={copy.nicknamePlaceholder}
                      />
                    </div>
                    <div className="vw-field-col">
                      <label className="vw-field-label" htmlFor="bl-user-reason">
                        {copy.reasonLabel}
                      </label>
                      <Input
                        id="bl-user-reason"
                        value={newReason}
                        onChange={(event) => setNewReason(event.target.value)}
                        placeholder={copy.reasonPlaceholder}
                      />
                    </div>
                    <Button
                      variant="primary"
                      loading={busyKey === "add-user"}
                      disabled={newSubjectRef.trim() === "" || busyKey !== null}
                      onClick={() => void handleAddBlockedUser()}
                    >
                      {copy.confirmAddBtn}
                    </Button>
                  </div>
                </div>
              ) : null}

              <TableShell
                label={copy.tableLabel}
                columns={[
                  { key: "subjectRef", label: copy.colSubjectRef },
                  { key: "nickname", label: copy.colNickname },
                  { key: "reason", label: copy.colReason },
                  { key: "createdAt", label: copy.colCreatedAt },
                  { key: "actions", label: copy.colActions, align: "end" },
                ]}
                rows={userRows}
                emptyState={<EmptyState title={copy.emptyUsersTitle} description={copy.emptyUsersDesc} />}
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
        title={copy.dialogTitle}
        message={
          <div className="vw-stack-sm">
            <span>
              {copy.dialogPrefix}
              <strong>
                <UntrustedText text={pendingUnblockTarget?.subjectRef ?? ""} />
              </strong>
              {copy.dialogSuffix}
            </span>
            <label className="vw-row-wrap">
              <Checkbox
                checked={restoreBaseScore}
                onChange={(event) => setRestoreBaseScore(event.target.checked)}
              />
              <span>{copy.restoreScoreLabel}</span>
            </label>
          </div>
        }
        confirmLabel={copy.dialogConfirmBtn}
        cancelLabel={copy.dialogCancelBtn}
        tone="warning"
        onConfirm={() => void handleConfirmUnblock()}
        onCancel={() => setPendingUnblockTarget(null)}
      />
    </div>
  );
}

export function BlockedPage({ api }: { readonly api?: BlockedApi }) {
  const params = useParams();
  const { activeChannelId } = useVoxWardShell();
  const channelId = params.channelId ?? activeChannelId;

  return (
    <VoxWardShell
      activeNavId="blocked"
      channelId={channelId}
      showChannelSelector
      requireAuth
      pageTitle={(locale) => pickLocale(BLOCKED_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(BLOCKED_COPY, locale).pageDescription}
    >
      <BlockedSurface channelId={channelId} api={api} />
    </VoxWardShell>
  );
}
