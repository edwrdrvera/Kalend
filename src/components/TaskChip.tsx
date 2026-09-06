"use client";

import { isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { getTaskColorClasses, resolveDisplayColor } from "@/lib/event-colors";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";

interface TaskChipProps {
  task: CalendarTask;
  categories: CalendarCategory[];
  onClick?: (task: CalendarTask) => void;
  className?: string;
}

/** A due-date marker on the calendar grid, deliberately styled unlike an
 *  event pill (outlined, not filled) so it never reads as a scheduled
 *  block. Shared by MonthGrid's day cells and TaskDueRow (week/day).
 *  Clicking it toggles complete, same as the sidebar task list, there's no
 *  separate task-edit view yet to open instead. */
export default function TaskChip({ task, categories, onClick, className }: TaskChipProps) {
  const overdue = !task.completed && task.due_at && isPast(new Date(task.due_at));

  return (
    <button
      type="button"
      title={task.title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(task);
      }}
      aria-pressed={task.completed}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 truncate rounded border bg-transparent px-1.5 py-0.5 text-left text-[10px] font-medium",
        task.completed
          ? "border-border text-muted-foreground line-through"
          : overdue
            ? "border-red-500/60 text-red-600 dark:text-red-400"
            : getTaskColorClasses(resolveDisplayColor(task.color, task.category_id, task.color_overridden, categories)),
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full border border-current",
          task.completed && "bg-current"
        )}
      />
      <span className="truncate">{task.title}</span>
    </button>
  );
}
