import { SAFE_ANONYMOUS_ALIAS, type ActiveDeliverItem } from "./api";
import { SuperChatCard } from "../../components/youtube-sc";

export interface ScScrollProps {
  readonly items: readonly ActiveDeliverItem[];
}

export function ScScroll({ items }: ScScrollProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-label="Super Chat 展示列表" className="vw-stack-sm">
      {items.map((item) => (
        <SuperChatCard
          key={item.deliveryId}
          item={{
            id: item.deliveryId,
            author: item.label ?? SAFE_ANONYMOUS_ALIAS,
            amountText: item.label,
            text: item.text,
            translation: item.translation,
          }}
        />
      ))}
    </section>
  );
}
