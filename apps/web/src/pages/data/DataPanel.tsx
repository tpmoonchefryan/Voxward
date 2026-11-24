import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import type { DeleteMode } from "@voxward/contracts";
import { Badge, Button, Card, EmptyState, Input, KeyValueList, TableShell } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import { createDataApi, messageFor, type DataApi, type SubjectPanel, type VerificationInput } from "./api";
import { DeleteActions } from "./DeleteActions";
import { deleteRequestInput, IDLE_FLOW, reduceDeleteFlow, type DeleteFlow } from "./flow";
import { NOTICE_TEXT, RequestStatus } from "./RequestStatus";

export interface DataPanelViewProps {
  readonly channelId: string;
  /** Null while the capability is being read. False hides every data action. */
  readonly dataHandle: boolean | null;
  readonly query: string;
  readonly subject: SubjectPanel | null;
  readonly flow: DeleteFlow;
  readonly message: string | null;
  readonly onQueryChange: (value: string) => void;
  readonly onLookup: () => void;
  readonly onChoose: (mode: DeleteMode) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onVerify: (requestId: string, input: VerificationInput) => void;
}

function listLabel(list: SubjectPanel["list"]): string {
  if (list === "BLACKLIST") return "频道黑名单";
  if (list === "WHITELIST") return "频道白名单";
  return "常规观众";
}

function SubjectSummary({ subject }: { readonly subject: SubjectPanel }) {
  const uniqueNotices = [...new Set(subject.notices)];
  return (
    <section aria-label="主体概况" className="vw-panel-card">
      <h2>主体概况</h2>
      <KeyValueList
        items={[
          {
            key: "ref",
            label: "主体编号",
            value: (
              <bdi>
                <UntrustedText text={subject.subjectRef} />
              </bdi>
            ),
          },
          {
            key: "score",
            label: "当前信任积分",
            value: subject.currentScore === null ? "未建分" : String(subject.currentScore),
          },
          {
            key: "list",
            label: "名单标记",
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
                {listLabel(subject.list)}
              </Badge>
            ),
          },
          {
            key: "exception",
            label: "计分例外状态",
            value: subject.exception?.active ? "已启用例外（新发言入人工队列）" : "按正常规则计分",
          },
          {
            key: "ledger",
            label: "积分流水记录数",
            value: `${subject.ledgerEntryCount} 条`,
          },
        ]}
      />

      {subject.retention.length > 0 ? (
        <TableShell
          label="类别与数据保留周期"
          columns={[
            { key: "category", label: "数据类别" },
            { key: "count", label: "保留记录条数" },
            { key: "days", label: "保留上限（天）" },
          ]}
          rows={subject.retention.map((row) => ({
            category: row.category,
            count: row.count,
            days: `${row.retentionDays} 天`,
          }))}
        />
      ) : null}

      {uniqueNotices.map((code) => (
        <BannerNotice key={code} tone="warning">
          {NOTICE_TEXT[code] ?? "外部平台数据副本不由本实例统一清理。"}
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
  onQueryChange,
  onLookup,
  onChoose,
  onConfirm,
  onCancel,
  onVerify,
}: DataPanelViewProps) {
  if (dataHandle === null) {
    return (
      <section aria-label="数据权限检测">
        <Card>
          <EmptyState title="正在检查权限…" description={`当前正在核实频道 ${channelId} 的数据合规授权。`} />
        </Card>
      </section>
    );
  }

  if (!dataHandle) {
    return (
      <section aria-label="无数据管理权限">
        <BannerNotice tone="warning">
          当前账号没有数据管理权限，请联系频道所有者在「成员与权限」授予数据合规处置角色。
        </BannerNotice>
      </section>
    );
  }

  return (
    <div className="vw-stack-lg">
      {message ? <BannerNotice tone="warning">{message}</BannerNotice> : null}

      <section className="vw-panel-card" aria-label="按观众标识查询">
        <form
          className="vw-row-wrap"
          onSubmit={(event) => {
            event.preventDefault();
            onLookup();
          }}
        >
          <div className="vw-field-col">
            <label className="vw-field-label" htmlFor="data-subject-lookup">
              观众唯一标识（Subject Ref）
            </label>
            <Input
              id="data-subject-lookup"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="输入稳定主体编号，例如：sub_1024"
            />
          </div>
          <Button type="submit" variant="primary" disabled={query.trim() === ""}>
            检索主体档案
          </Button>
        </form>
      </section>

      {subject !== null ? (
        <div className="vw-stack-lg">
          <SubjectSummary subject={subject} />
          <DeleteActions flow={flow} onChoose={onChoose} onConfirm={onConfirm} onCancel={onCancel} />
          <RequestStatus requests={subject.requests} canVerify={true} onVerify={onVerify} />
        </div>
      ) : (
        <Card tone="quiet">
          <EmptyState
            title="请先查询观众档案"
            description="输入稳定观众编号以查看积分数、留存策略摘要，以及发起导出/删除清理流程。"
          />
        </Card>
      )}
    </div>
  );
}

export interface DataComplianceSurfaceProps {
  readonly channelId: string;
  readonly api?: DataApi;
  readonly forceDataHandle?: boolean;
}

export function DataComplianceSurface({
  channelId,
  api,
  forceDataHandle,
}: DataComplianceSurfaceProps) {
  const client = useMemo(() => api ?? createDataApi(), [api]);
  const [dataHandle, setDataHandle] = useState<boolean | null>(forceDataHandle ?? null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectPanel | null>(null);
  const [flow, setFlow] = useState<DeleteFlow>(IDLE_FLOW);
  const [message, setMessage] = useState<string | null>(null);

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
        setMessage(messageFor(error));
      });
    return () => {
      active = false;
    };
  }, [channelId, client, forceDataHandle]);

  const handleLookup = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setMessage(null);
    setFlow(IDLE_FLOW);
    try {
      const panel = await client.subject(channelId, trimmed);
      setSubject(panel);
    } catch (error) {
      setSubject(null);
      setMessage(messageFor(error));
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
    setMessage(null);
    try {
      await client.decideVerification(channelId, requestId, input);
      const refreshed = await client.subject(channelId, subject.subjectRef);
      setSubject(refreshed);
    } catch (error) {
      setMessage(messageFor(error));
    }
  };

  return (
    <DataPanelView
      channelId={channelId}
      dataHandle={dataHandle}
      query={query}
      subject={subject}
      flow={flow}
      message={message}
      onQueryChange={setQuery}
      onLookup={() => void handleLookup()}
      onChoose={(mode) => setFlow((prev) => reduceDeleteFlow(prev, { type: "choose", mode }))}
      onConfirm={() => void handleConfirmDelete()}
      onCancel={() => setFlow((prev) => reduceDeleteFlow(prev, { type: "cancel" }))}
      onVerify={(reqId, inp) => void handleVerify(reqId, inp)}
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
      pageTitle="数据合规"
      pageDescription="仅限获授数据合规处理权限的操作员查询观众档案、登记异步清理并完成身份核验。"
    >
      <DataComplianceSurface channelId={channelId} api={api} />
    </VoxWardShell>
  );
}
