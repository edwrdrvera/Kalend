"use client";

import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  startOfMonth,
  endOfWeek,
  endOfMonth,
  startOfDay,
  endOfDay,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import { cn } from "@/lib/utils";
import { getEventColorClasses, resolveDisplayColor } from "@/lib/event-colors";
import CalendarHeader from "./CalendarHeader";
import CalendarWeekdayLabel from "./CalendarWeekdayLabel";
import type { CalendarView } from "./ViewSwitcher";

interface MonthGridProps {
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
  onDayContextMenu?: (day: Date, x: number, y: number) => void;
  onEventShiftClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, x: number, y: number) => void;
  selectedEventIds?: Set<string>;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const MAX_VISIBLE_EVENTS = 3;

/** Events whose [start_at, end_at] range overlaps this day at all — so a
 *  multi-day event shows up on every day it spans, not just the first. */
function getEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return events.filter((event) => {
    const eventStart = new Date(event.start_at);
    const eventEnd = new Date(event.end_at);
    return eventStart <= dayEnd && eventEnd >= dayStart;
  });
}

/** Tasks due on this exact day. Unlike events, a task's due date is a
 *  single point in time, not a range, so this is a same-day check. */
function getTasksForDay(day: Date, tasks: CalendarTask[]): CalendarTask[] {
  return tasks.filter((task) => task.due_at && isSameDay(new Date(task.due_at), day));
}

function DaysOfWeekRow() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="mb-2 grid h-8 shrink-0 grid-cols-7 gap-2 px-2 pt-2">
      {days.map((day) => (
        <div key={day} className="flex items-center justify-center">
          <CalendarWeekdayLabel>{day}</CalendarWeekdayLabel>
        </div>
      ))}
    </div>
  );
}

function getCellClasses(day: Date, viewMonth: Date): string {
  const base = "flex flex-col items-start gap-1 rounded-[10px] border p-2 text-left overflow-hidden transition-colors";
  const isTodayDay = isSameDay(day, new Date());

  if (!isSameMonth(day, viewMonth)) {
    // Out-of-month cells: transparent background, faded numbers only.
    return `${base} border-transparent bg-transparent`;
  }

  if (isTodayDay) {
    // Today: primary-colored border + subtle primary tint, matching the
    // mockup's accent-border treatment (translated from orange to indigo).
    return `${base} border-primary/40 bg-primary/5 ring-1 ring-primary/15`;
  }

  // Weekends get a slightly darker fill than weekdays, in-month only.
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  return `${base} border-border ${isWeekend ? "bg-muted/30" : "bg-card"} hover:bg-muted/40 cursor-pointer`;
}

function getDayNumberClasses(day: Date, viewMonth: Date, selectedDate: Date): string {
  // Fixed h-6 w-6 box in every state, so the events below never reflow
  // when a day becomes selected or today.
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium";

  const isCurrentMonth = isSameMonth(day, viewMonth);
  const isSelected = isSameDay(day, selectedDate);
  const isTodayDay = isSameDay(day, new Date());

  if (isSelected && !isTodayDay) {
    return `${base} bg-primary text-primary-foreground`;
  }

  if (isTodayDay) {
    // Today: bold accent-colored text, no fill. The cell itself carries
    // the today highlight (tinted border + wash).
    return `${base} text-primary font-bold`;
  }

  if (!isCurrentMonth) {
    return `${base} text-muted-foreground/40`;
  }

  return `${base} text-foreground`;
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

function DayCell({
  day,
  monthStart,
  selectedDate,
  events,
  tasks,
  categories,
  onDateSelect,
  onCreateEvent,
  onEventClick,
  onTaskClick,
  onDayContextMenu,
  onEventShiftClick,
  onEventContextMenu,
  selectedEventIds,
}: {
  day: Date;
  monthStart: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onDateSelect: (date: Date) => void;
  onCreateEvent: (day: Date, anchorRect: DOMRect) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  onTaskClick: (task: CalendarTask) => void;
  onDayContextMenu?: (day: Date, x: number, y: number) => void;
  onEventShiftClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, x: number, y: number) => void;
  selectedEventIds?: Set<string>;
}) {
  const dayEvents = getEventsForDay(day, events);
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = dayEvents.length - visibleEvents.length;

  const dayTasks = getTasksForDay(day, tasks);

  // Single click selects the day (the agenda/side nav follows); double click on
  // an empty part of the cell opens the event creator. The double-click guard
  // ignores double-clicks that land on an event/task chip.
  const handleCellClick = () => {
    onDateSelect(day);
  };

  const handleCellDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onCreateEvent(day, e.currentTarget.getBoundingClientRect());
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onDateSelect(day);
    }
  };

  // Not a <button> — event chips inside are their own <button>s, and
  // buttons can't nest. role="button" + onKeyDown keeps the empty-area
  // click keyboard-accessible.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${format(day, "EEEE, MMMM d, yyyy")}`}
      onClick={handleCellClick}
      onDoubleClick={handleCellDoubleClick}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        e.preventDefault();
        onDayContextMenu?.(day, e.clientX, e.clientY);
      }}
      onKeyDown={handleCellKeyDown}
      className={getCellClasses(day, monthStart)}
    >
      <span className={getDayNumberClasses(day, monthStart, selectedDate)}>
        {format(day, "d")}
      </span>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        {visibleEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            title={event.location ? `${event.title} (${event.location})` : event.title}
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey && onEventShiftClick) {
                onEventShiftClick(event);
                return;
              }
              onEventClick(event, e.currentTarget.getBoundingClientRect());
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEventContextMenu?.(event, e.clientX, e.clientY);
            }}
            className={cn(
              "w-full min-w-0 overflow-hidden rounded-[6px] px-1.5 py-0.5 text-left text-[10px] font-semibold",
              getEventColorClasses(resolveDisplayColor(event.color, event.category_id, event.color_overridden, categories)),
              selectedEventIds?.has(event.id) && "ring-2 ring-primary ring-offset-1"
            )}
          >
            {/* Month cells are too narrow for a location line, so only the
             *  icon (if set) rides along with the title here. */}
            <span className="block truncate">
              {event.icon && <span className="mr-1">{event.icon}</span>}
              {event.title}
            </span>
          </button>
        ))}
        {overflowCount > 0 && (
          <span className="px-1.5 text-left text-[10px] font-medium text-muted-foreground">
            +{overflowCount} more
          </span>
        )}
        {dayTasks.length > 0 && (
          <span className="px-1.5 text-left text-[10px] font-medium text-muted-foreground">
            {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MonthGrid({
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
  onDayContextMenu,
  onEventShiftClick,
  onEventContextMenu,
  selectedEventIds,
  view,
  onViewChange,
}: MonthGridProps) {
  const monthStart = startOfMonth(viewDate);
  const days = getGridDays(viewDate);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 select-none flex-col">
      <CalendarHeader
        title={format(viewDate, "MMMM yyyy")}
        onPrev={() => onViewDateChange(subMonths(monthStart, 1))}
        onNext={() => onViewDateChange(addMonths(monthStart, 1))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      <DaysOfWeekRow />
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-2 px-2 pb-2">
        {days.map((day) => (
          <DayCell
            key={day.getTime()}
            day={day}
            monthStart={monthStart}
            selectedDate={selectedDate}
            events={events}
            tasks={tasks}
            categories={categories}
            onDateSelect={onDateSelect}
            onCreateEvent={onCreateEvent}
            onEventClick={onEventClick}
            onTaskClick={onTaskClick}
            onDayContextMenu={onDayContextMenu}
            onEventShiftClick={onEventShiftClick}
            onEventContextMenu={onEventContextMenu}
            selectedEventIds={selectedEventIds}
          />
        ))}
      </div>
    </div>
  );
}
