"use client";

import { isPast } from "date-fns";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
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
  className,
}: TaskChipProps) {
  const overdue = !task.completed && task.due_at && isPast(new Date(task.due_at));
  const displayColor = resolveDisplayColor(
    task.color,
    task.category_id,
    task.color_overridden,
    categories
  );

  // Both buttons stop propagation: a click on the chip must not also reach
  // the day cell underneath, which would select that day.
  return (
    <div
      className={cn(
        "group flex min-h-7 w-full min-w-0 items-center gap-1.5 rounded-sm px-1.5 text-[11px] font-medium transition-colors hover:bg-muted/70",
        task.completed
          ? "text-muted-foreground"
          : overdue
            ? "text-destructive"
            : "text-foreground",
        className
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task);
        }}
        aria-pressed={task.completed}
        aria-label={`${task.completed ? "Mark as not done" : "Mark as done"}: ${task.title}`}
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          task.completed
            ? "border-muted-foreground bg-muted-foreground text-background"
            : overdue
              ? "border-destructive text-transparent hover:bg-destructive/10"
              : "border-muted-foreground/70 text-transparent hover:border-foreground"
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>
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
        aria-label={`Open task ${task.title}`}
        className={cn(
          "min-w-0 flex-1 truncate rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
          task.completed && "line-through"
        )}
      >
        {task.title}
      </button>
    </div>
  );
}
