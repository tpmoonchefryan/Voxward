import { useEffect, useState, type ReactNode } from "react";
import type { LogViewerEvidence, LogViewerTechnicalDetail } from "@voxward/contracts";
import { IsolatedText } from "./IsolatedText";
import { describeLogError, fetchTechnicalDetail, type FetchLike } from "./api";

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

export interface JsonPanelProps {
  readonly channelId: string;
  readonly logId: string;
  readonly fetchImpl?: FetchLike;
}

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly detail: LogViewerTechnicalDetail };

/** Loads one entry's detail and shows it. The chain view renders this for the selected entry. */
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

  if (state.status === "loading") return <p role="status">正在加载详情…</p>;
  if (state.status === "error") return <p role="alert">{state.message}</p>;
  return <JsonPanelView detail={state.detail} />;
}

/**
 * The detail as it is shown. Content sections are collapsed by default. A content kind the reader lacks the permission
 * for is not in `evidence`, so no section is rendered for it.
 */
export function JsonPanelView({ detail }: { readonly detail: LogViewerTechnicalDetail }) {
  return (
    <section aria-label="日志详情">
      <dl>
        <dt>任务</dt>
        <dd>{detail.taskId === null ? "无" : <IsolatedText text={detail.taskId} />}</dd>
        <dt>模型</dt>
        <dd>{detail.modelRef === null ? "无" : <IsolatedText text={detail.modelRef} />}</dd>
        <dt>契约版本</dt>
        <dd>
          <IsolatedText text={detail.contractVersion} />
        </dd>
        <dt>规则模板版本</dt>
        <dd>{detail.ruleTemplateVersion === null ? "无" : <IsolatedText text={detail.ruleTemplateVersion} />}</dd>
        <dt>批次</dt>
        <dd>{detail.batchId === null ? "无" : <IsolatedText text={detail.batchId} />}</dd>
        <dt>错误代码</dt>
        <dd>{detail.errorCode === null ? "无" : <IsolatedText text={detail.errorCode} />}</dd>
      </dl>
      {detail.data === null ? null : <DataList data={detail.data} />}
      {detail.evidence.map((item) => (
        <details key={item.kind}>
          <summary>{EVIDENCE_LABELS[item.kind]}</summary>
          {evidenceBody(item)}
        </details>
      ))}
    </section>
  );
}

function DataList({ data }: { readonly data: Readonly<Record<string, string | number | boolean | null>> }) {
  return (
    <dl aria-label="阶段数据">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <dt>
            <IsolatedText text={key} />
          </dt>
          <dd>
            <IsolatedText text={value === null ? "无" : String(value)} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function evidenceBody(item: LogViewerEvidence): ReactNode {
  if (item.state === "EXPIRED") return <p>内容已到期</p>;
  if (item.payload === null) return <p role="alert">内容缺失</p>;
  if (item.kind === "VALIDATED_JSON") {
    const formatted = formatValidatedJson(item.payload);
    return (
      <>
        {formatted.parsed ? null : <p>未通过 JSON 解析，以下为原文。</p>}
        <pre>
          <IsolatedText text={formatted.text} />
        </pre>
      </>
    );
  }
  return (
    <pre>
      <IsolatedText text={item.payload} />
    </pre>
  );
}
