import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValueList,
  RawPayloadBox,
  SearchInput,
  SplitView,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { LOGS_COPY, pickLocale, type LogsCopy } from "../../i18n";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import {
  describeLogError,
  fetchChangePage,
  fetchIntegrationPage,
  fetchTechnicalPage,
  labelForChangeKind,
  labelForChangeOutcome,
  type FetchLike,
  type IntegrationLogItem,
  type LogViewerChangeItem,
  type LogViewerTechnicalItem,
} from "./api";
import { CorrelationChain } from "./CorrelationChain";
import { JsonPanel } from "./JsonPanel";

type LogTabId = "technical" | "change" | "integration";

function normalizeTab(value: string | null): LogTabId {
  if (value === "change" || value === "integration") return value;
  return "technical";
}

function techStatusBadge(status: LogViewerTechnicalItem["status"], copy: LogsCopy) {
  if (status === "FAILED" || status === "TIMED_OUT") {
    return (
      <Badge tone="danger">
        {status === "TIMED_OUT" ? copy.techStatus.timedOut : copy.techStatus.failed}
      </Badge>
    );
  }
  if (status === "SKIPPED") {
    return <Badge tone="neutral">{copy.techStatus.skipped}</Badge>;
  }
  return <Badge tone="positive">{copy.techStatus.ok}</Badge>;
}

function LogViewerSurface({
  channelIdParam,
  fetchImpl,
}: {
  readonly channelIdParam?: string;
  readonly fetchImpl?: FetchLike;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeChannelId, locale } = useVoxWardShell();
  const channelId = channelIdParam ?? activeChannelId;
  const copy = pickLocale(LOGS_COPY, locale);

  const [tab, setTab] = useState<LogTabId>(() => normalizeTab(searchParams.get("tab")));
  const [correlationFilter, setCorrelationFilter] = useState<string>(
    () => searchParams.get("correlationId") ?? "",
  );
  const [chainCorrelationId, setChainCorrelationId] = useState<string | null>(null);
  const [chainInitialLogId, setChainInitialLogId] = useState<string | null>(null);

  const [technicalItems, setTechnicalItems] = useState<readonly LogViewerTechnicalItem[]>([]);
  const [changeItems, setChangeItems] = useState<readonly LogViewerChangeItem[]>([]);
  const [integrationItems, setIntegrationItems] = useState<readonly IntegrationLogItem[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<unknown>(null);

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    const paramCorr = searchParams.get("correlationId");
    if (paramTab) setTab(normalizeTab(paramTab));
    if (paramCorr !== null) setCorrelationFilter(paramCorr);
  }, [searchParams]);

  const loadCurrentTab = useCallback(async () => {
    setFetchError(null);
    const corr = correlationFilter.trim() || undefined;
    try {
      if (tab === "technical") {
        const page = await fetchTechnicalPage(channelId, { limit: 50 }, { fetchImpl });
        setTechnicalItems(page.items);
        setSelectedTechId((prev) => prev ?? page.items[0]?.id ?? null);
      } else if (tab === "change") {
        const page = await fetchChangePage(channelId, { correlationId: corr, limit: 50 }, { fetchImpl });
        setChangeItems(page.items);
      } else {
        const page = await fetchIntegrationPage(
          channelId,
          { correlationId: corr, limit: 50 },
          { fetchImpl },
        );
        setIntegrationItems(page.items);
        setSelectedIntegrationId((prev) => prev ?? page.items[0]?.id ?? null);
      }
    } catch (error) {
      setFetchError(error);
    }
  }, [channelId, tab, correlationFilter, fetchImpl]);

  useEffect(() => {
    void loadCurrentTab();
  }, [loadCurrentTab]);

  const selectedIntegration =
    integrationItems.find((item) => item.id === selectedIntegrationId) ?? integrationItems[0] ?? null;

  const handleSelectTab = (next: string) => {
    const nextTab = normalizeTab(next);
    setTab(nextTab);
    setChainCorrelationId(null);
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set("tab", nextTab);
      return updated;
    });
  };

  return (
    <div className="vw-stack-md">
      {fetchError !== null ? (
        <BannerNotice tone="danger">{describeLogError(fetchError, locale)}</BannerNotice>
      ) : null}

      {chainCorrelationId !== null ? (
        <section className="vw-panel-card" aria-label={copy.chainAria}>
          <CorrelationChain
            channelId={channelId}
            correlationId={chainCorrelationId}
            initialLogId={chainInitialLogId}
            fetchImpl={fetchImpl}
            locale={locale}
            onBack={() => setChainCorrelationId(null)}
          />
        </section>
      ) : (
        <div className="vw-stack-md">
          <section className="vw-panel-card" aria-label={copy.filterAria}>
            <div className="vw-input-action-row">
              <div className="vw-field-col">
                <label className="vw-field-label" htmlFor="log-corr-filter">
                  {copy.filterLabel}
                </label>
                <SearchInput
                  id="log-corr-filter"
                  fill
                  value={correlationFilter}
                  onChange={(e) => setCorrelationFilter(e.target.value)}
                  placeholder={copy.filterPlaceholder}
                />
              </div>
              <Button size="sm" variant="secondary" onClick={() => void loadCurrentTab()}>
                {copy.refreshBtn}
              </Button>
              {correlationFilter.trim() ? (
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setCorrelationFilter("");
                    setSearchParams((prev) => {
                      const updated = new URLSearchParams(prev);
                      updated.delete("correlationId");
                      return updated;
                    });
                  }}
                >
                  {copy.clearFilterBtn}
                </Button>
              ) : null}
            </div>
          </section>

          <SectionTabs
            label={copy.tabsAria}
            selectedId={tab}
            onSelect={handleSelectTab}
            items={[
              { id: "technical", label: copy.tabs.technical },
              { id: "change", label: copy.tabs.change },
              { id: "integration", label: copy.tabs.integration },
            ]}
          >
            {tab === "technical" ? (
              <div className="vw-split-host">
                <SplitView
                  label={copy.splitTechLabel}
                  locale={locale}
                  detailPopulated={selectedTechId !== null}
                  list={
                    technicalItems.length === 0 ? (
                      <EmptyState title={copy.emptyTechTitle} />
                    ) : (
                      <div className="vw-stack-sm">
                        {technicalItems
                          .filter(
                            (item) =>
                              !correlationFilter.trim() ||
                              item.correlationId.includes(correlationFilter.trim()),
                          )
                          .map((item) => (
                            <Card key={item.id} tone={selectedTechId === item.id ? "raised" : "neutral"}>
                              <div className="vw-stack-sm">
                                <div className="vw-row-between">
                                  <strong>{`#${item.sequence} ${item.stage}`}</strong>
                                  {techStatusBadge(item.status, copy)}
                                </div>
                                <div className="vw-row-between">
                                  <span className="vw-mono vw-caption">
                                    <UntrustedText text={item.correlationId} />
                                  </span>
                                  {item.latencyMs !== null ? (
                                    <span className="vw-caption">{`${item.latencyMs} ms`}</span>
                                  ) : null}
                                </div>
                                <span className="vw-caption">
                                  {new Date(item.occurredAt).toLocaleString(locale)}
                                </span>
                                <div className="vw-row-wrap">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedTechId(item.id)}
                                  >
                                    {copy.viewDetailBtn}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="quiet"
                                    onClick={() => {
                                      setChainInitialLogId(item.id);
                                      setChainCorrelationId(item.correlationId);
                                    }}
                                  >
                                    {copy.viewChainBtn}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    )
                  }
                  detail={
                    selectedTechId !== null ? (
                      <JsonPanel
                        channelId={channelId}
                        logId={selectedTechId}
                        fetchImpl={fetchImpl}
                        locale={locale}
                      />
                    ) : (
                      <EmptyState title={copy.emptyTechDetailTitle} />
                    )
                  }
                />
              </div>
            ) : tab === "change" ? (
              <section className="vw-panel-card" aria-label={copy.changeSectionAria}>
                <TableShell
                  label={copy.changeTableLabel}
                  columns={[
                    { key: "occurredAt", label: copy.colsChange.occurredAt },
                    { key: "kind", label: copy.colsChange.kind },
                    { key: "outcome", label: copy.colsChange.outcome },
                    { key: "actor", label: copy.colsChange.actor },
                    { key: "summary", label: copy.colsChange.summary },
                    { key: "actions", label: copy.colsChange.actions, align: "end" },
                  ]}
                  rows={changeItems.map((item) => ({
                    occurredAt: new Date(item.occurredAt).toLocaleString(locale),
                    kind: labelForChangeKind(item.changeKind, locale),
                    outcome: (
                      <Badge tone={item.outcome === "SUCCEEDED" ? "positive" : "danger"}>
                        {labelForChangeOutcome(item.outcome, locale)}
                      </Badge>
                    ),
                    actor: <UntrustedText text={item.actor.ref} />,
                    summary: <UntrustedText text={item.summary} />,
                    actions: item.correlationId ? (
                      <Button
                        size="sm"
                        variant="quiet"
                        onClick={() => {
                          setChainInitialLogId(null);
                          setChainCorrelationId(item.correlationId);
                        }}
                      >
                        {copy.traceChainBtn}
                      </Button>
                    ) : (
                      <span className="vw-caption">{copy.noChainLabel}</span>
                    ),
                  }))}
                  emptyState={<EmptyState title={copy.emptyChangeTitle} />}
                />
              </section>
            ) : (
              <div className="vw-split-host">
                <SplitView
                  label={copy.splitIntLabel}
                  locale={locale}
                  detailPopulated={selectedIntegration !== null}
                  list={
                    integrationItems.length === 0 ? (
                      <EmptyState
                        title={copy.emptyIntTitle}
                        description={copy.emptyIntDesc}
                      />
                    ) : (
                      <div className="vw-stack-sm">
                        {integrationItems.map((item) => (
                          <Card
                            key={item.id}
                            tone={selectedIntegration?.id === item.id ? "raised" : "neutral"}
                          >
                            <div className="vw-stack-sm">
                              <div className="vw-row-between">
                                <strong>
                                  <UntrustedText text={item.adapterName} />
                                </strong>
                                <Badge tone={item.statusCode < 400 ? "positive" : "danger"}>
                                  {`${item.method} ${item.statusCode}`}
                                </Badge>
                              </div>
                              <span className="vw-mono">
                                <UntrustedText text={item.url} />
                              </span>
                              <div className="vw-row-between">
                                <span className="vw-caption">{`${item.latencyMs} ms`}</span>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setSelectedIntegrationId(item.id)}
                                >
                                  {copy.viewHttpBtn}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )
                  }
                  detail={
                    selectedIntegration !== null ? (
                      <section className="vw-stack-md" aria-label={copy.httpDetailAria}>
                        <KeyValueList
                          items={[
                            {
                              key: "adapter",
                              label: copy.adapterLabel,
                              value: <UntrustedText text={selectedIntegration.adapterName} />,
                            },
                            {
                              key: "request",
                              label: copy.reqSummaryLabel,
                              value: (
                                <span className="vw-mono">
                                  {`${selectedIntegration.method} ${selectedIntegration.url}`}
                                </span>
                              ),
                            },
                            {
                              key: "status",
                              label: copy.statusLatencyLabel,
                              value: `${selectedIntegration.statusCode} (${selectedIntegration.latencyMs} ms)`,
                            },
                            {
                              key: "corr",
                              label: copy.corrLabel,
                              value: (
                                <div className="vw-row-wrap">
                                  <span className="vw-mono">{selectedIntegration.correlationId}</span>
                                  <Button
                                    size="sm"
                                    variant="quiet"
                                    onClick={() => {
                                      setChainInitialLogId(null);
                                      setChainCorrelationId(selectedIntegration.correlationId);
                                    }}
                                  >
                                    {copy.jumpChainBtn}
                                  </Button>
                                </div>
                              ),
                            },
                          ]}
                        />

                        <RawPayloadBox
                          label={copy.reqHeadersLabel}
                          payload={JSON.stringify(selectedIntegration.requestHeaders, null, 2)}
                          copyable
                          copyLabel={copy.copyHeadersLabel}
                        />

                        {selectedIntegration.rawRequestBody !== null ? (
                          <RawPayloadBox
                            label={copy.reqBodyLabel}
                            payload={selectedIntegration.rawRequestBody}
                            copyable
                            copyLabel={copy.copyBodyLabel}
                          />
                        ) : null}

                        <RawPayloadBox
                          label={copy.resHeadersLabel}
                          payload={JSON.stringify(selectedIntegration.responseHeaders, null, 2)}
                        />

                        {selectedIntegration.rawResponseBody !== null ? (
                          <RawPayloadBox
                            label={copy.resBodyLabel}
                            payload={selectedIntegration.rawResponseBody}
                            copyable
                            copyLabel={copy.copyResBodyLabel}
                          />
                        ) : null}
                      </section>
                    ) : (
                      <EmptyState title={copy.emptyIntDetailTitle} />
                    )
                  }
                />
              </div>
            )}
          </SectionTabs>
        </div>
      )}
    </div>
  );
}

export function LogViewerPage({ fetchImpl }: { readonly fetchImpl?: FetchLike }) {
  const params = useParams();

  return (
    <VoxWardShell
      activeNavId="logs"
      channelId={params.channelId}
      showChannelSelector
      requireAuth
      pageTitle={(locale) => pickLocale(LOGS_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(LOGS_COPY, locale).pageDescription}
    >
      <LogViewerSurface channelIdParam={params.channelId} fetchImpl={fetchImpl} />
    </VoxWardShell>
  );
}
