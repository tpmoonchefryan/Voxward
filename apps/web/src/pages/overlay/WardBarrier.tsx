import { useEffect } from "react";
import type { WardBlockedEvent } from "./api";

export interface WardBarrierProps {
  readonly event: WardBlockedEvent | null;
  readonly triggerCount: number;
  readonly muted: boolean;
}

/**
 * Halloween ward barrier animation for WARD_BLOCKED stage events.
 * Strictly renders no original text, no translation, and no viewer identity.
 */
export function WardBarrier({ event, triggerCount, muted }: WardBarrierProps) {
  useEffect(() => {
    if (triggerCount === 0 || muted) return;
    if (typeof Audio === "undefined") return;
    try {
      const audio = new Audio("/overlay/ward-chime.wav");
      void audio.play().catch(() => undefined);
    } catch {
      // Ignore audio playback errors in headless or autoplay-restricted environments.
    }
  }, [triggerCount, muted]);

  if (event === null) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      data-testid="ward-barrier"
      data-delivery-id={event.deliveryId}
      data-platform-order={event.platformOrder}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        marginBottom: "12px",
        borderRadius: "12px",
        border: "2px solid #a855f7",
        background: "linear-gradient(135deg, rgba(46, 16, 101, 0.92), rgba(88, 28, 135, 0.88))",
        color: "#f5d0fe",
        boxShadow: "0 0 20px rgba(168, 85, 247, 0.55)",
      }}
    >
      <img
        src="/overlay/ward-barrier.svg"
        alt="万圣节结界拦截图标"
        width={40}
        height={40}
      />
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
          结界已触发拦截（#{event.platformOrder}）
        </div>
        <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
          违规内容与身份已由结界屏蔽，绝不展示原文或身份。
        </div>
      </div>
    </aside>
  );
}
