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
import type { CalendarCategory, CalendarEvent, CalendarTask } from "./Calendar";
import { getEventColorClasses, resolveDisplayColor } from "@/lib/event-colors";
import CalendarHeader from "./CalendarHeader";
import TaskChip from "./TaskChip";
import type { CalendarView } from "./ViewSwitcher";

interface MonthGridProps {
  viewDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
  onCreateEvent: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: CalendarTask) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const MAX_VISIBLE_EVENTS = 3;
const MAX_VISIBLE_TASKS = 2;

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
    <div className="grid grid-cols-7 border-b border-neutral-800 shrink-0">
      {days.map((day) => (
        <div
          key={day}
          className="px-3 py-2 text-center text-xs font-semibold text-neutral-500"
        >
          {day}
        </div>
      ))}
    </div>
  );
}

function getCellClasses(day: Date, viewMonth: Date): string {
  const base =
    "flex flex-col items-start gap-1 border-b border-r border-neutral-800 p-2 text-left transition-colors overflow-hidden";

  if (!isSameMonth(day, viewMonth)) {
    return `${base} bg-neutral-900/40 text-neutral-600`;
  }

  return `${base} hover:bg-neutral-900`;
}

function getDayNumberClasses(day: Date, viewMonth: Date, selectedDate: Date): string {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium";

  const isCurrentMonth = isSameMonth(day, viewMonth);
  const isSelected = isSameDay(day, selectedDate);
  const isTodayDay = isSameDay(day, new Date());

  if (isSelected) {
    return `${base} bg-blue-600 text-white`;
  }

  if (isTodayDay) {
    return `${base} bg-neutral-800 text-blue-400`;
  }

  if (!isCurrentMonth) {
    return `${base} text-neutral-600`;
  }

  return `${base} text-neutral-300`;
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
}: {
  day: Date;
  monthStart: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onDateSelect: (date: Date) => void;
  onCreateEvent: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: CalendarTask) => void;
}) {
  const dayEvents = getEventsForDay(day, events);
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = dayEvents.length - visibleEvents.length;

  const dayTasks = getTasksForDay(day, tasks);
  const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
  const taskOverflowCount = dayTasks.length - visibleTasks.length;

  const handleCellClick = () => {
    onDateSelect(day);
    onCreateEvent(day);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCellClick();
    }
  };

  // Not a <button> — event chips inside are their own <button>s, and
  // buttons can't nest. role="button" + onKeyDown keeps the empty-area
  // click keyboard-accessible.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCellClick}
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
            title={event.title}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(event);
            }}
            className={`w-full truncate rounded-r-sm rounded-l-none px-1.5 py-0.5 text-left text-[10px] font-medium ${getEventColorClasses(resolveDisplayColor(event.color, event.category_id, categories))}`}
          >
            {event.title}
          </button>
        ))}
        {overflowCount > 0 && (
          <span className="px-1.5 text-left text-[10px] font-medium text-neutral-500">
            +{overflowCount} more
          </span>
        )}
        {visibleTasks.map((task) => (
          <TaskChip key={task.id} task={task} categories={categories} onClick={onTaskClick} />
        ))}
        {taskOverflowCount > 0 && (
          <span className="px-1.5 text-left text-[10px] font-medium text-neutral-500">
            +{taskOverflowCount} more
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
  view,
  onViewChange,
}: MonthGridProps) {
  const monthStart = startOfMonth(viewDate);
  const days = getGridDays(viewDate);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <CalendarHeader
        title={format(viewDate, "MMMM yyyy")}
        onPrev={() => onViewDateChange(subMonths(monthStart, 1))}
        onNext={() => onViewDateChange(addMonths(monthStart, 1))}
        onToday={() => onDateSelect(new Date())}
        view={view}
        onViewChange={onViewChange}
      />
      <DaysOfWeekRow />
      <div className="grid flex-1 grid-cols-7 grid-rows-6 border-l border-neutral-800">
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
          />
        ))}
      </div>
    </div>
  );
}
