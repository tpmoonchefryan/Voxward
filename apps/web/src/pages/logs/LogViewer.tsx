import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router";
import type { LogPage, LogViewerChangeItem, LogViewerTechnicalItem } from "@voxward/contracts";
import { CorrelationChain } from "./CorrelationChain";
import { IsolatedText } from "./IsolatedText";
import { describeLogError, fetchChangePage, fetchTechnicalPage } from "./api";

type EntryKind = "change" | "technical";

interface OpenChain {
  readonly correlationId: string;
  /** The entry the reader opened, or null when the chain was opened from a Change Log row. */
  readonly logId: string | null;
}

/** The log viewer for one channel. It has two entries, and a chain view that replaces the list when one is opened. */
export function LogViewerPage() {
  const { channelId = "" } = useParams();
  const [entry, setEntry] = useState<EntryKind>("technical");
  const [openChain, setOpenChain] = useState<OpenChain | null>(null);

  function selectEntry(next: EntryKind): void {
    setEntry(next);
    setOpenChain(null);
  }

  return (
    <main>
      <h1>日志查看器</h1>
      <nav aria-label="日志入口">
        <button type="button" aria-pressed={entry === "change"} onClick={() => selectEntry("change")}>
          Change Log
        </button>
        <button type="button" aria-pressed={entry === "technical"} onClick={() => selectEntry("technical")}>
          Technical Log
        </button>
      </nav>
      {openChain !== null ? (
        <CorrelationChain
          channelId={channelId}
          correlationId={openChain.correlationId}
          initialLogId={openChain.logId}
          onBack={() => setOpenChain(null)}
        />
      ) : entry === "change" ? (
        <ChangeList
          channelId={channelId}
          onOpenChain={(correlationId) => setOpenChain({ correlationId, logId: null })}
        />
      ) : (
        <TechnicalList
          channelId={channelId}
          onOpenChain={(correlationId, logId) => setOpenChain({ correlationId, logId })}
        />
      )}
    </main>
  );
}

interface PagedState<T> {
  readonly status: "loading" | "ready" | "error";
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly message: string | null;
  readonly loadingMore: boolean;
}

/**
 * Loads the first page when `resetKey` changes, and appends further pages on request. A later page never replaces the
 * rows already shown.
 */
function usePagedEntries<T>(load: (cursor: string | null) => Promise<LogPage<T>>, resetKey: string) {
  const [paged, setPaged] = useState<PagedState<T>>({
    status: "loading",
    items: [],
    nextCursor: null,
    message: null,
    loadingMore: false,
  });

  useEffect(() => {
    let active = true;
    setPaged({ status: "loading", items: [], nextCursor: null, message: null, loadingMore: false });
    load(null)
      .then((page) => {
        if (active) setPaged({ status: "ready", items: page.items, nextCursor: page.nextCursor, message: null, loadingMore: false });
      })
      .catch((error: unknown) => {
        if (active) setPaged({ status: "error", items: [], nextCursor: null, message: describeLogError(error), loadingMore: false });
      });
    return () => {
      active = false;
    };
  }, [resetKey]);

  function loadMore(): void {
    const cursor = paged.nextCursor;
    if (cursor === null) return;
    setPaged((previous) => ({ ...previous, loadingMore: true }));
    load(cursor)
      .then((page) => {
        setPaged((previous) => ({
          ...previous,
          items: [...previous.items, ...page.items],
          nextCursor: page.nextCursor,
          loadingMore: false,
        }));
      })
      .catch((error: unknown) => {
        setPaged((previous) => ({ ...previous, loadingMore: false, message: describeLogError(error) }));
      });
  }

  return { paged, loadMore };
}

function PagedList<T>({
  paged,
  emptyText,
  onLoadMore,
  renderRow,
}: {
  readonly paged: PagedState<T>;
  readonly emptyText: string;
  readonly onLoadMore: () => void;
  readonly renderRow: (item: T) => ReactNode;
}) {
  if (paged.status === "loading") return <p role="status">正在加载…</p>;
  if (paged.status === "error") return <p role="alert">{paged.message}</p>;
  if (paged.items.length === 0) return <p>{emptyText}</p>;
  return (
    <>
      <ul>{paged.items.map((item) => renderRow(item))}</ul>
      {paged.nextCursor === null ? null : (
        <button type="button" disabled={paged.loadingMore} onClick={onLoadMore}>
          {paged.loadingMore ? "加载中…" : "加载更多"}
        </button>
      )}
    </>
  );
}

function TechnicalList({
  channelId,
  onOpenChain,
}: {
  readonly channelId: string;
  readonly onOpenChain: (correlationId: string, logId: string) => void;
}) {
  const { paged, loadMore } = usePagedEntries((cursor) => fetchTechnicalPage(channelId, { cursor }), `technical:${channelId}`);
  return (
    <PagedList
      paged={paged}
      emptyText="没有 Technical Log 条目。"
      onLoadMore={loadMore}
      renderRow={(item: LogViewerTechnicalItem) => (
        <li key={item.id}>
          <button type="button" onClick={() => onOpenChain(item.correlationId, item.id)}>
            <IsolatedText text={item.occurredAt} /> {item.stage} {item.status} <IsolatedText text={item.correlationId} />
          </button>
        </li>
      )}
    />
  );
}

function ChangeList({
  channelId,
  onOpenChain,
}: {
  readonly channelId: string;
  readonly onOpenChain: (correlationId: string) => void;
}) {
  const { paged, loadMore } = usePagedEntries((cursor) => fetchChangePage(channelId, { cursor }), `change:${channelId}`);
  return (
    <PagedList
      paged={paged}
      emptyText="没有 Change Log 条目。"
      onLoadMore={loadMore}
      renderRow={(item: LogViewerChangeItem) => {
        const correlationId = item.correlationId;
        return (
          <li key={item.id}>
            <span>
              <IsolatedText text={item.occurredAt} /> {item.changeKind} {item.outcome}{" "}
              <IsolatedText text={item.actor.ref} />
            </span>{" "}
            <span>
              <IsolatedText text={item.summary} />
            </span>
            {correlationId === null ? null : (
              <button type="button" onClick={() => onOpenChain(correlationId)}>
                处理链
              </button>
            )}
          </li>
        );
      }}
    />
  );
}
