import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  SplitView,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { auditStageLabel } from "../../i18n/operator-data";
import {
  DEFAULT_VOXWARD_LOCALE,
  LOGS_COPY,
  pickLocale,
  type VoxWardLocale,
} from "../../i18n";
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
  readonly locale?: VoxWardLocale;
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

function stepStatusBadgeTone(status: LogViewerTechnicalItem["status"]): "positive" | "danger" | "neutral" {
  if (status === "FAILED" || status === "TIMED_OUT") return "danger";
  if (status === "SKIPPED") return "neutral";
  return "positive";
}

export function CorrelationChain({
  channelId,
  correlationId,
  initialLogId,
  onBack,
  fetchImpl,
  locale = DEFAULT_VOXWARD_LOCALE,
}: CorrelationChainProps) {
  const copy = pickLocale(LOGS_COPY, locale).chain;
  const [items, setItems] = useState<readonly LogViewerTechnicalItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialLogId);
  const [fetchError, setFetchError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setFetchError(null);
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
        setFetchError(err);
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

  return (
    <section aria-label={copy.aria} className="vw-stack-md">
      <div className="vw-row-between">
        <div className="vw-row-wrap">
          <strong>{copy.title}</strong>
          <Badge tone="accent">
            <span className="vw-mono">
              <UntrustedText text={correlationId} />
            </span>
          </Badge>
        </div>

        <div className="vw-row-wrap">
          <Button
            size="sm"
            variant="secondary"
            disabled={previousId === null}
            onClick={() => setSelectedId(previousId)}
          >
            {copy.prevBtn}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={nextId === null}
            onClick={() => setSelectedId(nextId)}
          >
            {copy.nextBtn}
          </Button>
          <Button size="sm" variant="secondary" onClick={onBack}>
            {copy.backBtn}
          </Button>
        </div>
      </div>

      {fetchError !== null ? (
        <BannerNotice tone="danger">{describeLogError(fetchError, locale)}</BannerNotice>
      ) : null}

      {!loaded ? (
        <EmptyState title={copy.loadingTitle} />
      ) : items.length === 0 ? (
        <EmptyState title={copy.emptyTitle} />
      ) : (
        <div className="vw-split-host">
          <SplitView
            label={copy.splitLabel}
            locale={locale}
            detailPopulated={activeItem !== undefined}
            list={
              <div className="vw-stack-sm">
                <div className="vw-chain-list-header">{copy.stepsHeader(items.length)}</div>
                <div className="vw-stack-sm" role="list">
                  {items.map((item) => {
                    const selected = activeItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="listitem"
                        aria-pressed={selected}
                        className={selected ? "vw-chain-step vw-chain-step--active" : "vw-chain-step"}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <div className="vw-row-between">
                          <span className="vw-mono vw-chain-step__title" title={item.stage}>
                            {`#${item.sequence} ${auditStageLabel(item.stage, locale)}`}
                          </span>
                          <Badge tone={stepStatusBadgeTone(item.status)}>{item.status}</Badge>
                        </div>
                        <div className="vw-row-between">
                          <span className="vw-mono vw-caption">{item.occurredAt}</span>
                          {item.latencyMs !== null ? (
                            <span className="vw-caption">{`${item.latencyMs} ms`}</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            }
            detail={
              activeItem !== undefined ? (
                <JsonPanel
                  channelId={channelId}
                  logId={activeItem.id}
                  fetchImpl={fetchImpl}
                  locale={locale}
                />
              ) : (
                <EmptyState title={copy.pickStepTitle} />
              )
            }
          />
        </div>
      )}
    </section>
  );
}
