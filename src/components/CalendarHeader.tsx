"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import ViewSwitcher, { type CalendarView } from "./ViewSwitcher";

interface CalendarHeaderProps {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Shared header row for all three grid views: navigation first, followed by
 *  the current period title, with the view switcher anchored right. Each
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
    <div className="flex min-h-[94px] shrink-0 flex-wrap items-center gap-7 border-b border-border bg-card px-4 py-3 pl-16 sm:px-6 md:pl-6">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground shadow-sm transition-colors hover:bg-muted"
            aria-label="Previous"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={onToday}
            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground shadow-sm transition-colors hover:bg-muted"
            aria-label="Next"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-[26px] font-extrabold tracking-[-0.035em] text-foreground">
          {title}
        </h1>
        <ChevronDown className="size-5 shrink-0 text-foreground" aria-hidden="true" />
      </div>
      <div className="ml-auto">
        <ViewSwitcher view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
