"use client";

import { cn } from "@/lib/utils";

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

/** Segmented control for switching between the month, week, and day grids. */
export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-border bg-card text-xs font-semibold text-muted-foreground">
      {VIEWS.map(({ value, label, short }) => (
        <button
          key={value}
          type="button"
          onClick={() => onViewChange(value)}
          aria-pressed={view === value}
          className={cn(
            "h-8 border-r border-border px-1.5 transition-colors last:border-r-0 sm:px-2.5",
            view === value
              ? "bg-muted text-foreground"
              : "hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
