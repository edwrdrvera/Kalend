"use client";

import { useEffect, useRef } from "react";
import { format, addDays, subDays, setHours, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import CalendarHeader from "./CalendarHeader";
import CalendarWeekdayLabel from "./CalendarWeekdayLabel";
import AllDayRow from "./AllDayRow";
import TimeGrid, { HOUR_HEIGHT_PX } from "./TimeGrid";
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
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  onTaskClick: (task: CalendarTask) => void;
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Single-column sticky header — flat design matching WeekGrid's day headers,
 *  but with a larger circle since there's only one column with more space. */
function DayColumnHeader({
  day,
  selectedDate,
}: {
  day: Date;
  selectedDate: Date;
}) {
  const isSelected = isSameDay(day, selectedDate);
  const isToday = isSameDay(day, new Date());

  let numberCls = "flex size-9 items-center justify-center rounded-full text-lg font-bold";
  if (isSelected) numberCls += " bg-primary text-primary-foreground";
  else if (isToday) numberCls += " text-primary";
  else numberCls += " text-foreground";

  return (
    <div className={cn(
      "hidden shrink-0 border-b border-border bg-background sm:flex",
      isToday && "bg-primary/[0.03]"
    )}>
      <div className="w-10 shrink-0 border-r border-border sm:w-16" />
      <div className="flex h-[74px] flex-1 flex-col items-start justify-center gap-0.5 pl-5">
        <CalendarWeekdayLabel>
          {format(day, "EEE")}
        </CalendarWeekdayLabel>
        <span className={numberCls}>{format(day, "d")}</span>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = [viewDate];
  const timedEvents = events.filter((event) => !isMultiDayEvent(event));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT_PX;
  }, []);

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
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="sticky top-0 z-10">
          <DayColumnHeader day={viewDate} selectedDate={selectedDate} />
          <AllDayRow
            days={days}
            events={events}
            tasks={tasks}
            categories={categories}
            onEventClick={onEventClick}
            onTaskClick={onTaskClick}
          />
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
