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

/** Segmented control for switching between the month, week, and day grids.
 *  Styled as a soft pill (a warm muted track with a raised card chip for the
 *  active view), echoing the landing-page mock rather than a hard-bordered box. */
export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 text-xs font-semibold text-muted-foreground">
      {VIEWS.map(({ value, label, short }) => (
        <button
          key={value}
          type="button"
          onClick={() => onViewChange(value)}
          aria-pressed={view === value}
          className={cn(
            "h-7 rounded-md px-1.5 transition-colors md:px-2.5",
            view === value
              ? "bg-card text-foreground shadow-sm"
              : "hover:text-foreground"
          )}
        >
          <span className="md:hidden">{short}</span>
          <span className="hidden md:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
