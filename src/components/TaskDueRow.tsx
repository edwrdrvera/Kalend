"use client";

import { isSameDay } from "date-fns";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";
import TaskChip from "./TaskChip";

interface TaskDueRowProps {
  /** Same day columns as AllDayRow/TimeGrid below it, so chips line up
   *  with the right day. */
  days: Date[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  onTaskClick?: (task: CalendarTask) => void;
}

function getTasksForDay(day: Date, tasks: CalendarTask[]): CalendarTask[] {
  return tasks.filter((task) => task.due_at && isSameDay(new Date(task.due_at), day));
}

/** Row for task due dates, separate from AllDayRow's event bars: a task
 *  due date is a single point in time, not a range, so there's no
 *  column-spanning to lay out, just each day's tasks stacked in its own
 *  column. Shared by Week and Day view, same as AllDayRow. */
export default function TaskDueRow({ days, tasks, categories, onTaskClick }: TaskDueRowProps) {
  const hasAnyTasks = days.some((day) => getTasksForDay(day, tasks).length > 0);
  if (!hasAnyTasks) return null;

  return (
    <div className="flex border-b border-border">
      <div className="w-14 shrink-0" />
      <div
        className="grid flex-1 gap-2"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <div key={day.getTime()} className="flex flex-col gap-0.5 p-1">
            {getTasksForDay(day, tasks).map((task) => (
              <TaskChip key={task.id} task={task} categories={categories} onClick={onTaskClick} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
