"use client";

import { isSameDay } from "date-fns";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import { getEventColorClasses, resolveDisplayColor } from "@/lib/event-colors";
import { layoutAllDayEvents } from "@/lib/time-grid-layout";
import TaskChip from "./TaskChip";

const LANE_HEIGHT_PX = 28;

interface AllDayRowProps {
  /** Same day columns as the `TimeGrid` below it, so bars line up with the
   *  right days. */
  days: Date[];
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: CalendarTask) => void;
}

/** One shared band above `TimeGrid` for both due tasks and all-/multi-day
 *  events. Keeping them in one container avoids duplicate "all-day" labels
 *  while still allowing events to span several day columns. */
export default function AllDayRow({
  days,
  events,
  tasks,
  categories,
  onEventClick,
  onTaskClick,
}: AllDayRowProps) {
  const blocks = layoutAllDayEvents(days, events);
  const laneCount = blocks.length > 0 ? Math.max(...blocks.map((block) => block.lane)) + 1 : 0;
  const tasksByDay = days.map((day) =>
    tasks.filter((task) => task.due_at && isSameDay(new Date(task.due_at), day))
  );
  const hasTasks = tasksByDay.some((dayTasks) => dayTasks.length > 0);

  return (
    <div className="flex min-h-[50px] shrink-0 border-b border-border bg-card">
      <div className="flex w-16 shrink-0 items-start justify-end border-r border-border pr-3 pt-4">
        <span className="text-xs leading-none text-muted-foreground">all-day</span>
      </div>
      <div className="relative flex flex-1 flex-col py-1">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid divide-x divide-border"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => <span key={day.getTime()} />)}
        </div>

        {hasTasks && (
          <div
            className="relative grid"
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {tasksByDay.map((dayTasks, dayIndex) => (
              <div key={days[dayIndex].getTime()} className="flex min-w-0 flex-col gap-1 px-1.5 py-1">
                {dayTasks.map((task) => (
                  <TaskChip
                    key={task.id}
                    task={task}
                    categories={categories}
                    onClick={onTaskClick}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {blocks.length > 0 && (
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${laneCount}, ${LANE_HEIGHT_PX}px)`,
            }}
          >
            {blocks.map(({ event, startCol, endCol, lane }) => (
              <button
                key={event.id}
                type="button"
                title={event.title}
                onClick={() => onEventClick?.(event)}
                style={{
                  gridColumn: `${startCol + 1} / ${endCol + 2}`,
                  gridRow: lane + 1,
                }}
                className={`mx-1.5 my-0.5 overflow-hidden truncate rounded-md border px-2 py-0.5 text-left text-[11px] font-semibold ${getEventColorClasses(resolveDisplayColor(event.color, event.category_id, event.color_overridden, categories))}`}
              >
                {event.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
