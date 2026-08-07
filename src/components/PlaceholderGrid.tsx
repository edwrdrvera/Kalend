"use client";

import { format, addDays, subDays } from "date-fns";
import CalendarHeader from "./CalendarHeader";
import type { CalendarView } from "./ViewSwitcher";

type PlaceholderView = Exclude<CalendarView, "month">;

interface PlaceholderGridProps {
  view: PlaceholderView;
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
}

const STEP_DAYS: Record<PlaceholderView, number> = { week: 7, day: 1 };
const VIEW_LABEL: Record<PlaceholderView, string> = { week: "Week", day: "Day" };

/** Stand-in for the Week/Day grids (see tasks 12–13 in TASKS.md) — keeps the
 *  shared header, nav, and view switcher working while the real grid bodies
 *  aren't built yet. */
export default function PlaceholderGrid({
  view,
  viewDate,
  onViewDateChange,
  onDateSelect,
  onViewChange,
}: PlaceholderGridProps) {
  const step = STEP_DAYS[view];
  const title =
    view === "week"
      ? `Week of ${format(viewDate, "MMM d, yyyy")}`
      : format(viewDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <CalendarHeader
        title={title}
        onPrev={() => onViewDateChange(subDays(viewDate, step))}
        onNext={() => onViewDateChange(addDays(viewDate, step))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
        {VIEW_LABEL[view]} view is coming soon.
      </div>
    </div>
  );
}
