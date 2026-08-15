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

interface MiniCalendarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
}

function MiniCalendarHeader({
  viewDate,
  onPrevMonth,
  onNextMonth,
}: {
  viewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-neutral-200 uppercase">
        {format(viewDate, "MMM yyyy")}
      </h2>
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
  onViewDateChange,
}: MiniCalendarProps) {
  const handleNextMonth = () => onViewDateChange(addMonths(viewDate, 1));
  const handlePrevMonth = () => onViewDateChange(subMonths(viewDate, 1));

  return (
    <div className="px-5 pb-6">
      <MiniCalendarHeader 
        viewDate={viewDate} 
        onPrevMonth={handlePrevMonth} 
        onNextMonth={handleNextMonth} 
      />
      <MiniCalendarDaysOfWeek />
      <MiniCalendarGrid 
        viewDate={viewDate} 
        currentDate={currentDate} 
        onDateSelect={onDateSelect} 
      />
    </div>
  );
}
