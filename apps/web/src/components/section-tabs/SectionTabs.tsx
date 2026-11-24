import type { ReactNode } from "react";
import { SegmentedNav } from "@tcrn/ui-react/approved";

export interface SectionTabItem {
  readonly id: string;
  readonly label: string;
}

export interface SectionTabsProps {
  readonly label: string;
  readonly items: readonly SectionTabItem[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly children: ReactNode;
}

export function SectionTabs({
  label,
  items,
  selectedId,
  onSelect,
  children,
}: SectionTabsProps) {
  return (
    <div className="vw-stack-md">
      <SegmentedNav
        label={label}
        locale="zh-CN"
        items={items.map((item) => ({
          id: item.id,
          label: item.label,
          selected: item.id === selectedId,
        }))}
        onSelect={onSelect}
      />
      <div className="vw-stack-md" role="region" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
