"use client";

import { useState } from "react";
import { format, addDays, subDays, setHours, isSameDay } from "date-fns";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import CalendarHeader from "./CalendarHeader";
import AllDayRow from "./AllDayRow";
import TaskDueRow from "./TaskDueRow";
import TimeGrid from "./TimeGrid";
import { isMultiDayEvent } from "@/lib/time-grid-layout";
import type { CalendarView } from "./ViewSwitcher";

interface DayGridProps {
  viewDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
  onCreateEvent: (day: Date, anchorRect: DOMRect) => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: CalendarTask) => void;
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Single-column sticky header that mirrors WeekGrid's per-column day headers —
 *  shows the weekday abbreviation and date number, with a filled purple circle
 *  on the selected day and purple text for today (when not selected). */
function DayColumnHeader({
  day,
  selectedDate,
}: {
  day: Date;
  selectedDate: Date;
}) {
  const isSelected = isSameDay(day, selectedDate);
  const isToday = isSameDay(day, new Date());

  const columnCls = [
    "overflow-hidden rounded-[10px] py-2 transition-colors",
    isToday && !isSelected ? "ring-1 ring-inset ring-primary/40 bg-primary/5" : "ring-1 ring-inset ring-border bg-card",
  ].filter(Boolean).join(" ");

  let numberCls = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium";
  if (isSelected) numberCls += " bg-primary text-primary-foreground";
  else if (isToday) numberCls += " text-primary font-bold";
  else numberCls += " text-foreground";

  return (
    <div className="flex shrink-0 pt-2 pb-0 bg-background">
      <div className="w-16 shrink-0" />
      <div className="flex-1">
        <div className={columnCls}>
          <span className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {format(day, "EEE")}
            </span>
            <span className={numberCls}>{format(day, "d")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** The single-day version of `WeekGrid`: same `TimeGrid` and `AllDayRow`,
 *  just a `days` array with one entry, and prev/next/today move by day
 *  instead of by week. */
export default function DayGrid({
  viewDate,
  selectedDate,
  events,
  tasks,
  categories,
  onDateSelect,
  onViewDateChange,
  onCreateEvent,
  onEventClick,
  onTaskClick,
  onEventMove,
  onEventResize,
  view,
  onViewChange,
}: DayGridProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const days = [viewDate];
  const timedEvents = events.filter((event) => !isMultiDayEvent(event));

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <CalendarHeader
        title={format(viewDate, "EEEE, MMMM d, yyyy")}
        onPrev={() => onViewDateChange(subDays(viewDate, 1))}
        onNext={() => onViewDateChange(addDays(viewDate, 1))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      {/* Single scroll container — same pattern as WeekGrid. */}
      <div
        className="flex flex-1 flex-col overflow-y-auto"
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 0)}
      >
        <div className="sticky top-0 z-20">
          <DayColumnHeader day={viewDate} selectedDate={selectedDate} />
          {!isScrolled && (
            <>
              <AllDayRow days={days} events={events} categories={categories} onEventClick={onEventClick} />
              <TaskDueRow days={days} tasks={tasks} categories={categories} onTaskClick={onTaskClick} />
            </>
          )}
        </div>
        <TimeGrid
          days={days}
          events={timedEvents}
          categories={categories}
          onEventClick={onEventClick}
          onEventMove={onEventMove}
          onEventResize={onEventResize}
          onSlotClick={(day, hour, anchorRect) => onCreateEvent(setHours(day, hour), anchorRect)}
        />
      </div>
    </div>
  );
}
