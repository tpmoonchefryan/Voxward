import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { EmptyState } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import {
  SuperChatCard,
  SuperChatOverlayBar,
  type SuperChatItemDisplay,
} from "../../components/youtube-sc";
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
}: PureDockSurfaceProps) {
  const client = useMemo(() => api ?? createDockApi(), [api]);
  const [snapshot, setSnapshot] = useState<DockSnapshot | null>(initialSnapshot);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const next = await client.getDock(channelId);
      setSnapshot(next);
      setErrorText(null);
    } catch (error) {
      setErrorText(dockMessageFor(error));
    }
  }, [channelId, client]);

  useEffect(() => {
    void loadSnapshot();
    const timer = window.setInterval(() => {
      void loadSnapshot();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [loadSnapshot, pollIntervalMs]);

  const chatMessages = useMemo(
    () => (snapshot?.feed.liveStream ?? []).filter((item) => item.localStatus === "ALLOW"),
    [snapshot],
  );

  const scItems = useMemo<readonly SuperChatItemDisplay[]>(
    () =>
      (snapshot?.feed.approvedSc ?? []).map((sc) => ({
        id: sc.eventId,
        author: sc.safeAlias ?? sc.subjectRef,
        amountText: sc.notes ?? sc.acknowledgement ?? "$5",
        text: sc.originalText,
        translation: sc.translation,
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
    return merged.sort((a, b) => b.decidedAtMs - a.decidedAtMs);
  }, [chatMessages, scItems]);

  return (
    <main
      className={standalone ? "vw-dock-shell" : "vw-dock-shell vw-dock-shell--embedded"}
      aria-label="纯净弹幕姬"
    >
      {errorText ? <BannerNotice tone="danger">{errorText}</BannerNotice> : null}

      {snapshot?.faults.platformFault ? (
        <BannerNotice tone="warning" title="直播平台连接提示">
          {snapshot.faults.platformFault.message}
        </BannerNotice>
      ) : null}

      {snapshot?.faults.modelFault ? (
        <BannerNotice tone="warning" title="AI 服务降级提示">
          {snapshot.faults.modelFault.message}
        </BannerNotice>
      ) : null}

      <section className="vw-panel-card vw-dock-column vw-yt-stream-panel" aria-label="纯净单栏弹幕流">
        <div className="vw-row-between">
          <strong>纯净弹幕流</strong>
          <span className="vw-caption">
            {unifiedTimeline.length} 条 · {scItems.length} 条置顶 SC
          </span>
        </div>

        <SuperChatOverlayBar items={scItems} />

        <div className="vw-dock-scroll">
          {unifiedTimeline.length === 0 ? (
            <EmptyState
              title="暂无放行弹幕与 Super Chat"
              description="通过审核的直播对话与 Super Chat 将在同一时间流中实时呈现，点击顶部醒目条可展开卡片。"
            />
          ) : (
            unifiedTimeline.map((entry) =>
              entry.kind === "sc" ? (
                <SuperChatCard key={`sc-${entry.id}`} item={entry.item} />
              ) : (
                <article key={`chat-${entry.id}`} className="vw-chat-row">
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
              ),
            )
          )}
        </div>
      </section>
    </main>
  );
}

export function DockPage({ api }: { readonly api?: DockApi }) {
  const params = useParams();
  const roomId = params.roomId ?? "ch_demo_1";
  return <PureDockSurface channelId={roomId} api={api} standalone />;
}
