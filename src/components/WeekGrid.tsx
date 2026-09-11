"use client";

import { useEffect, useRef } from "react";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isSameDay,
  setHours,
} from "date-fns";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import CalendarHeader from "./CalendarHeader";
import CalendarWeekdayLabel from "./CalendarWeekdayLabel";
import AllDayRow from "./AllDayRow";
import TimeGrid, { HOUR_HEIGHT_PX } from "./TimeGrid";
import { isMultiDayEvent } from "@/lib/time-grid-layout";
import type { CalendarView } from "./ViewSwitcher";

interface WeekGridProps {
  viewDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
  onCreateEvent: (day: Date, anchorRect: DOMRect) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  onTaskClick: (task: CalendarTask) => void;
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

function getWeekDays(viewDate: Date): Date[] {
  const weekStart = startOfWeek(viewDate);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function getDayNumberClasses(day: Date, selectedDate: Date): string {
  const base = "flex size-9 items-center justify-center rounded-full text-lg font-bold tracking-[-0.03em]";
  if (isSameDay(day, selectedDate)) return `${base} bg-primary text-primary-foreground`;
  if (isSameDay(day, new Date())) return `${base} text-primary`;
  return `${base} text-foreground`;
}

function WeekDaysHeader({
  days,
  selectedDate,
  onDateSelect,
}: {
  days: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}) {
  return (
    <div className="flex h-[74px] shrink-0 border-b border-border bg-card">
      <div className="w-16 shrink-0" />
      <div
        className="grid flex-1"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <button
            key={day.getTime()}
            type="button"
            onClick={() => onDateSelect(day)}
            className="flex cursor-pointer flex-col items-start justify-center gap-0.5 pl-4 transition-colors hover:bg-muted/40 lg:pl-5"
          >
            <CalendarWeekdayLabel className="w-9 text-center">
              {format(day, "EEE")}
            </CalendarWeekdayLabel>
            <span className={getDayNumberClasses(day, selectedDate)}>
              {format(day, "d")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WeekGrid({
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
}: WeekGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = getWeekDays(viewDate);
  const weekStart = days[0];
  const timedEvents = events.filter((event) => !isMultiDayEvent(event));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT_PX;
  }, []);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <CalendarHeader
        title={format(viewDate, "MMMM yyyy")}
        onPrev={() => onViewDateChange(subWeeks(weekStart, 1))}
        onNext={() => onViewDateChange(addWeeks(weekStart, 1))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      <WeekDaysHeader
        days={days}
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
      />
      <AllDayRow
        days={days}
        events={events}
        tasks={tasks}
        categories={categories}
        onEventClick={onEventClick}
        onTaskClick={onTaskClick}
      />
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <TimeGrid
          days={days}
          events={timedEvents}
          categories={categories}
          onEventClick={onEventClick}
          onEventMove={onEventMove}
          onEventResize={onEventResize}
          onSlotClick={(day, hour, anchorRect) => {
            onDateSelect(day);
            onCreateEvent(setHours(day, hour), anchorRect);
          }}
        />
      </div>
    </div>
  );
}
