import { useEffect, useMemo, useState } from "react";
import { SuperChatCard, useLiveStreamAutoScroll } from "../../components/youtube-sc";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { DEFAULT_VOXWARD_LOCALE, OVERLAY_COPY, pickLocale, type VoxWardLocale } from "../../i18n";
import { useVoxWardGuestPrefs } from "../../shell/guest-prefs-context";
import { createShellPreferencesClient } from "../../shell/shell-preferences-api";
import {
  buildOverlaySubprotocols,
  buildOverlayWsUrl,
  closeMessageFor,
  createInitialStageState,
  isTerminalCloseCode,
  parseNativeFrameJson,
  parseOverlayCredential,
  pruneExpiredStageItems,
  reconnectDelayMs,
  reduceStageFrame,
  safeAnonymousAliasFor,
  type ActiveDeliverItem,
  type StageState,
} from "./api";

export interface StageViewProps {
  readonly state: StageState;
  readonly previewMode?: boolean;
  readonly locale?: VoxWardLocale;
}

function isSuperChatItem(item: ActiveDeliverItem): boolean {
  if (item.payment !== undefined && item.payment !== null) return true;
  if (item.label === null) return false;
  return item.label.includes("$") || item.label.includes("SC") || item.label.includes("¥");
}

function parseObsScDisplay(
  item: ActiveDeliverItem,
  anonAlias: string,
): {
  readonly author: string;
  readonly amountText: string | null;
} {
  const raw = item.label ?? anonAlias;
  if (raw.includes(" · ")) {
    const [firstPart, ...rest] = raw.split(" · ");
    const author = firstPart?.trim() || anonAlias;
    const amountText = rest.join(" · ").trim() || raw;
    return { author, amountText };
  }
  const scPrefixMatch = /^SC\s+(.+)$/i.exec(raw.trim());
  if (scPrefixMatch?.[1]) {
    return { author: "Super Chat", amountText: scPrefixMatch[1].trim() };
  }
  return { author: raw, amountText: item.label };
}

/**
 * Pure transparent OBS overlay view (VW-Draft-01):
 * - No WardBarrier, mute button, or sound;
 * - Approved chat & 7-tier Super Chats share one live timeline;
 * - WARD_BLOCKED silently retracts matching platformOrder items.
 */
export function StageView({
  state,
  previewMode = false,
  locale = DEFAULT_VOXWARD_LOCALE,
}: StageViewProps) {
  const copy = pickLocale(OVERLAY_COPY, locale);
  const anonAlias = safeAnonymousAliasFor(locale);
  const showSamplePreview = previewMode && state.activeDeliveries.length === 0;
  const effectiveDeliveries: readonly ActiveDeliverItem[] = showSamplePreview
    ? [
        {
          deliveryId: "preview-chat-1",
          deliverySequence: 1,
          platformOrder: 1,
          label: "Kaito_Fan",
          text: "Amazing acoustic atmosphere tonight! Keep shining!",
          translation: null,
          validUntil: "2099-01-01T00:00:00.000Z",
          validUntilMs: Number.MAX_SAFE_INTEGER,
        },
        {
          deliveryId: "preview-sc-1",
          deliverySequence: 2,
          platformOrder: 2,
          label: "Kaito_Tokyo · $100",
          text: "Happy Halloween from Tokyo!",
          translation: "来自东京的万圣节问候！",
          validUntil: "2099-01-01T00:00:00.000Z",
          validUntilMs: Number.MAX_SAFE_INTEGER,
        },
      ]
    : state.activeDeliveries;

  const orderedDeliveries = useMemo(
    () =>
      [...effectiveDeliveries].sort(
        (a, b) => a.platformOrder - b.platformOrder || a.deliverySequence - b.deliverySequence,
      ),
    [effectiveDeliveries],
  );
  const deliveryIds = useMemo(
    () => orderedDeliveries.map((item) => item.deliveryId),
    [orderedDeliveries],
  );
  const { trackRef } = useLiveStreamAutoScroll(deliveryIds, { syncScroll: false });

  return (
    <main
      className={previewMode ? "vw-obs-stage vw-obs-stage--preview" : "vw-obs-stage"}
      data-stage-status={state.connectionStatus}
      aria-label={copy.stageAria}
    >
      {showSamplePreview ? (
        <div className="vw-obs-preview-badge">{copy.previewBadge}</div>
      ) : null}

      <section aria-label={copy.feedAria} className="vw-obs-chat-list">
        <div ref={trackRef} className="vw-obs-stream-track">
          {orderedDeliveries.map((item) => {
            const isSc = isSuperChatItem(item);
            if (isSc) {
              const scDisplay = parseObsScDisplay(item, anonAlias);
              return (
                <div key={item.deliveryId} className="vw-obs-stream-item" data-stream-kind="sc">
                  <SuperChatCard
                    item={{
                      id: item.deliveryId,
                      author: scDisplay.author,
                      payment: item.payment ?? null,
                      amountText: item.payment ? null : scDisplay.amountText,
                      text: item.text,
                      translation: item.translation,
                    }}
                    locale={locale}
                  />
                </div>
              );
            }

            return (
              <div key={item.deliveryId} className="vw-obs-stream-item" data-stream-kind="chat">
                <article className="vw-obs-chat-item">
                  <span className="vw-obs-chat-item__author">
                    <UntrustedText text={item.label ?? anonAlias} />
                  </span>
                  <span>
                    <UntrustedText text={item.text} />
                  </span>
                  {item.translation ? (
                    <div className="vw-obs-chat-item__tr">
                      <UntrustedText text={item.translation} />
                    </div>
                  ) : null}
                </article>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export interface StageProps {
  readonly initialState?: StageState;
  readonly previewMode?: boolean;
}

export function Stage({ initialState, previewMode }: StageProps = {}) {
  const guestPrefs = useVoxWardGuestPrefs();
  const [resolvedLocale, setResolvedLocale] = useState<VoxWardLocale>(guestPrefs.locale);
  const [state, setState] = useState<StageState>(() => initialState ?? createInitialStageState());
  const shellClient = useMemo(() => createShellPreferencesClient(), []);

  useEffect(() => {
    let active = true;
    void shellClient
      .getShellPreferences()
      .then((prefs) => {
        if (active && prefs?.locale) {
          setResolvedLocale(prefs.locale);
        }
      })
      .catch(() => {
        // Standalone stage keeps English/guest locale when unauthenticated.
      });
    return () => {
      active = false;
    };
  }, [shellClient]);

  const isPreview =
    previewMode ??
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1");

  useEffect(() => {
    if (typeof document !== "undefined" && !isPreview) {
      document.body.classList.add("vw-stage-body");
      return () => document.body.classList.remove("vw-stage-body");
    }
    return undefined;
  }, [isPreview]);

  useEffect(() => {
    const pruneTimer = window.setInterval(() => {
      setState((prev) => pruneExpiredStageItems(prev));
    }, 1000);
    return () => window.clearInterval(pruneTimer);
  }, []);

  useEffect(() => {
    if (initialState !== undefined) {
      return;
    }
    const parsed = parseOverlayCredential(window.location, resolvedLocale);
    if (!parsed.ok) {
      setState((prev) => ({
        ...prev,
        connectionStatus: parsed.errorCode === "QUERY_CREDENTIAL_REJECTED" ? "rejected" : "idle",
        statusMessage: parsed.message,
      }));
      return;
    }

    let disposed = false;
    let attempt = 0;
    let retryTimer: number | null = null;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (disposed) return;
      setState((prev) => ({
        ...prev,
        connectionStatus: attempt === 0 ? "connecting" : "reconnecting",
        reconnectAttempt: attempt,
      }));

      const wsUrl = buildOverlayWsUrl(window.location);
      const protocols = buildOverlaySubprotocols(parsed.credential);
      socket = new WebSocket(wsUrl, protocols);

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setState((prev) => ({
          ...prev,
          connectionStatus: "connected",
          reconnectAttempt: 0,
          statusMessage: null,
        }));
      };

      socket.onmessage = (event) => {
        if (disposed || typeof event.data !== "string") return;
        const frame = parseNativeFrameJson(event.data);
        if (frame === null) return;
        setState((prev) => reduceStageFrame(prev, frame, Date.now(), resolvedLocale));
      };

      socket.onclose = (event) => {
        if (disposed) return;
        const msg = closeMessageFor(event.code, resolvedLocale);
        if (isTerminalCloseCode(event.code)) {
          setState((prev) => ({
            ...prev,
            connectionStatus: event.code === 4403 ? "revoked" : "closed",
            statusMessage: msg,
          }));
          return;
        }
        const delay = reconnectDelayMs(attempt);
        attempt += 1;
        setState((prev) => ({
          ...prev,
          connectionStatus: "reconnecting",
          reconnectAttempt: attempt,
          statusMessage: msg,
        }));
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      socket?.close(1000, "component unmounted");
    };
  }, [initialState, resolvedLocale]);

  return <StageView state={state} previewMode={isPreview} locale={resolvedLocale} />;
}
