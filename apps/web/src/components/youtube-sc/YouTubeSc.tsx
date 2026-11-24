import { useCallback, useEffect, useRef, useState, type WheelEvent } from "react";
import { UntrustedText } from "../untrusted-text/UntrustedText";

export interface ScTierDescriptor {
  readonly id: "t1" | "t2" | "t3" | "t4" | "t5" | "t6" | "t7";
  readonly tierNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly label: string;
  readonly durationSeconds: number;
  readonly showsBody: boolean;
  readonly darkInk: boolean;
}

const TIER_1: ScTierDescriptor = { id: "t1", tierNumber: 1, label: "$1–$1.99", durationSeconds: 0, showsBody: false, darkInk: false };
const TIER_2: ScTierDescriptor = { id: "t2", tierNumber: 2, label: "$2–$4.99", durationSeconds: 0, showsBody: true, darkInk: true };
const TIER_3: ScTierDescriptor = { id: "t3", tierNumber: 3, label: "$5–$9.99", durationSeconds: 120, showsBody: true, darkInk: true };
const TIER_4: ScTierDescriptor = { id: "t4", tierNumber: 4, label: "$10–$19.99", durationSeconds: 300, showsBody: true, darkInk: true };
const TIER_5: ScTierDescriptor = { id: "t5", tierNumber: 5, label: "$20–$49.99", durationSeconds: 600, showsBody: true, darkInk: false };
const TIER_6: ScTierDescriptor = { id: "t6", tierNumber: 6, label: "$50–$99.99", durationSeconds: 1800, showsBody: true, darkInk: false };
const TIER_7: ScTierDescriptor = { id: "t7", tierNumber: 7, label: "$100–$500+", durationSeconds: 3600, showsBody: true, darkInk: false };

const TIERS_BY_NUM: readonly ScTierDescriptor[] = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5, TIER_6, TIER_7];

export function resolveScTier(amountHint: string | null | undefined): ScTierDescriptor {
  if (amountHint === null || amountHint === undefined || amountHint.trim() === "") {
    return TIER_3;
  }
  const usdMatch = /(?:\$|USD\s*)(\d+(?:\.\d+)?)/i.exec(amountHint);
  if (usdMatch !== null && usdMatch[1] !== undefined) {
    const usd = Number.parseFloat(usdMatch[1]);
    if (usd >= 500) return { ...TIER_7, durationSeconds: 18000 };
    if (usd >= 100) return TIER_7;
    if (usd >= 50) return TIER_6;
    if (usd >= 20) return TIER_5;
    if (usd >= 10) return TIER_4;
    if (usd >= 5) return TIER_3;
    if (usd >= 2) return TIER_2;
    return TIER_1;
  }
  const jpyCnyMatch = /(?:¥|JPY\s*|CNY\s*)(\d+(?:\.\d+)?)/i.exec(amountHint);
  if (jpyCnyMatch !== null && jpyCnyMatch[1] !== undefined) {
    const val = Number.parseFloat(jpyCnyMatch[1]);
    if (val >= 15000) return TIER_7;
    if (val >= 7000) return TIER_6;
    if (val >= 2800) return TIER_5;
    if (val >= 1400) return TIER_4;
    if (val >= 700) return TIER_3;
    if (val >= 300) return TIER_2;
    return TIER_1;
  }
  const tierMatch = /t([1-7])/i.exec(amountHint);
  if (tierMatch !== null && tierMatch[1] !== undefined) {
    const index = Number.parseInt(tierMatch[1], 10) - 1;
    return TIERS_BY_NUM[index] ?? TIER_3;
  }
  return TIER_3;
}

export function formatTickerCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export interface SuperChatItemDisplay {
  readonly id: string;
  readonly author: string;
  readonly amountText: string | null;
  readonly text: string | null;
  readonly translation: string | null;
  readonly decidedAtMs?: number;
}

function computeActiveScTickers(items: readonly SuperChatItemDisplay[], nowMs: number) {
  return items
    .map((item) => {
      const tier = resolveScTier(item.amountText);
      if (tier.durationSeconds <= 0) {
        return null;
      }
      const started = item.decidedAtMs ?? nowMs;
      const elapsedSec = Math.max(0, Math.floor((nowMs - started) / 1000));
      const remainingSec = Math.max(0, tier.durationSeconds - elapsedSec);
      const pct = Math.max(4, Math.min(100, Math.round((remainingSec / tier.durationSeconds) * 100)));
      return { item, tier, remainingSec, pct };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.remainingSec > 0);
}

export function SuperChatTicker({
  items,
  selectedId = null,
  onSelect,
  nowMs: externalNowMs,
}: {
  readonly items: readonly SuperChatItemDisplay[];
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
  readonly nowMs?: number;
}) {
  const [internalNowMs, setInternalNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (externalNowMs !== undefined) {
      return;
    }
    const timer = window.setInterval(() => {
      setInternalNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [externalNowMs]);

  const activeTickers = computeActiveScTickers(items, externalNowMs ?? internalNowMs);

  if (activeTickers.length === 0) {
    return null;
  }

  return (
    <div className="vw-sc-ticker" aria-label="Super Chat 倒计时置顶条">
      {activeTickers.map(({ item, tier, remainingSec, pct }) => {
        const isExpanded = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`vw-sc-ticker__pill vw-sc-sc-pill vw-sc-tier--${tier.id}`}
            data-sc-tier={tier.id}
            data-sc-ticker-id={item.id}
            aria-expanded={isExpanded}
            aria-pressed={isExpanded}
            onClick={() => onSelect?.(item.id)}
          >
            <span>
              <UntrustedText text={item.author} />
            </span>
            <span>{item.amountText ?? tier.label}</span>
            <span>{formatTickerCountdown(remainingSec)}</span>
            <progress
              className="vw-sc-ticker__progress"
              max={100}
              value={pct}
              aria-label="Super Chat 置顶剩余时长进度"
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sticky YouTube-style Super Chat ticker bar that overlays the live stream and
 * opens a frameless Super Chat detail card when any ticker pill is clicked.
 * Clicking anywhere outside the expanded card (or pressing Escape) closes it.
 */
export function SuperChatOverlayBar({ items }: { readonly items: readonly SuperChatItemDisplay[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const activeTickers = computeActiveScTickers(items, nowMs);
  const expandedItem = expandedId === null ? null : (items.find((item) => item.id === expandedId) ?? null);
  const isExpanded = expandedItem !== null;

  useEffect(() => {
    if (!isExpanded) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (popoverRef.current?.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest("[data-sc-ticker-id]") !== null) {
        return;
      }
      setExpandedId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedId(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  const handleSelect = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (activeTickers.length === 0 && expandedItem === null) {
    return null;
  }

  return (
    <div className="vw-sc-overlay-bar" data-sc-overlay-bar="">
      <SuperChatTicker items={items} selectedId={expandedItem?.id ?? null} onSelect={handleSelect} nowMs={nowMs} />
      {expandedItem !== null ? (
        <div
          ref={popoverRef}
          className="vw-sc-overlay-popover"
          role="region"
          aria-label="Super Chat 置顶详情浮层"
        >
          <SuperChatCard item={expandedItem} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Keeps a chronological bottom-up live chat viewport pinned to the latest message
 * at the bottom unless the viewer manually scrolls upward to inspect history.
 */
export function useLiveStreamAutoScroll(streamKey: string) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const initializedRef = useRef(false);
  const autoScrollUntilRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance <= 48) {
      stickToBottomRef.current = true;
    } else if (performance.now() >= autoScrollUntilRef.current) {
      stickToBottomRef.current = false;
    }
  }, []);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (event.deltaY < 0) {
      autoScrollUntilRef.current = 0;
      stickToBottomRef.current = false;
    }
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!streamKey || !el || !stickToBottomRef.current) {
      return;
    }
    if (!initializedRef.current) {
      el.scrollTop = el.scrollHeight;
      initializedRef.current = true;
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && typeof el.scrollTo === "function") {
      autoScrollUntilRef.current = performance.now() + 450;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [streamKey]);

  return { viewportRef, handleScroll, handleWheel };
}

export function SuperChatCard({ item }: { readonly item: SuperChatItemDisplay }) {
  const tier = resolveScTier(item.amountText);

  return (
    <article
      className={`vw-sc-card vw-sc-tier--${tier.id}`}
      data-sc-tier={tier.id}
      aria-label="Super Chat"
    >
      <header className="vw-sc-card__header">
        <span className="vw-sc-card__author">
          <UntrustedText text={item.author} />
        </span>
        <span className="vw-sc-card__amount">{item.amountText ?? tier.label}</span>
      </header>
      {tier.showsBody && (item.text || item.translation) ? (
        <div className="vw-sc-card__body">
          {item.text ? (
            <div>
              <UntrustedText text={item.text} />
            </div>
          ) : null}
          {item.translation ? (
            <div className={tier.darkInk ? "vw-sc-card__tr vw-sc-card__tr--dark-ink" : "vw-sc-card__tr"}>
              <UntrustedText text={item.translation} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
