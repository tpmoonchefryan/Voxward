import { UntrustedText } from "../../components/untrusted-text";
import { SAFE_ANONYMOUS_ALIAS, type ActiveDeliverItem } from "./api";

export interface ScScrollProps {
  readonly item: ActiveDeliverItem;
}

/**
 * Halloween-themed Super Chat scroll card.
 * Untrusted viewer text and generated translation are rendered via UntrustedText (<bdi>) with clear visual separation.
 * When display.label is null, a fixed safe alias is shown instead of guessing a platform username.
 */
export function ScScroll({ item }: ScScrollProps) {
  return (
    <article
      className="voxward-sc-scroll"
      data-testid="sc-scroll-card"
      data-delivery-id={item.deliveryId}
      data-platform-order={item.platformOrder}
      style={{
        position: "relative",
        padding: "16px 20px",
        marginBottom: "12px",
        borderRadius: "12px",
        border: "2px solid #d97706",
        background: "linear-gradient(135deg, rgba(28, 18, 36, 0.92), rgba(49, 24, 58, 0.92))",
        color: "#fef3c7",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "8px",
          fontSize: "0.875rem",
          color: "#fbbf24",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src="/overlay/scroll-frame.svg"
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
          />
          <span data-testid="sc-safe-alias">
            {item.label === null ? SAFE_ANONYMOUS_ALIAS : <UntrustedText text={item.label} />}
          </span>
        </div>
        <span style={{ opacity: 0.75 }}>#{item.platformOrder}</span>
      </header>

      <div
        data-testid="sc-original-section"
        style={{
          padding: "8px 10px",
          borderRadius: "8px",
          backgroundColor: "rgba(15, 10, 22, 0.55)",
          marginBottom: item.translation !== null ? "8px" : "0",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#fcd34d", marginBottom: "4px" }}>
          观众原文（原始输入）：
        </div>
        <div data-testid="sc-original-text" style={{ fontSize: "1.05rem", lineHeight: 1.45 }}>
          <UntrustedText text={item.text} />
        </div>
      </div>

      {item.translation !== null ? (
        <div
          data-testid="sc-translation-section"
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            borderLeft: "3px solid #a855f7",
            backgroundColor: "rgba(88, 28, 135, 0.35)",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#d8b4fe", marginBottom: "4px" }}>
            AI 精翻（生成内容）：
          </div>
          <div data-testid="sc-translation-text" style={{ fontSize: "0.975rem", color: "#f3e8ff", lineHeight: 1.45 }}>
            <UntrustedText text={item.translation} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
