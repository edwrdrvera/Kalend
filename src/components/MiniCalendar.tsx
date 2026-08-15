"use client";

import { useEffect, useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  startOfMonth,
  endOfWeek,
  endOfMonth,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
}

/** Shows the browsed month/year only once it's diverged from the main
 *  calendar's month (`mainViewDate`) — when they match, the main header
 *  already says which month this is, so the label would be redundant. */
function MiniCalendarHeader({
  browseDate,
  mainViewDate,
  onPrevMonth,
  onNextMonth,
}: {
  browseDate: Date;
  mainViewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const showLabel = !isSameMonth(browseDate, mainViewDate);

  return (
    <div className={`flex items-center mb-4 ${showLabel ? "justify-between" : "justify-end"}`}>
      {showLabel && (
        <h2 className="text-sm font-semibold text-neutral-200 uppercase">
          {format(browseDate, "MMM yyyy")}
        </h2>
      )}
      <div className="flex gap-1 text-neutral-400">
        <button
          onClick={onPrevMonth}
          className="p-1 hover:bg-neutral-800 hover:text-neutral-200 rounded transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onNextMonth}
          className="p-1 hover:bg-neutral-800 hover:text-neutral-200 rounded transition-colors"
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
        <div key={i} className="w-7 text-center text-[10px] font-semibold text-neutral-500">
          {day}
        </div>
      ))}
    </div>
  );
}

function getDayClasses(day: Date, monthStart: Date, currentDate: Date): string {
  const baseClasses = "flex justify-center items-center w-7 h-7 text-xs font-medium rounded-[3px] transition-colors cursor-pointer";
  
  const isCurrentMonth = isSameMonth(day, monthStart);
  const isSelected = isSameDay(day, currentDate);
  const isTodayCurrent = isSameDay(day, new Date());

  if (!isCurrentMonth) {
    return `${baseClasses} text-neutral-600`;
  }
  
  if (isSelected) {
    return `${baseClasses} bg-blue-600 text-white`;
  }
  
  if (isTodayCurrent) {
    return `${baseClasses} bg-neutral-800 text-blue-400`;
  }
  
  return `${baseClasses} text-neutral-300 hover:bg-neutral-800`;
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
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const weeks = [];
  let currentWeekStart = startDate;
  
  while (currentWeekStart <= endDate) {
    weeks.push(currentWeekStart);
    currentWeekStart = addDays(currentWeekStart, 7);
  }

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
    <div className="px-5 pb-6">
      <MiniCalendarHeader
        browseDate={browseDate}
        mainViewDate={viewDate}
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
