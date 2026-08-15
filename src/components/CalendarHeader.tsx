"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import ViewSwitcher, { type CalendarView } from "./ViewSwitcher";

interface CalendarHeaderProps {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Shared header row for all three grid views: title on the left, and on the
 *  right the month/week/day switcher plus Today/prev/next navigation. Each
 *  grid computes its own title and prev/next behavior (a month, a week, or a
 *  day at a time) and passes them in. */
export default function CalendarHeader({
  title,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 shrink-0">
      <h1 className="text-lg font-semibold text-neutral-100 uppercase">{title}</h1>
      <div className="flex items-center gap-3">
        <ViewSwitcher view={view} onViewChange={onViewChange} />
        <button
          onClick={onToday}
          className="rounded-md border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          Today
        </button>
        <div className="flex gap-1 text-neutral-400">
          <button
            onClick={onPrev}
            className="rounded p-1 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onNext}
            className="rounded p-1 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
