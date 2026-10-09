"use client";

import { isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DIMMED_ITEM_CLASS } from "@/lib/space-focus";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";
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
        "group flex min-h-7 w-full min-w-0 items-center gap-1.5 rounded-sm px-1.5 text-[11px] font-medium transition-colors hover:bg-hover",
        task.completed
          ? "text-muted-foreground"
          : overdue
            ? "text-destructive"
            : "text-foreground",
        dimmed && DIMMED_ITEM_CLASS,
        className
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggleComplete(task)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${task.completed ? "Mark as not done" : "Mark as done"}: ${task.title}`}
        className={cn(
          "size-3.5 rounded-[3px] border-muted-foreground/70 data-checked:border-muted-foreground data-checked:bg-muted-foreground data-checked:text-background dark:data-checked:bg-muted-foreground",
          overdue && "border-destructive"
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-[2px]",
          isEventColor(displayColor)
            ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
            : "bg-muted-foreground/70"
        )}
      />
      <button
        type="button"
        title={task.title}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(task);
        }}
        aria-label={overdue ? `Open task ${task.title}, Overdue` : `Open task ${task.title}`}
        className={cn(
          "min-w-0 flex-1 truncate rounded-sm text-left outline-none focus-visible:ring-1 focus-visible:ring-ring/60",
          task.completed && "line-through"
        )}
      >
        {task.title}
      </button>
    </div>
  );
}
