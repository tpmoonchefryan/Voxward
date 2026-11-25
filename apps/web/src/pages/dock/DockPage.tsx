import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { EmptyState } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import {
  SuperChatCard,
  SuperChatOverlayBar,
  useLiveStreamAutoScroll,
  type SuperChatItemDisplay,
} from "../../components/youtube-sc";
import {
  DEFAULT_VOXWARD_LOCALE,
  DOCK_COPY,
  pickLocale,
  type VoxWardLocale,
} from "../../i18n";
import { useVoxWardGuestPrefs } from "../../shell/guest-prefs-context";
import { createShellPreferencesClient } from "../../shell/shell-preferences-api";
import {
  createDockApi,
  dockMessageFor,
  type DockApi,
  type DockSnapshot,
} from "./api";

export interface PureDockSurfaceProps {
  readonly channelId: string;
  readonly api?: DockApi;
  readonly initialSnapshot?: DockSnapshot | null;
  readonly standalone?: boolean;
  readonly pollIntervalMs?: number;
  readonly locale?: VoxWardLocale;
}

type UnifiedStreamEntry =
  | {
      readonly kind: "chat";
      readonly id: string;
      readonly decidedAtMs: number;
      readonly author: string;
      readonly originalText: string | null;
      readonly decidedAt: string;
    }
  | {
      readonly kind: "sc";
      readonly id: string;
      readonly decidedAtMs: number;
      readonly item: SuperChatItemDisplay;
    };

export function PureDockSurface({
  channelId,
  api,
  initialSnapshot = null,
  standalone = false,
  pollIntervalMs = 3000,
  locale = DEFAULT_VOXWARD_LOCALE,
}: PureDockSurfaceProps) {
  const client = useMemo(() => api ?? createDockApi(), [api]);
  const copy = pickLocale(DOCK_COPY, locale);
  const [snapshot, setSnapshot] = useState<DockSnapshot | null>(initialSnapshot);
  const [errorCode, setErrorCode] = useState<unknown>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const next = await client.getDock(channelId);
      setSnapshot(next);
      setErrorCode(null);
    } catch (error) {
      setErrorCode(error);
    }
  }, [channelId, client]);

  useEffect(() => {
    if (initialSnapshot !== null) {
      setSnapshot(initialSnapshot);
    }
  }, [initialSnapshot]);

  useEffect(() => {
    void loadSnapshot();
    const timer = window.setInterval(() => {
      void loadSnapshot();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [loadSnapshot, pollIntervalMs]);

  const errorText = errorCode === null ? null : dockMessageFor(errorCode, locale);

  const chatMessages = useMemo(
    () => (snapshot?.feed.liveStream ?? []).filter((item) => item.localStatus === "ALLOW"),
    [snapshot],
  );

  const scItems = useMemo<readonly SuperChatItemDisplay[]>(
    () =>
      (snapshot?.feed.approvedSc ?? []).map((sc) => ({
        id: sc.eventId,
        author: sc.safeAlias ?? sc.subjectRef,
        payment: sc.payment ?? null,
        amountText: sc.payment?.amountDisplay ?? sc.notes ?? sc.acknowledgement ?? null,
        text: sc.originalText,
        translation: sc.translation,
        translations: sc.translations,
        decidedAtMs: Date.parse(sc.decidedAt) || Date.now(),
      })),
    [snapshot],
  );

  const unifiedTimeline = useMemo<readonly UnifiedStreamEntry[]>(() => {
    const scIds = new Set(scItems.map((sc) => sc.id));
    const merged: UnifiedStreamEntry[] = [
      ...chatMessages
        .filter((msg) => !scIds.has(msg.eventId))
        .map((msg) => ({
          kind: "chat" as const,
          id: msg.eventId,
          decidedAtMs: Date.parse(msg.decidedAt) || 0,
          author: msg.subjectRef,
          originalText: msg.originalText,
          decidedAt: msg.decidedAt,
        })),
      ...scItems.map((sc) => ({
        kind: "sc" as const,
        id: sc.id,
        decidedAtMs: sc.decidedAtMs ?? 0,
        item: sc,
      })),
    ];
    return merged.sort((a, b) => a.decidedAtMs - b.decidedAtMs);
  }, [chatMessages, scItems]);

  const streamItemIds = useMemo(
    () => unifiedTimeline.map((entry) => (entry.kind === "sc" ? `sc-${entry.id}` : `chat-${entry.id}`)),
    [unifiedTimeline],
  );
  const { viewportRef, trackRef, handleScroll, handleWheel } = useLiveStreamAutoScroll(streamItemIds);

  return (
    <main
      className={standalone ? "vw-dock-shell" : "vw-dock-shell vw-dock-shell--embedded"}
      aria-label={copy.dockAria}
    >
      {errorText ? <BannerNotice tone="danger">{errorText}</BannerNotice> : null}

      {snapshot?.faults.platformFault ? (
        <BannerNotice tone="warning" title={copy.platformFaultTitle}>
          {snapshot.faults.platformFault.message}
        </BannerNotice>
      ) : null}

      {snapshot?.faults.modelFault ? (
        <BannerNotice tone="warning" title={copy.modelFaultTitle}>
          {snapshot.faults.modelFault.message}
        </BannerNotice>
      ) : null}

      <section className="vw-panel-card vw-dock-column vw-yt-stream-panel" aria-label={copy.streamAria}>
        <div className="vw-row-between">
          <strong>{copy.streamTitle}</strong>
          <span className="vw-caption">
            {copy.countSummary(unifiedTimeline.length, scItems.length)}
          </span>
        </div>

        <SuperChatOverlayBar items={scItems} locale={locale} />

        <div
          ref={viewportRef}
          className={
            unifiedTimeline.length === 0 ? "vw-dock-scroll" : "vw-dock-scroll vw-stream-viewport"
          }
          onScroll={handleScroll}
          onWheel={handleWheel}
        >
          {unifiedTimeline.length === 0 ? (
            <EmptyState
              title={copy.emptyTitle}
              description={copy.emptyDesc}
            />
          ) : (
            <div className="vw-stream-clip">
              <div ref={trackRef} className="vw-stream-track">
                {unifiedTimeline.map((entry) => (
                  <div
                    key={entry.kind === "sc" ? `sc-${entry.id}` : `chat-${entry.id}`}
                    className="vw-stream-item"
                    data-stream-kind={entry.kind}
                  >
                    {entry.kind === "sc" ? (
                      <SuperChatCard item={entry.item} />
                    ) : (
                      <article className="vw-chat-row">
                        <div className="vw-row-between">
                          <strong>
                            <UntrustedText text={entry.author} />
                          </strong>
                          <span className="vw-caption">
                            {new Date(entry.decidedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.originalText !== null ? (
                          <div>
                            <UntrustedText text={entry.originalText} />
                          </div>
                        ) : null}
                      </article>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export function DockPage({ api }: { readonly api?: DockApi }) {
  const params = useParams();
  const roomId = params.roomId ?? "ch_demo_1";
  const guestPrefs = useVoxWardGuestPrefs();
  const [resolvedLocale, setResolvedLocale] = useState<VoxWardLocale>(guestPrefs.locale);
  const [resolvedTheme, setResolvedTheme] = useState(guestPrefs.theme);
  const shellClient = useMemo(() => createShellPreferencesClient(), []);

  useEffect(() => {
    let active = true;
    void shellClient
      .getShellPreferences()
      .then((prefs) => {
        if (!active || prefs === null) return;
        if (prefs.locale) setResolvedLocale(prefs.locale);
        if (prefs.theme) setResolvedTheme(prefs.theme);
      })
      .catch(() => {
        // Standalone dock stays on default halloween + English or guest context if unauthenticated.
      });
    return () => {
      active = false;
    };
  }, [shellClient]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.tcrnTheme = resolvedTheme;
      document.documentElement.lang = resolvedLocale;
    }
  }, [resolvedTheme, resolvedLocale]);

  return <PureDockSurface channelId={roomId} api={api} standalone locale={resolvedLocale} />;
}
