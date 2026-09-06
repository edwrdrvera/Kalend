"use client";

import { useState } from "react";
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

function getDayNumberClasses(day: Date, selectedDate: Date): string {
  const base = "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold";
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
    // Border-b connects visually with the all-day row / time grid below.
    // No per-cell borders — the shared border-b here and the time grid's
    // outer left border from the column container provide enough structure.
    <div className="flex shrink-0 border-b border-border bg-background">
      {/* Gutter with right border aligns with the time-label column */}
      <div className="w-16 shrink-0 border-r border-border" />
      <div
        className="grid flex-1 divide-x divide-border"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <button
            key={day.getTime()}
            type="button"
            onClick={() => onDateSelect(day)}
            className={`flex flex-col items-center gap-1 py-2.5 transition-colors hover:bg-muted/40 cursor-pointer ${
              isSameDay(day, new Date()) ? "bg-primary/[0.03]" : ""
            }`}
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
  const [isScrolled, setIsScrolled] = useState(false);
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
      {/* Single scroll container — scrollbar outside both header and time grid
          so all seven columns always line up. */}
      <div
        className="flex flex-1 flex-col overflow-y-auto"
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 0)}
      >
        {/* Sticky header — collapses to a thin border strip when scrolled. */}
        <div className="sticky top-0 z-20">
          <WeekDaysHeader
            days={days}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
          />
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
          onSlotClick={(day, hour, anchorRect) => {
            onDateSelect(day);
            onCreateEvent(setHours(day, hour), anchorRect);
          }}
        />
      </div>
    </div>
  );
}
