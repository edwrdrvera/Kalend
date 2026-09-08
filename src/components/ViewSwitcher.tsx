"use client";

export type CalendarView = "month" | "week" | "day";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

interface ViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Segmented control for switching between the month, week, and day grids. */
export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-border bg-card text-xs font-semibold text-muted-foreground">
      {VIEWS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onViewChange(value)}
          aria-pressed={view === value}
          className={`h-9 border-r border-border px-3 transition-colors last:border-r-0 ${
            view === value
              ? "bg-muted text-foreground"
              : "hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
