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
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

const COLLAPSED_STORAGE_KEY = "kalend:mini-calendar-collapsed";

interface MiniCalendarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
  collapsible?: boolean;
}

function MiniCalendarHeader({
  browseDate,
  collapsible,
  collapsed,
  onToggleCollapsed,
  onPrevMonth,
  onNextMonth,
}: {
  browseDate: Date;
  collapsible: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div
      className={
        collapsed ? "flex items-center justify-between" : "mb-3 flex items-center justify-between"
      }
    >
      <h2 className="text-[13px] font-bold tracking-[-0.02em] text-foreground">
        {collapsible ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand mini calendar" : "Collapse mini calendar"}
            aria-expanded={!collapsed}
            className="flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:bg-muted"
          >
            {format(browseDate, "MMMM")}
            {collapsed ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronUp className="size-3.5" />
            )}
          </button>
        ) : (
          format(browseDate, "MMMM")
        )}
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
        <div key={i} className="w-7 text-center text-[10px] font-bold text-muted-foreground">
          {day}
        </div>
      ))}
    </div>
  );
}

function getDayClasses(day: Date, monthStart: Date, currentDate: Date): string {
  const baseClasses = "flex justify-center items-center w-7 h-7 text-xs font-medium rounded-full transition-colors cursor-pointer";
  
  const isCurrentMonth = isSameMonth(day, monthStart);
  const isSelected = isSameDay(day, currentDate);
  const isTodayCurrent = isSameDay(day, new Date());

  if (!isCurrentMonth) {
    return `${baseClasses} text-muted-foreground/40`;
  }

  if (isSelected) {
    return `${baseClasses} bg-primary text-primary-foreground`;
  }

  if (isTodayCurrent) {
    // Today (when not selected): outlined circle — ring matches the design
    // screenshot (filled circle only when it's also the selected date).
    return `${baseClasses} ring-2 ring-primary text-primary font-bold`;
  }

  return `${baseClasses} text-foreground hover:bg-muted`;
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
  collapsible = false,
}: MiniCalendarProps) {
  // The month this mini calendar is browsing, kept separate from the main
  // calendar's viewDate so its own prev/next arrows can page through
  // months without dragging the main grid along. Re-synced below whenever
  // the main calendar's month changes for some other reason (its own nav,
  // selecting a date, Today), so this only drifts from the main view while
  // the user is actively browsing it here.
  const [browseDate, setBrowseDate] = useState(viewDate);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setBrowseDate(viewDate);
  }, [viewDate]);

  useEffect(() => {
    if (!collapsible) return;

    try {
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, [collapsible]);

  const handleNextMonth = () => setBrowseDate((current) => addMonths(current, 1));
  const handlePrevMonth = () => setBrowseDate((current) => subMonths(current, 1));
  const handleToggleCollapsed = () => {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);

    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(nextCollapsed));
    } catch {
      // The control still works for the current session when storage is unavailable.
    }
  };

  return (
    <div className="mx-3 mb-2 rounded-lg border border-border bg-card p-2.5">
      <MiniCalendarHeader
        browseDate={browseDate}
        collapsible={collapsible}
        collapsed={collapsible && collapsed}
        onToggleCollapsed={handleToggleCollapsed}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />
      {(!collapsible || !collapsed) && (
        <>
          <MiniCalendarDaysOfWeek />
          <MiniCalendarGrid
            viewDate={browseDate}
            currentDate={currentDate}
            onDateSelect={onDateSelect}
          />
        </>
      )}
    </div>
  );
}
