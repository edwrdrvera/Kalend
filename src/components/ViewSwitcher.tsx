"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CalendarView = "month" | "week" | "day";

const VIEWS: { value: CalendarView; label: string; short: string }[] = [
  { value: "week", label: "Week", short: "W" },
  { value: "month", label: "Month", short: "M" },
  { value: "day", label: "Day", short: "D" },
];

interface ViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Switches between the month, week, and day grids. The active view is a solid chip. */
export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <Tabs
      value={view}
      onValueChange={(value) => {
        const next = VIEWS.find((v) => v.value === value);
        if (next) onViewChange(next.value);
      }}
    >
      <TabsList variant="contrast" className="group-data-horizontal/tabs:h-auto">
        {VIEWS.map(({ value, label, short }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-8 min-w-11 px-2.5 text-xs font-semibold md:h-7 md:min-w-0"
          >
            <span className="md:hidden">{short}</span>
            <span className="hidden md:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
