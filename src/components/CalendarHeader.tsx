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
    <div className="grid min-h-[82px] shrink-0 grid-cols-2 items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5 lg:grid-cols-[1fr_auto_1fr]">
      <div className="order-2 flex items-center lg:order-1">
        <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <button
            onClick={onPrev}
            className="grid size-9 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={onToday}
            className="border-x border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="grid size-9 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <h1 className="order-1 col-span-2 text-center text-xl font-extrabold tracking-[-0.035em] text-foreground whitespace-nowrap lg:order-2 lg:col-span-1">
        {title}
      </h1>
      <div className="order-3 justify-self-end">
        <ViewSwitcher view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
