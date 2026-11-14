import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { UntrustedText } from "../../components/untrusted-text";
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
  type StageState,
} from "./api";
import { ScScroll } from "./ScScroll";
import { WardBarrier } from "./WardBarrier";

export interface StageViewProps {
  readonly roomId: string;
  readonly state: StageState;
  readonly muted: boolean;
  readonly onToggleMute: () => void;
}

export function StageView({ roomId, state, muted, onToggleMute }: StageViewProps) {
  return (
    <main
      data-testid="overlay-stage"
      data-connection-status={state.connectionStatus}
      style={{
        minHeight: "100vh",
        padding: "16px",
        background: "transparent",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <section
        aria-label="连接与保护范围说明"
        data-testid="overlay-status-bar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "8px 12px",
          marginBottom: "12px",
          borderRadius: "8px",
          backgroundColor: "rgba(17, 12, 24, 0.78)",
          color: "#e9d5ff",
          fontSize: "0.8rem",
        }}
      >
        <div>
          <span>
            OBS 舞台 · 频道 <UntrustedText text={roomId} /> · 状态：{state.connectionStatus}
          </span>
          {state.statusMessage !== null ? (
            <span data-testid="overlay-status-message" style={{ marginLeft: "8px", color: "#fde68a" }}>
              {state.statusMessage}
            </span>
          ) : null}
          <div style={{ marginTop: "4px", opacity: 0.8 }}>
            保护范围：仅展示当前频道已批准事件；拦截事件不泄露原文与身份；不补播过期或历史拦截；无 TTS / 无二次语音裁决；素材来源：自制 CC0。
          </div>
        </div>
        <button
          type="button"
          data-testid="overlay-mute-toggle"
          onClick={onToggleMute}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid #9333ea",
            backgroundColor: "rgba(59, 7, 100, 0.85)",
            color: "#f3e8ff",
            cursor: "pointer",
          }}
        >
          {muted ? "已静音（点击开启音效）" : "音效开启（点击静音）"}
        </button>
      </section>

      <WardBarrier
        event={state.activeWard}
        triggerCount={state.wardTriggerCount}
        muted={muted}
      />

      <section aria-label="获准 Super Chat 舞台" data-testid="overlay-deliveries">
        {state.activeDeliveries.map((item) => (
          <ScScroll key={item.deliveryId} item={item} />
        ))}
      </section>
    </main>
  );
}

export function Stage() {
  const { roomId = "" } = useParams();
  const [state, setState] = useState<StageState>(() => createInitialStageState("idle"));
  const [muted, setMuted] = useState(false);
  const attemptRef = useRef(0);

  useEffect(() => {
    const parsed = parseOverlayCredential(window.location);
    if (!parsed.ok) {
      setState(createInitialStageState("rejected", parsed.message));
      return;
    }

    const credential = parsed.credential;

    // Q16: wipe the credential fragment from browser history before opening the WebSocket.
    window.history.replaceState(null, "", parsed.cleanedUrl);

    let disposed = false;
    let activeSocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const expiryTimer = setInterval(() => {
      setState((prev) => pruneExpiredStageItems(prev, Date.now()));
    }, 500);

    function connect(): void {
      if (disposed) return;
      setState((prev) => ({
        ...prev,
        connectionStatus: attemptRef.current === 0 ? "connecting" : "reconnecting",
        reconnectAttempt: attemptRef.current,
        statusMessage: attemptRef.current === 0 ? "正在连接只读输出通道…" : `正在第 ${attemptRef.current} 次重连…`,
      }));

      const wsUrl = buildOverlayWsUrl(window.location);
      const subprotocols = buildOverlaySubprotocols(credential);
      const ws = new WebSocket(wsUrl, subprotocols);
      activeSocket = ws;

      ws.onmessage = (event) => {
        if (disposed || typeof event.data !== "string") return;
        const frame = parseNativeFrameJson(event.data);
        if (frame === null) return;
        if (frame.type === "HELLO") {
          attemptRef.current = 0;
        }
        setState((prev) => reduceStageFrame(prev, frame, Date.now()));
      };

      ws.onclose = (event) => {
        if (disposed) return;
        if (isTerminalCloseCode(event.code)) {
          setState((prev) => ({
            ...prev,
            connectionStatus: event.code === 4403 ? "revoked" : "closed",
            statusMessage: closeMessageFor(event.code),
          }));
          return;
        }
        const currentAttempt = attemptRef.current;
        attemptRef.current += 1;
        const delay = reconnectDelayMs(currentAttempt);
        setState((prev) => ({
          ...prev,
          connectionStatus: "reconnecting",
          reconnectAttempt: attemptRef.current,
          statusMessage: `${closeMessageFor(event.code)}（${Math.round(delay / 1000)}s 后重试）`,
        }));
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      clearInterval(expiryTimer);
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      activeSocket?.close();
    };
  }, [roomId]);

  return (
    <StageView
      roomId={roomId}
      state={state}
      muted={muted}
      onToggleMute={() => setMuted((prev) => !prev)}
    />
  );
}
