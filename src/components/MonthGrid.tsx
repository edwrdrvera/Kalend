"use client";

import { useRef } from "react";
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
import { tasksDueOn } from "@/lib/day-agenda";
import { cn } from "@/lib/utils";
import { createWheelPager } from "@/lib/wheel-pager";
import { dimClass, isEmphasized, type SpaceFocus } from "@/lib/space-focus";
import { getEventColorClasses, resolveDisplayColor } from "@/lib/event-colors";
import { eventAccessibleName } from "@/lib/event-accessible-name";
import CalendarHeader from "./CalendarHeader";
import CalendarWeekdayLabel from "./CalendarWeekdayLabel";
import type { CalendarView } from "./ViewSwitcher";

interface MonthGridProps {
  viewDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  spaceFocus: SpaceFocus;
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
  onCreateEvent: (day: Date, anchorRect: DOMRect) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
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
function DaysOfWeekRow() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div role="row" className="mb-2 grid h-8 shrink-0 grid-cols-7 gap-2 px-2 pt-2">
      {days.map((day) => (
        <div key={day} role="columnheader" className="flex items-center justify-center">
          <CalendarWeekdayLabel>{day}</CalendarWeekdayLabel>
        </div>
      ))}
    </div>
  );
}

function getCellClasses(day: Date, viewMonth: Date): string {
  const base = "flex flex-col items-start gap-1 rounded-[10px] border p-2 text-left overflow-hidden";
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
  return `${base} border-border ${isWeekend ? "bg-muted/30" : "bg-card"} hover:bg-hover cursor-pointer`;
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
    return `${base} text-primary-text font-bold`;
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

/** The cell shows only the first few events, so the selected Space's events
 *  go first. Order within each group is unchanged. */
function emphasizedFirst(events: CalendarEvent[], focus: SpaceFocus): CalendarEvent[] {
  return [
    ...events.filter((event) => isEmphasized(event, focus)),
    ...events.filter((event) => !isEmphasized(event, focus)),
  ];
}

/** True when the target sits on an event chip. The day-number button is not a
 *  chip: a double-click or right-click on it acts like one on the empty cell. */
function isOnChip(target: EventTarget): boolean {
  const button = (target as HTMLElement).closest("button");
  return button !== null && !button.hasAttribute("data-day-number");
}

function DayCell({
  day,
  monthStart,
  selectedDate,
  events,
  tasks,
  categories,
  spaceFocus,
  onDateSelect,
  onCreateEvent,
  onEventClick,
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
  spaceFocus: SpaceFocus;
  onDateSelect: (date: Date) => void;
  onCreateEvent: (day: Date, anchorRect: DOMRect) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  onDayContextMenu?: (day: Date, x: number, y: number) => void;
  onEventShiftClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, x: number, y: number) => void;
  selectedEventIds?: Set<string>;
}) {
  const dayEvents = emphasizedFirst(getEventsForDay(day, events), spaceFocus);
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = dayEvents.length - visibleEvents.length;

  const dayTasks = tasksDueOn(tasks, day);
  // Hidden events and the day's tasks share one row, so a busy day stays one line shorter.
  const summary = [
    overflowCount > 0 && `+${overflowCount} more`,
    dayTasks.length > 0 && `${dayTasks.length} ${dayTasks.length === 1 ? "task" : "tasks"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Single click selects the day (the agenda/side nav follows); double click on
  // an empty part of the cell opens the event creator. The double-click guard
  // ignores double-clicks that land on an event/task chip.
  const handleCellClick = () => {
    onDateSelect(day);
  };

  const handleCellDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOnChip(e.target)) return;
    onCreateEvent(day, e.currentTarget.getBoundingClientRect());
  };

  // The cell is a plain gridcell, not a button, because the day number and the
  // event chips inside it are their own buttons and buttons can't nest. The
  // day-number button is the keyboard way to select the day; its click
  // bubbles to the cell's click handler. Mouse users still click the empty
  // part of the cell.
  return (
    <div
      role="gridcell"
      onClick={handleCellClick}
      onDoubleClick={handleCellDoubleClick}
      onContextMenu={(e) => {
        if (isOnChip(e.target)) return;
        e.preventDefault();
        onDayContextMenu?.(day, e.clientX, e.clientY);
      }}
      className={getCellClasses(day, monthStart)}
    >
      <button
        type="button"
        data-day-number
        aria-label={`Select ${format(day, "EEEE, MMMM d, yyyy")}`}
        className={cn("focus-ring", getDayNumberClasses(day, monthStart, selectedDate))}
      >
        {format(day, "d")}
      </button>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        {visibleEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            aria-label={eventAccessibleName(event, categories.find((c) => c.id === event.category_id)?.name ?? null)}
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
              onEventContextMenu?.(event, e.clientX, e.clientY);
            }}
            className={cn(
              "focus-ring w-full min-w-0 overflow-hidden rounded-sm px-1.5 py-0.5 text-left text-meta font-medium leading-tight",
              getEventColorClasses(resolveDisplayColor(event.color, event.category_id, event.color_overridden, categories)),
              selectedEventIds?.has(event.id) && "ring-2 ring-primary ring-offset-1 ring-offset-background",
              dimClass(event, spaceFocus)
            )}
          >
            {/* Month cells are too narrow for a location line, so only the title shows. */}
            <span className="block truncate">{event.title}</span>
          </button>
        ))}
        {summary && (
          <span className="truncate px-1.5 text-left text-meta font-medium text-muted-foreground">{summary}</span>
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
  spaceFocus,
  onDateSelect,
  onViewDateChange,
  onCreateEvent,
  onEventClick,
  onDayContextMenu,
  onEventShiftClick,
  onEventContextMenu,
  selectedEventIds,
  view,
  onViewChange,
}: MonthGridProps) {
  const monthStart = startOfMonth(viewDate);
  const days = getGridDays(viewDate);
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const wheelPager = useRef(createWheelPager());

  // Scroll down for the next month, up for the previous. Pinch-zoom and sideways scrolls don't count.
  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const step = wheelPager.current.push(e.deltaY, e.timeStamp);
    if (step !== 0) onViewDateChange(addMonths(monthStart, step));
  }

  return (
    <div onWheel={handleWheel} className="flex h-full min-h-0 min-w-0 flex-1 select-none flex-col">
      <CalendarHeader
        title={format(viewDate, "MMMM yyyy")}
        onPrev={() => onViewDateChange(subMonths(monthStart, 1))}
        onNext={() => onViewDateChange(addMonths(monthStart, 1))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      <div
        id="calendar-grid"
        role="grid"
        aria-label={format(viewDate, "MMMM yyyy")}
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col outline-hidden"
      >
        <DaysOfWeekRow />
        <div className="grid min-h-0 flex-1 grid-rows-6 gap-2 px-2 pb-2">
          {weeks.map((week) => (
            <div key={week[0].getTime()} role="row" className="grid min-h-0 grid-cols-7 gap-2">
              {week.map((day) => (
                <DayCell
                  key={day.getTime()}
                  day={day}
                  monthStart={monthStart}
                  selectedDate={selectedDate}
                  events={events}
                  tasks={tasks}
                  categories={categories}
                  spaceFocus={spaceFocus}
                  onDateSelect={onDateSelect}
                  onCreateEvent={onCreateEvent}
                  onEventClick={onEventClick}
                  onDayContextMenu={onDayContextMenu}
                  onEventShiftClick={onEventShiftClick}
                  onEventContextMenu={onEventContextMenu}
                  selectedEventIds={selectedEventIds}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
