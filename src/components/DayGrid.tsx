"use client";

import { format, addDays, subDays, setHours } from "date-fns";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "./Calendar";
import CalendarHeader from "./CalendarHeader";
import AllDayRow from "./AllDayRow";
import TaskDueRow from "./TaskDueRow";
import TimeGrid from "./TimeGrid";
import { isMultiDayEvent } from "@/lib/time-grid-layout";
import type { CalendarView } from "./ViewSwitcher";

interface DayGridProps {
  viewDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
  onCreateEvent: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: CalendarTask) => void;
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** The single-day version of `WeekGrid`: same `TimeGrid` and `AllDayRow`,
 *  just a `days` array with one entry, and prev/next/today move by day
 *  instead of by week. */
export default function DayGrid({
  viewDate,
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
  const days = [viewDate];
  const timedEvents = events.filter((event) => !isMultiDayEvent(event));

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <CalendarHeader
        title={format(viewDate, "EEEE, MMM d, yyyy")}
        onPrev={() => onViewDateChange(subDays(viewDate, 1))}
        onNext={() => onViewDateChange(addDays(viewDate, 1))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      <AllDayRow days={days} events={events} categories={categories} onEventClick={onEventClick} />
      <TaskDueRow days={days} tasks={tasks} categories={categories} onTaskClick={onTaskClick} />
      <TimeGrid
        days={days}
        events={timedEvents}
        categories={categories}
        onEventClick={onEventClick}
        onEventMove={onEventMove}
        onEventResize={onEventResize}
        onSlotClick={(day, hour) => onCreateEvent(setHours(day, hour))}
      />
    </div>
  );
}
