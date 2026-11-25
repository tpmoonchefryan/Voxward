import { resolveScTierFromPayment, type ScPayment } from "@voxward/contracts";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type WheelEvent } from "react";
import { DEFAULT_VOXWARD_LOCALE, pickLocale, YOUTUBE_SC_COPY, type VoxWardLocale } from "../../i18n";
import { UntrustedText } from "../untrusted-text/UntrustedText";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readTranslateY(el: HTMLElement): number {
  const tf = getComputedStyle(el).transform;
  if (!tf || tf === "none") return 0;
  if (tf.startsWith("matrix3d(")) {
    const parts = tf.slice(9, -1).split(",");
    const ty = Number.parseFloat(parts[13] ?? "0");
    return Number.isFinite(ty) ? ty : 0;
  }
  if (tf.startsWith("matrix(")) {
    const parts = tf.slice(7, -1).split(",");
    const ty = Number.parseFloat(parts[5] ?? "0");
    return Number.isFinite(ty) ? ty : 0;
  }
  return 0;
}

export interface ScTierDescriptor {
  readonly id: "t1" | "t2" | "t3" | "t4" | "t5" | "t6" | "t7" | "unknown";
  readonly tierNumber: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly label: string;
  readonly durationSeconds: number;
  readonly showsBody: boolean;
  readonly darkInk: boolean;
}

const TIER_UNKNOWN: ScTierDescriptor = { id: "unknown", tierNumber: 0, label: "", durationSeconds: 0, showsBody: true, darkInk: false };
const TIER_1: ScTierDescriptor = { id: "t1", tierNumber: 1, label: "$1–$1.99", durationSeconds: 0, showsBody: false, darkInk: false };
const TIER_2: ScTierDescriptor = { id: "t2", tierNumber: 2, label: "$2–$4.99", durationSeconds: 0, showsBody: true, darkInk: true };
const TIER_3: ScTierDescriptor = { id: "t3", tierNumber: 3, label: "$5–$9.99", durationSeconds: 120, showsBody: true, darkInk: true };
const TIER_4: ScTierDescriptor = { id: "t4", tierNumber: 4, label: "$10–$19.99", durationSeconds: 300, showsBody: true, darkInk: true };
const TIER_5: ScTierDescriptor = { id: "t5", tierNumber: 5, label: "$20–$49.99", durationSeconds: 600, showsBody: true, darkInk: false };
const TIER_6: ScTierDescriptor = { id: "t6", tierNumber: 6, label: "$50–$99.99", durationSeconds: 1800, showsBody: true, darkInk: false };
const TIER_7: ScTierDescriptor = { id: "t7", tierNumber: 7, label: "$100–$500+", durationSeconds: 3600, showsBody: true, darkInk: false };

const TIERS_BY_NUM: readonly ScTierDescriptor[] = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5, TIER_6, TIER_7];
const TIERS_BY_ID: Readonly<Record<string, ScTierDescriptor>> = {
  t1: TIER_1,
  t2: TIER_2,
  t3: TIER_3,
  t4: TIER_4,
  t5: TIER_5,
  t6: TIER_6,
  t7: TIER_7,
};

export function resolveScTier(amountHint: string | null | undefined): ScTierDescriptor {
  if (amountHint === null || amountHint === undefined || amountHint.trim() === "") {
    return TIER_UNKNOWN;
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
    return TIERS_BY_NUM[index] ?? TIER_UNKNOWN;
  }
  return TIER_UNKNOWN;
}

export function resolveScTierForItem(
  item: Pick<SuperChatItemDisplay, "payment" | "amountText">,
): ScTierDescriptor {
  if (item.payment !== undefined && item.payment !== null) {
    const tierId = resolveScTierFromPayment(item.payment);
    if (tierId === null) return TIER_UNKNOWN;
    if (tierId === "t7" && item.payment.currency === "USD" && item.payment.amountMicros >= 500_000_000) {
      return { ...TIER_7, durationSeconds: 18000 };
    }
    return TIERS_BY_ID[tierId] ?? TIER_UNKNOWN;
  }
  return resolveScTier(item.amountText);
}

export function formatScAmountDisplay(
  item: Pick<SuperChatItemDisplay, "payment" | "amountText">,
  locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE,
): string {
  const payment = item.payment;
  if (payment !== undefined && payment !== null) {
    if (payment.amountDisplay !== null && payment.amountDisplay.trim() !== "") {
      return payment.amountDisplay;
    }
    const major = payment.amountMicros / 1_000_000;
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: payment.currency }).format(major);
    } catch {
      return `${payment.currency} ${major.toFixed(2)}`;
    }
  }
  return item.amountText ?? "";
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
  readonly payment?: ScPayment | null;
  readonly amountText: string | null;
  readonly text: string | null;
  readonly translation: string | null;
  readonly decidedAtMs?: number;
}

function computeActiveScTickers(items: readonly SuperChatItemDisplay[], nowMs: number) {
  return items
    .map((item) => {
      const tier = resolveScTierForItem(item);
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
  locale = DEFAULT_VOXWARD_LOCALE,
}: {
  readonly items: readonly SuperChatItemDisplay[];
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
  readonly nowMs?: number;
  readonly locale?: VoxWardLocale;
}) {
  const [internalNowMs, setInternalNowMs] = useState(() => Date.now());
  const copy = pickLocale(YOUTUBE_SC_COPY, locale);

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
    <div className="vw-sc-ticker" aria-label={copy.tickerAria}>
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
            <span>{formatScAmountDisplay(item, locale)}</span>
            <span className="vw-sc-ticker__countdown">{formatTickerCountdown(remainingSec)}</span>
            <progress
              className="vw-sc-ticker__progress"
              max={100}
              value={pct}
              aria-label={copy.progressAria}
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
export function SuperChatOverlayBar({
  items,
  locale = DEFAULT_VOXWARD_LOCALE,
}: {
  readonly items: readonly SuperChatItemDisplay[];
  readonly locale?: VoxWardLocale;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const copy = pickLocale(YOUTUBE_SC_COPY, locale);

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
      <SuperChatTicker
        items={items}
        selectedId={expandedItem?.id ?? null}
        onSelect={handleSelect}
        nowMs={nowMs}
        locale={locale}
      />
      {expandedItem !== null ? (
        <div
          ref={popoverRef}
          className="vw-sc-overlay-popover"
          role="region"
          aria-label={copy.overlayAria}
        >
          <SuperChatCard item={expandedItem} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Animates bottom-up live chat & SC entries with deterministic FLIP track
 * translation inside an overflow-clipped wrapper so scrollHeight stays
 * invariant and new messages never overshoot upward or bounce back.
 */
export function useLiveStreamAutoScroll(
  itemIds: readonly string[],
  options: { readonly syncScroll?: boolean } = {},
) {
  const syncScroll = options.syncScroll ?? true;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const initializedRef = useRef(false);
  const prevIdsRef = useRef<readonly string[]>([]);
  const activeAnimRef = useRef<Animation | null>(null);

  const handleScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance <= 48;
  }, []);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (event.deltaY < 0) {
      stickToBottomRef.current = false;
      activeAnimRef.current?.cancel();
      activeAnimRef.current = null;
    }
  }, []);

  const joinedKey = itemIds.join("\u0000");

  useIsomorphicLayoutEffect(() => {
    const prevIds = prevIdsRef.current;
    prevIdsRef.current = itemIds;

    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (itemIds.length === 0 || !track || (syncScroll && !viewport)) {
      if (itemIds.length === 0) {
        initializedRef.current = false;
      }
      return;
    }

    if (syncScroll && !stickToBottomRef.current) {
      return;
    }

    if (!initializedRef.current) {
      if (syncScroll && viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
      initializedRef.current = true;
      return;
    }

    const prevSet = new Set(prevIds);
    let newTailCount = 0;
    for (let i = itemIds.length - 1; i >= 0; i -= 1) {
      if (prevSet.has(itemIds[i]!)) {
        break;
      }
      newTailCount += 1;
    }

    if (newTailCount === 0) {
      return;
    }

    const residualY = activeAnimRef.current !== null ? readTranslateY(track) : 0;
    activeAnimRef.current?.cancel();
    activeAnimRef.current = null;

    if (syncScroll && viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }

    if (newTailCount >= itemIds.length) {
      return;
    }

    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof track.animate !== "function") {
      return;
    }

    const cs = getComputedStyle(track);
    const gap = Number.parseFloat(cs.rowGap || cs.gap || "0") || 0;
    const children = track.children;
    let addedHeight = 0;
    for (let i = Math.max(0, children.length - newTailCount); i < children.length; i += 1) {
      const child = children[i];
      if (!child) continue;
      addedHeight += child.getBoundingClientRect().height;
      if (i > 0) addedHeight += gap;
    }

    if (addedHeight <= 0) {
      return;
    }

    const maxClamp = viewport ? viewport.clientHeight : 600;
    const shiftPx = Math.min(addedHeight + Math.max(0, residualY), maxClamp);
    const anim = track.animate(
      [{ transform: `translateY(${shiftPx}px)` }, { transform: "translateY(0)" }],
      { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    activeAnimRef.current = anim;
    const clearIfCurrent = () => {
      if (activeAnimRef.current === anim) {
        activeAnimRef.current = null;
      }
    };
    anim.onfinish = clearIfCurrent;
    anim.oncancel = clearIfCurrent;
    // joinedKey encodes exact ordered itemIds snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedKey, syncScroll]);

  return { viewportRef, trackRef, handleScroll, handleWheel };
}

export function SuperChatCard({
  item,
  locale = DEFAULT_VOXWARD_LOCALE,
}: {
  readonly item: SuperChatItemDisplay;
  readonly locale?: VoxWardLocale;
}) {
  const tier = resolveScTierForItem(item);
  const amountLabel = formatScAmountDisplay(item, locale);

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
        {amountLabel !== "" ? <span className="vw-sc-card__amount">{amountLabel}</span> : null}
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
