import { useEffect, useState, type ReactNode } from "react";
import type { LogViewerEvidence, LogViewerTechnicalDetail, TechnicalData } from "@voxward/contracts";
import { Badge, Card, EmptyState, KeyValueList } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { describeLogError, fetchTechnicalDetail, type FetchLike } from "./api";
import { IsolatedText } from "./IsolatedText";

const EVIDENCE_LABELS: Readonly<Record<LogViewerEvidence["kind"], string>> = {
  MESSAGE_TEXT: "消息原文",
  TRANSLATION: "译文",
  ITEM_ID_MAP: "临时编号映射",
  VALIDATED_JSON: "校验后 JSON",
};

/** Pretty-prints a validated JSON payload. A payload that does not parse is shown as it is, and says so. */
export function formatValidatedJson(payload: string): { readonly text: string; readonly parsed: boolean } {
  try {
    return { text: JSON.stringify(JSON.parse(payload), null, 2), parsed: true };
  } catch {
    return { text: payload, parsed: false };
  }
}

function evidenceBody(item: LogViewerEvidence): ReactNode {
  if (item.state === "EXPIRED") {
    return (
      <div className="vw-row-wrap">
        <Badge tone="neutral">内容已到期</Badge>
      </div>
    );
  }
  if (item.payload === null) {
    return <span className="vw-muted">空</span>;
  }
  if (item.kind === "VALIDATED_JSON") {
    const formatted = formatValidatedJson(item.payload);
    return (
      <div className="vw-stack-sm">
        {!formatted.parsed ? <Badge tone="warning">未通过 JSON 解析</Badge> : null}
        <pre>
          <IsolatedText text={formatted.text} />
        </pre>
      </div>
    );
  }
  return (
    <pre>
      <IsolatedText text={item.payload} />
    </pre>
  );
}

function DataList({ data }: { readonly data: TechnicalData }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div className="vw-stack-sm">
      <span className="vw-caption">阶段数据</span>
      <div className="vw-row-wrap">
        {entries.map(([key, value]) => (
          <Badge key={key} tone="neutral">
            <span className="vw-mono">
              {key}: {value === null ? "无" : <IsolatedText text={String(value)} />}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export interface JsonPanelProps {
  readonly channelId: string;
  readonly logId: string;
  readonly fetchImpl?: FetchLike;
}

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly detail: LogViewerTechnicalDetail };

export function JsonPanel({ channelId, logId, fetchImpl }: JsonPanelProps) {
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    fetchTechnicalDetail(channelId, logId, { fetchImpl })
      .then((detail) => {
        if (active) setState({ status: "ready", detail });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: describeLogError(error) });
      });
    return () => {
      active = false;
    };
  }, [channelId, logId, fetchImpl]);

  if (state.status === "loading") return <EmptyState title="正在加载详情…" />;
  if (state.status === "error") return <BannerNotice tone="danger">{state.message}</BannerNotice>;
  return <JsonPanelView detail={state.detail} />;
}

export function JsonPanelView({ detail }: { readonly detail: LogViewerTechnicalDetail }) {
  return (
    <section aria-label="日志详情" className="vw-stack-md">
      <Card>
        <div className="vw-stack-sm">
          <div className="vw-row-between">
            <strong>{`日志详情 · #${detail.sequence} ${detail.stage}`}</strong>
            <Badge tone="neutral">
              <span className="vw-mono">
                <IsolatedText text={detail.id} />
              </span>
            </Badge>
          </div>
          <KeyValueList
            items={[
              {
                key: "taskId",
                label: "任务",
                value: detail.taskId === null ? "无" : <IsolatedText text={detail.taskId} />,
              },
              {
                key: "modelRef",
                label: "模型",
                value: detail.modelRef === null ? "无" : <IsolatedText text={detail.modelRef} />,
              },
              {
                key: "contractVersion",
                label: "契约版本",
                value: <IsolatedText text={detail.contractVersion} />,
              },
              {
                key: "ruleTemplateVersion",
                label: "规则模板版本",
                value:
                  detail.ruleTemplateVersion === null ? (
                    "无"
                  ) : (
                    <IsolatedText text={detail.ruleTemplateVersion} />
                  ),
              },
              {
                key: "batchId",
                label: "批次",
                value: detail.batchId === null ? "无" : <IsolatedText text={detail.batchId} />,
              },
              {
                key: "errorCode",
                label: "错误代码",
                value: detail.errorCode === null ? "无" : <IsolatedText text={detail.errorCode} />,
              },
            ]}
          />
          {detail.data === null ? null : <DataList data={detail.data} />}
        </div>
      </Card>

      {detail.evidence.map((item) => (
        <Card key={item.kind} tone="quiet">
          <details>
            <summary>{EVIDENCE_LABELS[item.kind]}</summary>
            {evidenceBody(item)}
          </details>
        </Card>
      ))}
    </section>
  );
}
