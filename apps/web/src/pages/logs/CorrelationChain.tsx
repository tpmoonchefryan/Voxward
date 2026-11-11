import { useEffect, useState } from "react";
import type { LogViewerTechnicalItem } from "@voxward/contracts";
import { IsolatedText } from "./IsolatedText";
import { JsonPanel } from "./JsonPanel";
import { describeLogError, fetchChain, type FetchLike } from "./api";

export interface CorrelationChainProps {
  readonly channelId: string;
  readonly correlationId: string;
  /** The entry the reader opened. Null opens the chain at its first entry. */
  readonly initialLogId: string | null;
  readonly onBack: () => void;
  readonly fetchImpl?: FetchLike;
}

type ChainState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly items: readonly LogViewerTechnicalItem[] };

/** Position of an entry in the chain, or -1 when it is not there. */
export function indexOfLog(items: readonly { readonly id: string }[], logId: string | null): number {
  if (logId === null) return -1;
  return items.findIndex((item) => item.id === logId);
}

/**
 * The entry one step away from the selected one. Null at either end, where the step cannot move. A selection that is
 * not in the chain falls back to the first entry, so a stale id never leaves the view empty.
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

/**
 * The full correlation chain of one entry, with navigation. Every page is loaded before the first entry is shown, so
 * previous and next move through the whole chain, not through one page of it.
 */
export function CorrelationChain({ channelId, correlationId, initialLogId, onBack, fetchImpl }: CorrelationChainProps) {
  const [state, setState] = useState<ChainState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(initialLogId);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    fetchChain(channelId, correlationId, { fetchImpl })
      .then((items) => {
        if (active) setState({ status: "ready", items });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: describeLogError(error) });
      });
    return () => {
      active = false;
    };
  }, [channelId, correlationId, fetchImpl]);

  if (state.status === "loading") return <p role="status">正在加载关联链…</p>;
  if (state.status === "error") {
    return (
      <section>
        <p role="alert">{state.message}</p>
        <button type="button" onClick={onBack}>
          返回列表
        </button>
      </section>
    );
  }

  const { items } = state;
  const current = indexOfLog(items, selectedId) >= 0 ? selectedId : (items[0]?.id ?? null);
  const previousId = selectionAfterStep(items, current, "previous");
  const nextId = selectionAfterStep(items, current, "next");

  return (
    <section aria-label="关联链">
      <h2>
        处理链 <IsolatedText text={correlationId} />
      </h2>
      <nav aria-label="切换条目">
        <button type="button" disabled={previousId === null} onClick={() => setSelectedId(previousId)}>
          上一条
        </button>
        <button type="button" disabled={nextId === null} onClick={() => setSelectedId(nextId)}>
          下一条
        </button>
        <button type="button" onClick={onBack}>
          返回列表
        </button>
      </nav>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-current={item.id === current ? "true" : undefined}
              onClick={() => setSelectedId(item.id)}
            >
              <span>#{item.sequence}</span> {item.stage} {item.status} <IsolatedText text={item.occurredAt} />
            </button>
          </li>
        ))}
      </ol>
      {current === null ? null : <JsonPanel channelId={channelId} logId={current} fetchImpl={fetchImpl} />}
    </section>
  );
}
