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

function techStatusBadge(status: LogViewerTechnicalItem["status"]) {
  if (status === "FAILED" || status === "TIMED_OUT") {
    return <Badge tone="danger">{status === "TIMED_OUT" ? "超时" : "异常"}</Badge>;
  }
  if (status === "SKIPPED") {
    return <Badge tone="neutral">跳过</Badge>;
  }
  return <Badge tone="positive">完成</Badge>;
}

export function LogViewerPage({ fetchImpl }: { readonly fetchImpl?: FetchLike }) {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeChannelId } = useVoxWardShell();
  const channelId = params.channelId ?? activeChannelId;

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
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    const paramCorr = searchParams.get("correlationId");
    if (paramTab) setTab(normalizeTab(paramTab));
    if (paramCorr !== null) setCorrelationFilter(paramCorr);
  }, [searchParams]);

  const loadCurrentTab = useCallback(async () => {
    setErrorText(null);
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
      setErrorText(describeLogError(error));
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
    <VoxWardShell
      activeNavId="logs"
      channelId={channelId}
      showChannelSelector
      requireAuth
      pageTitle="日志审计"
      pageDescription="双向关联检索频道系统处理链路、配置变更审计日志以及第三方 HTTP 请求脱敏报文。"
    >
      <div className="vw-stack-md">
        {errorText ? <BannerNotice tone="danger">{errorText}</BannerNotice> : null}

        {chainCorrelationId !== null ? (
          <section className="vw-panel-card" aria-label="单条关联链路追查">
            <CorrelationChain
              channelId={channelId}
              correlationId={chainCorrelationId}
              initialLogId={chainInitialLogId}
              fetchImpl={fetchImpl}
              onBack={() => setChainCorrelationId(null)}
            />
          </section>
        ) : (
          <div className="vw-stack-md">
            <section className="vw-panel-card" aria-label="日志关联筛选栏">
              <div className="vw-row-wrap">
                <div className="vw-field-col">
                  <label className="vw-field-label" htmlFor="log-corr-filter">
                    按关联追踪号检索（支持跨技术/变更/集成日志联合排查）
                  </label>
                  <SearchInput
                    id="log-corr-filter"
                    fill
                    value={correlationFilter}
                    onChange={(e) => setCorrelationFilter(e.target.value)}
                    placeholder="输入关联编号过滤…"
                  />
                </div>
                <Button size="sm" variant="secondary" onClick={() => void loadCurrentTab()}>
                  刷新日志
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
                    清除过滤
                  </Button>
                ) : null}
              </div>
            </section>

            <SectionTabs
              label="日志审计分类"
              selectedId={tab}
              onSelect={handleSelectTab}
              items={[
                { id: "technical", label: "技术日志" },
                { id: "change", label: "变更日志" },
                { id: "integration", label: "集成日志" },
              ]}
            >
              {tab === "technical" ? (
                <div className="vw-split-host">
                  <SplitView
                    label="技术日志列表与详情"
                    locale="zh-CN"
                    detailPopulated={selectedTechId !== null}
                    list={
                      technicalItems.length === 0 ? (
                        <EmptyState title="暂无技术日志" />
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
                                    {techStatusBadge(item.status)}
                                  </div>
                                  <span className="vw-caption">
                                    {new Date(item.occurredAt).toLocaleString()}
                                  </span>
                                  <div className="vw-row-wrap">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => setSelectedTechId(item.id)}
                                    >
                                      查看详情
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="quiet"
                                      onClick={() => {
                                        setChainInitialLogId(item.id);
                                        setChainCorrelationId(item.correlationId);
                                      }}
                                    >
                                      查看整条链路
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
                        />
                      ) : (
                        <EmptyState title="从左侧选择一条技术日志查看节点快照" />
                      )
                    }
                  />
                </div>
              ) : tab === "change" ? (
                <section className="vw-panel-card" aria-label="变更审计日志表">
                  <TableShell
                    label="变更日志"
                    columns={[
                      { key: "occurredAt", label: "发生时间" },
                      { key: "kind", label: "变更类别" },
                      { key: "outcome", label: "执行结果" },
                      { key: "actor", label: "操作主体" },
                      { key: "summary", label: "摘要说明" },
                      { key: "actions", label: "链路追踪", align: "end" },
                    ]}
                    rows={changeItems.map((item) => ({
                      occurredAt: new Date(item.occurredAt).toLocaleString(),
                      kind: labelForChangeKind(item.changeKind),
                      outcome: (
                        <Badge tone={item.outcome === "SUCCEEDED" ? "positive" : "danger"}>
                          {labelForChangeOutcome(item.outcome)}
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
                          追踪处理链路
                        </Button>
                      ) : (
                        <span className="vw-caption">无关联链路</span>
                      ),
                    }))}
                    emptyState={<EmptyState title="暂无变更记录" />}
                  />
                </section>
              ) : (
                <div className="vw-split-host">
                  <SplitView
                    label="第三方集成 HTTP 日志与脱敏报文"
                    locale="zh-CN"
                    detailPopulated={selectedIntegration !== null}
                    list={
                      integrationItems.length === 0 ? (
                        <EmptyState
                          title="暂无第三方集成请求日志"
                          description="在「集成管理」执行连通检测或拉取模型列表后，脱敏请求头与原始返回体将记录于此。"
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
                                  <span className="vw-caption">{`${item.latencyMs} 毫秒`}</span>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedIntegrationId(item.id)}
                                  >
                                    查看 HTTP 报文
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
                        <section className="vw-stack-md" aria-label="HTTP 报文详情">
                          <KeyValueList
                            items={[
                              {
                                key: "adapter",
                                label: "适配器实例",
                                value: <UntrustedText text={selectedIntegration.adapterName} />,
                              },
                              {
                                key: "request",
                                label: "HTTP 请求摘要",
                                value: (
                                  <span className="vw-mono">
                                    {`${selectedIntegration.method} ${selectedIntegration.url}`}
                                  </span>
                                ),
                              },
                              {
                                key: "status",
                                label: "响应状态码 / 耗时",
                                value: `${selectedIntegration.statusCode}（${selectedIntegration.latencyMs} ms）`,
                              },
                              {
                                key: "corr",
                                label: "关联追踪号",
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
                                      跳转关联链路
                                    </Button>
                                  </div>
                                ),
                              },
                            ]}
                          />

                          <RawPayloadBox
                            label="请求头（已按安全策略自动脱敏敏感认证头）"
                            payload={JSON.stringify(selectedIntegration.requestHeaders, null, 2)}
                            copyable
                            copyLabel="复制请求头"
                          />

                          {selectedIntegration.rawRequestBody !== null ? (
                            <RawPayloadBox
                              label="原始请求体"
                              payload={selectedIntegration.rawRequestBody}
                              copyable
                              copyLabel="复制请求体"
                            />
                          ) : null}

                          <RawPayloadBox
                            label="响应头（已脱敏）"
                            payload={JSON.stringify(selectedIntegration.responseHeaders, null, 2)}
                          />

                          {selectedIntegration.rawResponseBody !== null ? (
                            <RawPayloadBox
                              label="原始响应体"
                              payload={selectedIntegration.rawResponseBody}
                              copyable
                              copyLabel="复制响应体"
                            />
                          ) : null}
                        </section>
                      ) : (
                        <EmptyState title="从左侧选择一条集成日志查看 HTTP 请求与响应原文" />
                      )
                    }
                  />
                </div>
              )}
            </SectionTabs>
          </div>
        )}
      </div>
    </VoxWardShell>
  );
}
