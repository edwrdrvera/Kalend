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
import type { CalendarEvent } from "./Calendar";
import CalendarHeader from "./CalendarHeader";
import AllDayRow from "./AllDayRow";
import TimeGrid from "./TimeGrid";
import { isMultiDayEvent } from "@/lib/time-grid-layout";
import type { CalendarView } from "./ViewSwitcher";

interface WeekGridProps {
  viewDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
  onCreateEvent: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
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
  const base =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium";

  if (isSameDay(day, selectedDate)) return `${base} bg-blue-600 text-white`;
  if (isSameDay(day, new Date())) return `${base} bg-neutral-800 text-blue-400`;
  return `${base} text-neutral-300`;
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
    <div className="flex border-b border-neutral-800">
      <div className="w-14 shrink-0" />
      <div
        className="grid flex-1"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <button
            key={day.getTime()}
            type="button"
            onClick={() => onDateSelect(day)}
            className="flex flex-col items-center gap-1 border-l border-neutral-800 py-2 text-neutral-400 transition-colors hover:bg-neutral-900"
          >
            <span className="text-xs font-semibold">{format(day, "EEE")}</span>
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
  onDateSelect,
  onViewDateChange,
  onCreateEvent,
  onEventClick,
  onEventMove,
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
      <AllDayRow days={days} events={events} onEventClick={onEventClick} />
      <TimeGrid
        days={days}
        events={timedEvents}
        onEventClick={onEventClick}
        onEventMove={onEventMove}
        onSlotClick={(day, hour) => {
          onDateSelect(day);
          onCreateEvent(setHours(day, hour));
        }}
      />
    </div>
  );
}
