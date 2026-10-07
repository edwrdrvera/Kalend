"use client";

import { cn } from "@/lib/utils";
import { PRESS_CLS } from "./InspectorParts";

interface PanelTabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

/** The underlined tab row under a panel's title. */
export default function PanelTabs<T extends string>({ tabs, value, onChange }: PanelTabsProps<T>) {
  return (
    <div role="tablist" aria-label="Panel sections" className="-mb-px mt-2 flex gap-[18px]">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "border-b-2 pb-2.5 pt-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            PRESS_CLS,
            value === id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
