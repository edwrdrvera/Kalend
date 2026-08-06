"use client";

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

interface MonthGridProps {
  viewDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
}

function MonthGridHeader({
  viewDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}: {
  viewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 shrink-0">
      <h1 className="text-lg font-semibold text-neutral-100">
        {format(viewDate, "MMMM yyyy")}
      </h1>
      <div className="flex items-center gap-2">
        <button
          onClick={onToday}
          className="rounded-md border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          Today
        </button>
        <div className="flex gap-1 text-neutral-400">
          <button
            onClick={onPrevMonth}
            className="rounded p-1 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onNextMonth}
            className="rounded p-1 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DaysOfWeekRow() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="grid grid-cols-7 border-b border-neutral-800 shrink-0">
      {days.map((day) => (
        <div
          key={day}
          className="px-3 py-2 text-center text-xs font-semibold text-neutral-500"
        >
          {day}
        </div>
      ))}
    </div>
  );
}

function getCellClasses(day: Date, viewMonth: Date): string {
  const base =
    "flex flex-col items-start gap-1 border-b border-r border-neutral-800 p-2 text-left transition-colors";

  if (!isSameMonth(day, viewMonth)) {
    return `${base} bg-neutral-900/40 text-neutral-600`;
  }

  return `${base} hover:bg-neutral-900`;
}

function getDayNumberClasses(day: Date, viewMonth: Date, selectedDate: Date): string {
  const base = "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium";

  const isCurrentMonth = isSameMonth(day, viewMonth);
  const isSelected = isSameDay(day, selectedDate);
  const isTodayDay = isSameDay(day, new Date());

  if (isSelected) {
    return `${base} bg-blue-600 text-white`;
  }

  if (isTodayDay) {
    return `${base} bg-neutral-800 text-blue-400`;
  }

  if (!isCurrentMonth) {
    return `${base} text-neutral-600`;
  }

  return `${base} text-neutral-300`;
}

/** Build a 7x6 (42 cell) grid: the weeks spanning the visible month, padded out
 *  with leading/trailing days so every month renders the same fixed height. */
function getGridDays(viewDate: Date): Date[] {
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1));
  }

  return days;
}

export default function MonthGrid({
  viewDate,
  selectedDate,
  onDateSelect,
  onViewDateChange,
}: MonthGridProps) {
  const monthStart = startOfMonth(viewDate);
  const days = getGridDays(viewDate);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <MonthGridHeader
        viewDate={viewDate}
        onPrevMonth={() => onViewDateChange(subMonths(monthStart, 1))}
        onNextMonth={() => onViewDateChange(addMonths(monthStart, 1))}
        onToday={() => onDateSelect(new Date())}
      />
      <DaysOfWeekRow />
      <div className="grid flex-1 grid-cols-7 grid-rows-6 border-l border-neutral-800">
        {days.map((day) => (
          <button
            key={day.getTime()}
            onClick={() => onDateSelect(day)}
            className={getCellClasses(day, monthStart)}
          >
            <span className={getDayNumberClasses(day, monthStart, selectedDate)}>
              {format(day, "d")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
