"use client";

import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isSameDay,
  isSameMonth,
  setHours,
} from "date-fns";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import CalendarHeader from "./CalendarHeader";
import AllDayRow from "./AllDayRow";
import TaskDueRow from "./TaskDueRow";
import TimeGrid from "./TimeGrid";
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
  onEventClick: (event: CalendarEvent) => void;
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

function formatWeekRangeTitle(weekStart: Date, weekEnd: Date): string {
  const start = format(weekStart, "MMM d");
  const end = isSameMonth(weekStart, weekEnd)
    ? format(weekEnd, "d, yyyy")
    : format(weekEnd, "MMM d, yyyy");
  return `${start}–${end}`;
}

function getDayColumnClasses(day: Date): string {
  // ring-inset renders the border inside the box — no effect on layout, so
  // the columns stay pixel-perfect aligned with TimeGrid's columns below.
  const base =
    "flex flex-col items-center gap-1 rounded-lg py-2 transition-colors cursor-pointer hover:bg-muted/40 ring-1 ring-inset";
  if (isSameDay(day, new Date()))
    return `${base} ring-primary/40 bg-primary/5`;
  return `${base} ring-border bg-card`;
}

function getDayNumberClasses(day: Date, selectedDate: Date): string {
  const base =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium";

  if (isSameDay(day, selectedDate)) return `${base} bg-primary text-primary-foreground`;
  if (isSameDay(day, new Date())) return `${base} text-primary font-bold`;
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
    <div className="shrink-0 pt-2 pb-1.5">
      <div
        className="grid"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* Spacer aligns with the hour-label column in TimeGrid */}
        <div />
        {days.map((day) => (
          <button
            key={day.getTime()}
            type="button"
            onClick={() => onDateSelect(day)}
            className={getDayColumnClasses(day)}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {format(day, "EEE")}
            </span>
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
  const days = getWeekDays(viewDate);
  const weekStart = days[0];
  const weekEnd = days[days.length - 1];

  const timedEvents = events.filter((event) => !isMultiDayEvent(event));

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <CalendarHeader
        title={formatWeekRangeTitle(weekStart, weekEnd)}
        onPrev={() => onViewDateChange(subWeeks(weekStart, 1))}
        onNext={() => onViewDateChange(addWeeks(weekStart, 1))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      <WeekDaysHeader days={days} selectedDate={selectedDate} onDateSelect={onDateSelect} />
      <AllDayRow days={days} events={events} categories={categories} onEventClick={onEventClick} />
      <TaskDueRow days={days} tasks={tasks} categories={categories} onTaskClick={onTaskClick} />
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
  );
}
