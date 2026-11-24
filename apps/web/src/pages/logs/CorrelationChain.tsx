import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  SplitView,
  StagePipeline,
  type PipelineStage,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import {
  describeLogError,
  fetchChain,
  type FetchLike,
  type LogViewerTechnicalItem,
} from "./api";
import { JsonPanel } from "./JsonPanel";

export interface CorrelationChainProps {
  readonly channelId: string;
  readonly correlationId: string;
  readonly initialLogId: string | null;
  readonly onBack: () => void;
  readonly fetchImpl?: FetchLike;
}

/** Position of an entry in the chain, or -1 when it is not there. */
export function indexOfLog(items: readonly { readonly id: string }[], logId: string | null): number {
  if (logId === null) return -1;
  return items.findIndex((item) => item.id === logId);
}

/**
 * The entry one step away from the selected one. Null at either end, where the step cannot move.
 */
export function selectionAfterStep(
  items: readonly { readonly id: string }[],
  selectedId: string | null,
  step: "previous" | "next",
): string | null {
  const index = indexOfLog(items, selectedId);
  if (index < 0) return items[0]?.id ?? null;
  const target = step === "previous" ? index - 1 : index + 1;
  return items[target]?.id ?? null;
}

export function CorrelationChain({
  channelId,
  correlationId,
  initialLogId,
  onBack,
  fetchImpl,
}: CorrelationChainProps) {
  const [items, setItems] = useState<readonly LogViewerTechnicalItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialLogId);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setErrorText(null);
    fetchChain(channelId, correlationId, { fetchImpl })
      .then((chainItems) => {
        if (!active) return;
        setItems(chainItems);
        setSelectedId((prev) =>
          indexOfLog(chainItems, prev) >= 0 ? prev : (chainItems[0]?.id ?? null),
        );
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorText(describeLogError(err));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [channelId, correlationId, fetchImpl]);

  const currentIdx = indexOfLog(items, selectedId);
  const currentId = currentIdx >= 0 ? items[currentIdx]?.id ?? null : (items[0]?.id ?? null);
  const activeItem = items.find((item) => item.id === currentId);
  const previousId = selectionAfterStep(items, currentId, "previous");
  const nextId = selectionAfterStep(items, currentId, "next");

  const pipelineStages: PipelineStage[] = items.map((item) => ({
    id: item.id,
    label: `${item.sequence}. ${item.stage}`,
    state:
      item.status === "FAILED" || item.status === "TIMED_OUT"
        ? { state: "blocked", label: item.status === "TIMED_OUT" ? "超时" : "异常" }
        : { state: "ready", label: "完成" },
    owner: item.modelRef ?? item.providerRef ?? "系统管道",
    references: [new Date(item.occurredAt).toLocaleTimeString()],
  }));

  return (
    <section aria-label="关联链路时间线" className="vw-stack-md">
      <div className="vw-row-between">
        <div className="vw-row-wrap">
          <Button size="sm" variant="secondary" onClick={onBack}>
            返回列表视图
          </Button>
          <strong>全链路追踪</strong>
          <Badge tone="accent">
            <UntrustedText text={correlationId} />
          </Badge>
        </div>

        <div className="vw-row-wrap">
          <Button
            size="sm"
            variant="quiet"
            disabled={previousId === null}
            onClick={() => setSelectedId(previousId)}
          >
            上一条
          </Button>
          <Button
            size="sm"
            variant="quiet"
            disabled={nextId === null}
            onClick={() => setSelectedId(nextId)}
          >
            下一条
          </Button>
        </div>
      </div>

      {errorText !== null ? <BannerNotice tone="danger">{errorText}</BannerNotice> : null}

      {!loaded ? (
        <EmptyState title="正在重建关联链路…" />
      ) : items.length === 0 ? (
        <EmptyState title="该关联编号暂无处理节点" />
      ) : (
        <div className="vw-stack-md">
          <StagePipeline stages={pipelineStages} label="全链路阶段管线" locale="zh-CN" />

          <div className="vw-split-host">
            <SplitView
              label="链路步骤与细节视图"
              locale="zh-CN"
              detailPopulated={activeItem !== undefined}
              list={
                <div className="vw-stack-sm" role="list">
                  {items.map((item) => {
                    const selected = activeItem?.id === item.id;
                    return (
                      <Button
                        key={item.id}
                        size="sm"
                        variant={selected ? "primary" : "quiet"}
                        onClick={() => setSelectedId(item.id)}
                      >
                        {`#${item.sequence} ${item.stage}`}
                      </Button>
                    );
                  })}
                </div>
              }
              detail={
                activeItem !== undefined ? (
                  <JsonPanel
                    channelId={channelId}
                    logId={activeItem.id}
                    fetchImpl={fetchImpl}
                  />
                ) : (
                  <EmptyState title="请选择任一处理步骤查看详细日志与取证" />
                )
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
