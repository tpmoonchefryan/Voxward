import { useEffect, useState, type ReactNode } from "react";
import type { LogViewerEvidence, LogViewerTechnicalDetail, TechnicalData } from "@voxward/contracts";
import { Badge, Card, EmptyState, KeyValueList } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import {
  DEFAULT_VOXWARD_LOCALE,
  LOGS_COPY,
  pickLocale,
  type LogsCopy,
  type VoxWardLocale,
} from "../../i18n";
import { auditStageLabel } from "../../i18n/operator-data";
import { describeLogError, fetchTechnicalDetail, type FetchLike } from "./api";
import { IsolatedText } from "./IsolatedText";

/** Pretty-prints a validated JSON payload. A payload that does not parse is shown as it is, and says so. */
export function formatValidatedJson(payload: string): { readonly text: string; readonly parsed: boolean } {
  try {
    return { text: JSON.stringify(JSON.parse(payload), null, 2), parsed: true };
  } catch {
    return { text: payload, parsed: false };
  }
}

function evidenceBody(item: LogViewerEvidence, copy: LogsCopy["jsonPanel"]): ReactNode {
  if (item.state === "EXPIRED") {
    return (
      <div className="vw-row-wrap">
        <Badge tone="neutral">{copy.expiredBadge}</Badge>
      </div>
    );
  }
  if (item.payload === null) {
    return <span className="vw-muted">{copy.emptyPayload}</span>;
  }
  if (item.kind === "VALIDATED_JSON") {
    const formatted = formatValidatedJson(item.payload);
    return (
      <div className="vw-stack-sm">
        {!formatted.parsed ? <Badge tone="warning">{copy.invalidJsonBadge}</Badge> : null}
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

function DataList({
  data,
  copy,
}: {
  readonly data: TechnicalData;
  readonly copy: LogsCopy["jsonPanel"];
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div className="vw-stack-sm">
      <span className="vw-caption">{copy.stageData}</span>
      <div className="vw-row-wrap">
        {entries.map(([key, value]) => (
          <Badge key={key} tone="neutral">
            <span className="vw-mono">
              {key}: {value === null ? copy.none : <IsolatedText text={String(value)} />}
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
  readonly locale?: VoxWardLocale;
}

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: unknown }
  | { readonly status: "ready"; readonly detail: LogViewerTechnicalDetail };

export function JsonPanel({
  channelId,
  logId,
  fetchImpl,
  locale = DEFAULT_VOXWARD_LOCALE,
}: JsonPanelProps) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const copy = pickLocale(LOGS_COPY, locale).jsonPanel;

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    fetchTechnicalDetail(channelId, logId, { fetchImpl })
      .then((detail) => {
        if (active) setState({ status: "ready", detail });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", error });
      });
    return () => {
      active = false;
    };
  }, [channelId, logId, fetchImpl]);

  if (state.status === "loading") return <EmptyState title={copy.loadingTitle} />;
  if (state.status === "error") {
    return <BannerNotice tone="danger">{describeLogError(state.error, locale)}</BannerNotice>;
  }
  return <JsonPanelView detail={state.detail} locale={locale} />;
}

export function JsonPanelView({
  detail,
  locale = DEFAULT_VOXWARD_LOCALE,
}: {
  readonly detail: LogViewerTechnicalDetail;
  readonly locale?: VoxWardLocale;
}) {
  const copy = pickLocale(LOGS_COPY, locale).jsonPanel;
  return (
    <section aria-label={copy.aria} className="vw-stack-md">
      <Card>
        <div className="vw-stack-sm">
          <div className="vw-row-between">
            <strong title={detail.stage}>{copy.headerTitle(detail.sequence, auditStageLabel(detail.stage, locale))}</strong>
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
                label: copy.labelTask,
                value: detail.taskId === null ? copy.none : <IsolatedText text={detail.taskId} />,
              },
              {
                key: "modelRef",
                label: copy.labelModel,
                value: detail.modelRef === null ? copy.none : <IsolatedText text={detail.modelRef} />,
              },
              {
                key: "contractVersion",
                label: copy.labelContract,
                value: <IsolatedText text={detail.contractVersion} />,
              },
              {
                key: "ruleTemplateVersion",
                label: copy.labelRuleVer,
                value:
                  detail.ruleTemplateVersion === null ? (
                    copy.none
                  ) : (
                    <IsolatedText text={detail.ruleTemplateVersion} />
                  ),
              },
              {
                key: "batchId",
                label: copy.labelBatch,
                value: detail.batchId === null ? copy.none : <IsolatedText text={detail.batchId} />,
              },
              {
                key: "errorCode",
                label: copy.labelErrorCode,
                value: detail.errorCode === null ? copy.none : <IsolatedText text={detail.errorCode} />,
              },
            ]}
          />
          {detail.data === null ? null : <DataList data={detail.data} copy={copy} />}
        </div>
      </Card>

      {detail.evidence.map((item) => (
        <Card key={item.kind} tone="quiet">
          <details>
            <summary>{copy.evidenceLabels[item.kind]}</summary>
            {evidenceBody(item, copy)}
          </details>
        </Card>
      ))}
    </section>
  );
}
