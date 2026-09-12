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
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2 pl-14 md:pl-4">
      <div className="flex items-center">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            className="grid size-8 place-items-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
            aria-label="Previous"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={onToday}
            className="hidden h-8 items-center rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted md:inline-flex"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="grid size-8 place-items-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
            aria-label="Next"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="min-w-0 truncate text-base font-extrabold tracking-[-0.035em] text-foreground md:text-xl">
          {title}
        </h1>
        <ChevronDown className="hidden size-4 shrink-0 text-foreground md:block" aria-hidden="true" />
      </div>
      <div className="ml-auto">
        <ViewSwitcher view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
