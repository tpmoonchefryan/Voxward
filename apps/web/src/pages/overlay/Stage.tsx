import { useEffect, useState } from "react";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
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
  SAFE_ANONYMOUS_ALIAS,
  type ActiveDeliverItem,
  type StageState,
} from "./api";
import { ScScroll } from "./ScScroll";

export interface StageViewProps {
  readonly state: StageState;
  readonly previewMode?: boolean;
}

function isSuperChatItem(item: ActiveDeliverItem): boolean {
  if (item.label === null) return false;
  return item.label.includes("$") || item.label.includes("SC") || item.label.includes("¥");
}

/**
 * 纯无头透明 OBS 投屏呈现视图（VW-Draft-01）：
 * - 移除 WardBarrier、静音开关与音效；
 * - 实时呈现放行弹幕与 Super Chat；
 * - WARD_BLOCKED 仅无声撤回同 platformOrder 项，屏幕不展示拦截反馈。
 */
export function StageView({ state, previewMode = false }: StageViewProps) {
  const showSamplePreview = previewMode && state.activeDeliveries.length === 0;
  const effectiveDeliveries: readonly ActiveDeliverItem[] = showSamplePreview
    ? [
        {
          deliveryId: "preview-sc-1",
          deliverySequence: 1,
          platformOrder: 1,
          label: "SC $100",
          text: "Happy Halloween from Tokyo!",
          translation: "来自东京的万圣节问候！",
          validUntil: "2099-01-01T00:00:00.000Z",
          validUntilMs: Number.MAX_SAFE_INTEGER,
        },
        {
          deliveryId: "preview-chat-1",
          deliverySequence: 2,
          platformOrder: 2,
          label: "Kaito_Fan",
          text: "今晚直播氛围太棒了，继续加油！",
          translation: null,
          validUntil: "2099-01-01T00:00:00.000Z",
          validUntilMs: Number.MAX_SAFE_INTEGER,
        },
      ]
    : state.activeDeliveries;

  const scItems = effectiveDeliveries.filter(isSuperChatItem);
  const chatItems = effectiveDeliveries.filter((item) => !isSuperChatItem(item));

  return (
    <main
      className={previewMode ? "vw-obs-stage vw-obs-stage--preview" : "vw-obs-stage"}
      data-stage-status={state.connectionStatus}
      aria-label="OBS Live Overlay Stage"
    >
      {showSamplePreview ? (
        <div className="vw-obs-preview-badge">OBS 透明投屏预览示例 · 请于「集成管理 › OBS 透明投屏源」签发只读令牌接入正式推流</div>
      ) : null}
      <ScScroll items={scItems} />

      <section aria-label="OBS Chat Feed" className="vw-obs-chat-list">
        {chatItems.map((item) => (
          <article key={item.deliveryId} className="vw-obs-chat-item">
            <span className="vw-obs-chat-item__author">
              <UntrustedText text={item.label ?? SAFE_ANONYMOUS_ALIAS} />
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
        ))}
      </section>
    </main>
  );
}

export interface StageProps {
  readonly initialState?: StageState;
  readonly previewMode?: boolean;
}

export function Stage({ initialState, previewMode }: StageProps = {}) {
  const [state, setState] = useState<StageState>(() => initialState ?? createInitialStageState());

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
    const parsed = parseOverlayCredential(window.location);
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
        setState((prev) => reduceStageFrame(prev, frame));
      };

      socket.onclose = (event) => {
        if (disposed) return;
        const msg = closeMessageFor(event.code);
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
  }, [initialState]);

  return <StageView state={state} previewMode={isPreview} />;
}
