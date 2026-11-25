import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import type { DeleteMode } from "@voxward/contracts";
import { Badge, Button, Card, EmptyState, Input, KeyValueList, TableShell } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { DATA_COPY, DEFAULT_VOXWARD_LOCALE, pickLocale, type DataCopy, type VoxWardLocale } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import { dataCategoryLabel } from "../../i18n/operator-data";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import { createDataApi, messageFor, type DataApi, type SubjectPanel, type VerificationInput } from "./api";
import { DeleteActions } from "./DeleteActions";
import { deleteRequestInput, IDLE_FLOW, reduceDeleteFlow, type DeleteFlow } from "./flow";
import { RequestStatus } from "./RequestStatus";

export interface DataPanelViewProps {
  readonly channelId: string;
  /** Null while the capability is being read. False hides every data action. */
  readonly dataHandle: boolean | null;
  readonly query: string;
  readonly subject: SubjectPanel | null;
  readonly flow: DeleteFlow;
  readonly message: string | null;
  readonly locale?: VoxWardLocale;
  readonly onQueryChange: (value: string) => void;
  readonly onLookup: () => void;
  readonly onChoose: (mode: DeleteMode) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onVerify: (requestId: string, input: VerificationInput) => void;
  readonly onExecute?: (requestId: string) => void;
}

function listLabel(list: SubjectPanel["list"], copy: DataCopy): string {
  if (list === "BLACKLIST") return copy.listBlacklist;
  if (list === "WHITELIST") return copy.listWhitelist;
  return copy.listNormal;
}

function SubjectSummary({
  subject,
  copy,
  locale,
}: {
  readonly subject: SubjectPanel;
  readonly copy: DataCopy;
  readonly locale: VoxWardLocale;
}) {
  const uniqueNotices = [...new Set(subject.notices)];
  return (
    <section aria-label={copy.summaryAria} className="vw-panel-card">
      <h2>{copy.summaryHeading}</h2>
      <KeyValueList
        items={[
          {
            key: "ref",
            label: copy.labelSubjectRef,
            value: (
              <bdi>
                <UntrustedText text={subject.subjectRef} />
              </bdi>
            ),
          },
          {
            key: "score",
            label: copy.labelScore,
            value: subject.currentScore === null ? copy.scoreUnset : formatNumber(subject.currentScore, locale),
          },
          {
            key: "list",
            label: copy.labelList,
            value: (
              <Badge
                tone={
                  subject.list === "BLACKLIST"
                    ? "danger"
                    : subject.list === "WHITELIST"
                      ? "positive"
                      : "neutral"
                }
              >
                {listLabel(subject.list, copy)}
              </Badge>
            ),
          },
          {
            key: "exception",
            label: copy.labelException,
            value: subject.exception?.active ? copy.exceptionActive : copy.exceptionNormal,
          },
          {
            key: "ledger",
            label: copy.labelLedger,
            value: copy.ledgerCount(formatNumber(subject.ledgerEntryCount, locale)),
          },
        ]}
      />

      {subject.retention.length > 0 ? (
        <TableShell
          label={copy.retentionTableLabel}
          columns={[
            { key: "category", label: copy.colCategory },
            { key: "count", label: copy.colCount },
            { key: "days", label: copy.colDays },
          ]}
          rows={subject.retention.map((row) => ({
            category: dataCategoryLabel(row.category, locale),
            count: formatNumber(row.count, locale),
            days: copy.daysUnit(formatNumber(row.retentionDays, locale)),
          }))}
        />
      ) : null}

      {uniqueNotices.map((code) => (
        <BannerNotice key={code} tone="warning">
          {copy.notices[code] ?? copy.noticeFallback}
        </BannerNotice>
      ))}
    </section>
  );
}

export function DataPanelView({
  channelId,
  dataHandle,
  query,
  subject,
  flow,
  message,
  locale = DEFAULT_VOXWARD_LOCALE,
  onQueryChange,
  onLookup,
  onChoose,
  onConfirm,
  onCancel,
  onVerify,
  onExecute,
}: DataPanelViewProps) {
  const copy = pickLocale(DATA_COPY, locale);

  if (dataHandle === null) {
    return (
      <section aria-label={copy.checkingAria}>
        <Card>
          <EmptyState title={copy.checkingTitle} description={copy.checkingDesc(channelId)} />
        </Card>
      </section>
    );
  }

  if (!dataHandle) {
    return (
      <section aria-label={copy.noPermAria}>
        <BannerNotice tone="warning">{copy.noPermMsg}</BannerNotice>
      </section>
    );
  }

  return (
    <div className="vw-stack-lg">
      {message ? <BannerNotice tone="warning">{message}</BannerNotice> : null}

      <section className="vw-panel-card" aria-label={copy.lookupAria}>
        <form
          className="vw-input-action-row"
          onSubmit={(event) => {
            event.preventDefault();
            onLookup();
          }}
        >
          <div className="vw-field-col">
            <label className="vw-field-label" htmlFor="data-subject-lookup">
              {copy.subjectRefLabel}
            </label>
            <Input
              id="data-subject-lookup"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={copy.subjectRefPlaceholder}
            />
          </div>
          <Button type="submit" variant="primary" disabled={query.trim() === ""}>
            {copy.lookupBtn}
          </Button>
        </form>
      </section>

      {subject !== null ? (
        <div className="vw-stack-lg">
          <SubjectSummary subject={subject} copy={copy} locale={locale} />
          <DeleteActions
            flow={flow}
            locale={locale}
            onChoose={onChoose}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
          <RequestStatus
            requests={subject.requests}
            canVerify={true}
            locale={locale}
            onVerify={onVerify}
            onExecute={onExecute}
          />
        </div>
      ) : (
        <Card tone="quiet">
          <EmptyState title={copy.emptyTitle} description={copy.emptyDesc} />
        </Card>
      )}
    </div>
  );
}

export interface DataComplianceSurfaceProps {
  readonly channelId: string;
  readonly api?: DataApi;
  readonly forceDataHandle?: boolean;
  readonly locale?: VoxWardLocale;
}

export function DataComplianceSurface({
  channelId,
  api,
  forceDataHandle,
  locale,
}: DataComplianceSurfaceProps) {
  const { locale: shellLocale } = useVoxWardShell();
  const resolvedLocale = locale ?? shellLocale;
  const client = useMemo(() => api ?? createDataApi(), [api]);
  const [dataHandle, setDataHandle] = useState<boolean | null>(forceDataHandle ?? null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectPanel | null>(null);
  const [flow, setFlow] = useState<DeleteFlow>(IDLE_FLOW);
  const [errorObj, setErrorObj] = useState<unknown>(null);

  useEffect(() => {
    if (forceDataHandle !== undefined) {
      setDataHandle(forceDataHandle);
      return;
    }
    let active = true;
    setDataHandle(null);
    client
      .capabilities(channelId)
      .then((res) => {
        if (active) setDataHandle(res.dataHandle);
      })
      .catch((error) => {
        if (!active) return;
        setDataHandle(false);
        setErrorObj(error);
      });
    return () => {
      active = false;
    };
  }, [channelId, client, forceDataHandle]);

  const handleLookup = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setErrorObj(null);
    setFlow(IDLE_FLOW);
    try {
      const panel = await client.subject(channelId, trimmed);
      setSubject(panel);
    } catch (error) {
      setSubject(null);
      setErrorObj(error);
    }
  }, [channelId, client, query]);

  const handleConfirmDelete = async () => {
    if (flow.phase !== "confirming" || subject === null) return;
    const mode = flow.mode;
    setFlow((prev) => reduceDeleteFlow(prev, { type: "confirm" }));
    try {
      const req = await client.register(channelId, deleteRequestInput(subject.subjectRef, mode));
      setFlow((prev) => reduceDeleteFlow(prev, { type: "registered", requestId: req.requestId }));
      const refreshed = await client.subject(channelId, subject.subjectRef);
      setSubject(refreshed);
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as { code: string }).code) : "INTERNAL_ERROR";
      setFlow((prev) => reduceDeleteFlow(prev, { type: "failed", code }));
    }
  };

  const handleVerify = async (requestId: string, input: VerificationInput) => {
    if (subject === null) return;
    setErrorObj(null);
    try {
      await client.decideVerification(channelId, requestId, input);
      const refreshed = await client.subject(channelId, subject.subjectRef);
      setSubject(refreshed);
    } catch (error) {
      setErrorObj(error);
    }
  };

  const handleExecute = async (requestId: string) => {
    if (subject === null) return;
    setErrorObj(null);
    try {
      await client.execute(channelId, requestId);
      const refreshed = await client.subject(channelId, subject.subjectRef);
      setSubject(refreshed);
    } catch (error) {
      setErrorObj(error);
    }
  };

  const message = errorObj === null ? null : messageFor(errorObj, resolvedLocale);

  return (
    <DataPanelView
      channelId={channelId}
      dataHandle={dataHandle}
      query={query}
      subject={subject}
      flow={flow}
      message={message}
      locale={resolvedLocale}
      onQueryChange={setQuery}
      onLookup={() => void handleLookup()}
      onChoose={(mode) => setFlow((prev) => reduceDeleteFlow(prev, { type: "choose", mode }))}
      onConfirm={() => void handleConfirmDelete()}
      onCancel={() => setFlow((prev) => reduceDeleteFlow(prev, { type: "cancel" }))}
      onVerify={(reqId, inp) => void handleVerify(reqId, inp)}
      onExecute={(reqId) => void handleExecute(reqId)}
    />
  );
}

export function DataPanelPage({ api }: { readonly api?: DataApi }) {
  const params = useParams();
  const { activeChannelId } = useVoxWardShell();
  const channelId = params.channelId ?? activeChannelId;

  return (
    <VoxWardShell
      activeNavId="data"
      channelId={channelId}
      showChannelSelector
      requireAuth
      pageTitle={(locale) => pickLocale(DATA_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(DATA_COPY, locale).pageDescription}
    >
      <DataComplianceSurface channelId={channelId} api={api} />
    </VoxWardShell>
  );
}
