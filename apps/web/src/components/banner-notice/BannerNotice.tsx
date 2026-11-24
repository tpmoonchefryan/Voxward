import type { ReactNode } from "react";
import { InlineAlert, type Tone } from "@tcrn/ui-react/approved";

export type BannerTone = Tone | "info";

export interface BannerNoticeProps {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}

function mapTone(tone: BannerTone | undefined): Tone {
  switch (tone) {
    case "positive":
      return "positive";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    case "accent":
    case "info":
      return "accent";
    default:
      return "neutral";
  }
}

export function BannerNotice({ tone = "info", title, children, actions }: BannerNoticeProps) {
  return (
    <div className="vw-banner-notice" role="status">
      <InlineAlert tone={mapTone(tone)}>
        <div className="vw-row-between">
          <div className="vw-stack-sm">
            {title ? <strong>{title}</strong> : null}
            <div>{children}</div>
          </div>
          {actions ?? null}
        </div>
      </InlineAlert>
    </div>
  );
}
