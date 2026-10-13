"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PanelTabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

/** The underlined tab row under a panel's title. */
export default function PanelTabs<T extends string>({ tabs, value, onChange }: PanelTabsProps<T>) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        const tab = tabs.find((t) => t.id === next);
        if (tab) onChange(tab.id);
      }}
      className="mt-2"
    >
      <TabsList variant="line" aria-label="Panel sections">
        {tabs.map(({ id, label }) => (
          <TabsTrigger key={id} value={id} className="text-body font-semibold">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
