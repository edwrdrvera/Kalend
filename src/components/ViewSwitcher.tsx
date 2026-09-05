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
    // Pill container with a lifted active tab — matches the rounded, warm
    // aesthetic of the month grid. No outer border; the muted background
    // provides enough contrast.
    <div className="flex items-center rounded-full bg-muted p-0.5 text-xs font-medium text-muted-foreground">
      {VIEWS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onViewChange(value)}
          aria-pressed={view === value}
          className={`rounded-full px-3 py-1 transition-colors ${
            view === value
              ? "bg-background text-foreground shadow-sm"
              : "hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
