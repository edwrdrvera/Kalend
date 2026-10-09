"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import ViewSwitcher, { type CalendarView } from "./ViewSwitcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 pl-14 h-[53px] md:pl-4">
      <div className="flex items-center">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            className={buttonVariants({ variant: "outline", size: "icon-lg" })}
            aria-label="Previous"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={onToday}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "hidden text-xs font-semibold md:inline-flex")}
          >
            Today
          </button>
          <button
            onClick={onNext}
            className={buttonVariants({ variant: "outline", size: "icon-lg" })}
            aria-label="Next"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="flex min-w-0 items-center">
        <h1 className="min-w-0 truncate text-base font-bold tracking-[-0.02em] [word-spacing:0.06em] text-foreground md:text-xl">
          {title}
        </h1>
      </div>
      <div className="ml-auto">
        <ViewSwitcher view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
