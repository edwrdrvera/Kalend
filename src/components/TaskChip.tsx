"use client";

import { isPast } from "date-fns";
import { cn } from "@/lib/utils";
import TaskCheckbox from "./TaskCheckbox";
import SpaceDot from "./SpaceDot";
import { DIMMED_ITEM_CLASS } from "@/lib/space-focus";
import { resolveDisplayColor } from "@/lib/event-colors";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";

interface TaskChipProps {
  task: CalendarTask;
  categories: CalendarCategory[];
  onOpen: (task: CalendarTask) => void;
  onToggleComplete: (task: CalendarTask) => void;
  /** Outside the selected Space: rendered quieter, still fully interactive. */
  dimmed?: boolean;
  className?: string;
}

/** A due-date marker on the calendar grid, deliberately styled unlike an
 *  event pill (outlined, not filled) so it never reads as a scheduled
 *  block. Used by AllDayRow (week/day). The checkbox completes the task;
 *  the title opens its details. */
export default function TaskChip({
  task,
  categories,
  onOpen,
  onToggleComplete,
  dimmed,
  className,
}: TaskChipProps) {
  const overdue = !task.completed && task.due_at && isPast(new Date(task.due_at));
  const displayColor = resolveDisplayColor(
    task.color,
    task.category_id,
    task.color_overridden,
    categories
  );

  // The checkbox and title both stop propagation: a click on the chip must not also reach
  // the day cell underneath, which would select that day.
  return (
    <div
      className={cn(
        "group flex min-h-7 w-full min-w-0 items-center gap-1.5 rounded-sm px-1.5 text-meta font-medium transition-colors hover:bg-hover",
        task.completed
          ? "text-muted-foreground"
          : overdue
            ? "text-destructive"
            : "text-foreground",
        dimmed && DIMMED_ITEM_CLASS,
        className
      )}
    >
      <TaskCheckbox
        title={task.title}
        checked={task.completed}
        onToggle={() => onToggleComplete(task)}
        onClick={(e) => e.stopPropagation()}
        overdue={Boolean(overdue)}
      />
      <SpaceDot color={displayColor} overdue={Boolean(overdue)} />
      <button
        type="button"
        title={task.title}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(task);
        }}
        aria-label={overdue ? `Open task ${task.title}, Overdue` : `Open task ${task.title}`}
        className={cn(
          "min-w-0 flex-1 truncate rounded-sm text-left focus-ring",
          task.completed && "line-through"
        )}
      >
        {task.title}
      </button>
    </div>
  );
}
