"use client";

export type CalendarView = "month" | "week" | "day";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

interface ViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Segmented control for switching between the month, week, and day grids. */
export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-md border border-border p-0.5 text-xs font-medium text-muted-foreground">
      {VIEWS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onViewChange(value)}
          aria-pressed={view === value}
          className={`rounded px-2.5 py-1 transition-colors ${
            view === value
              ? "bg-muted text-foreground"
              : "hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
