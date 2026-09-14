"use client";

import { useEffect, useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  startOfMonth,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
  /** @deprecated No longer used -- the mini calendar is always visible. */
  collapsible?: boolean;
}

function MiniCalendarHeader({
  browseDate,
  onPrevMonth,
  onNextMonth,
}: {
  browseDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold tracking-[-0.02em] text-foreground">
        {format(browseDate, "MMMM yyyy")}
      </h2>
      <div className="flex gap-1 text-muted-foreground">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-full p-1 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-full p-1 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function MiniCalendarDaysOfWeek() {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="flex justify-between w-full mb-2">
      {days.map((day, i) => (
        <div key={i} className="w-8 text-center text-[10.5px] font-bold text-muted-foreground">
          {day}
        </div>
      ))}
    </div>
  );
}

function getDayClasses(day: Date, monthStart: Date, currentDate: Date): string {
  const baseClasses = "flex justify-center items-center w-8 h-8 py-1 text-[11.5px] font-medium transition-colors cursor-pointer";

  const isCurrentMonth = isSameMonth(day, monthStart);
  const isSelected = isSameDay(day, currentDate);
  const isTodayCurrent = isSameDay(day, new Date());

  if (!isCurrentMonth) {
    return `${baseClasses} rounded-md text-muted-foreground/30`;
  }

  if (isSelected) {
    return `${baseClasses} rounded-[6px] bg-primary text-primary-foreground font-semibold`;
  }

  if (isTodayCurrent) {
    // Today (when not selected): outlined square with ring to distinguish
    // it from an ordinary date without filling the background.
    return `${baseClasses} rounded-[6px] ring-2 ring-primary text-primary font-bold`;
  }

  return `${baseClasses} rounded-md text-foreground hover:bg-muted`;
}

function MiniCalendarGrid({
  viewDate,
  currentDate,
  onDateSelect,
}: {
  viewDate: Date;
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}) {
  const monthStart = startOfMonth(viewDate);
  const startDate = startOfWeek(monthStart);

  // Always render 6 week rows so the grid is a fixed height regardless of how
  // many weeks the month actually spans (4-6). Keeps the sidebar from shifting
  // when paging between months.
  const weeks = Array.from({ length: 6 }, (_, i) => addDays(startDate, i * 7));

  return (
    <div className="flex flex-col">
      {weeks.map((weekStart) => (
        <div
          className="flex justify-between w-full mb-1"
          key={`week-${weekStart.getTime()}`}
        >
          {Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(weekStart, i);

            return (
              <button
                type="button"
                key={`day-${day.getTime()}`}
                onClick={() => onDateSelect(day)}
                className={getDayClasses(day, monthStart, currentDate)}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function MiniCalendar({
  currentDate,
  viewDate,
  onDateSelect,
}: MiniCalendarProps) {
  // The month this mini calendar is browsing, kept separate from the main
  // calendar's viewDate so its own prev/next arrows can page through
  // months without dragging the main grid along. Re-synced below whenever
  // the main calendar's month changes for some other reason (its own nav,
  // selecting a date, Today), so this only drifts from the main view while
  // the user is actively browsing it here.
  const [browseDate, setBrowseDate] = useState(viewDate);

  useEffect(() => {
    setBrowseDate(viewDate);
  }, [viewDate]);

  const handleNextMonth = () => setBrowseDate((current) => addMonths(current, 1));
  const handlePrevMonth = () => setBrowseDate((current) => subMonths(current, 1));

  return (
    <div className="border-t border-border bg-[var(--mini-cal-bg)] pt-[14px] px-4 pb-4">
      <MiniCalendarHeader
        browseDate={browseDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />
      <MiniCalendarDaysOfWeek />
      <MiniCalendarGrid
        viewDate={browseDate}
        currentDate={currentDate}
        onDateSelect={onDateSelect}
      />
    </div>
  );
}
