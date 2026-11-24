import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { EmptyState } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { SuperChatCard, SuperChatTicker } from "../../components/youtube-sc";
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

  const scItems = useMemo(
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

  return (
    <main
      className={standalone ? "vw-dock-shell" : "vw-dock-shell vw-dock-shell--embedded"}
      aria-label="主播纯享侧边栏"
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

      <div className="vw-dock-grid">
        <section className="vw-panel-card vw-dock-column" aria-label="实时放行弹幕">
          <div className="vw-row-between">
            <strong>实时弹幕流</strong>
            <span className="vw-caption">{chatMessages.length} 条</span>
          </div>
          <div className="vw-dock-scroll">
            {chatMessages.length === 0 ? (
              <EmptyState
                title="暂无放行弹幕"
                description="通过审核或无需人工介入的直播对话将实时显示在此栏。"
              />
            ) : (
              chatMessages.map((msg) => (
                <article key={msg.eventId} className="vw-chat-row">
                  <div className="vw-row-between">
                    <strong>
                      <UntrustedText text={msg.subjectRef} />
                    </strong>
                    <span className="vw-caption">{new Date(msg.decidedAt).toLocaleTimeString()}</span>
                  </div>
                  {msg.originalText !== null ? (
                    <div>
                      <UntrustedText text={msg.originalText} />
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="vw-panel-card vw-dock-column" aria-label="Super Chat 专属展示">
          <div className="vw-row-between">
            <strong>Super Chat 与置顶计时</strong>
            <span className="vw-caption">{scItems.length} 条</span>
          </div>

          <SuperChatTicker items={scItems} />

          <div className="vw-dock-scroll">
            {scItems.length === 0 ? (
              <EmptyState
                title="暂无 Super Chat"
                description="观众发送的付费醒目留言将按官方分级颜色与置顶倒计时在此呈现。"
              />
            ) : (
              scItems.map((sc) => <SuperChatCard key={sc.id} item={sc} />)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export function DockPage({ api }: { readonly api?: DockApi }) {
  const params = useParams();
  const roomId = params.roomId ?? "ch_demo_1";
  return <PureDockSurface channelId={roomId} api={api} standalone />;
}
