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
  onClick?: (task: CalendarTask) => void;
  className?: string;
}

/** A due-date marker on the calendar grid, deliberately styled unlike an
 *  event pill (outlined, not filled) so it never reads as a scheduled
 *  block. Shared by MonthGrid's day cells and AllDayRow (week/day).
 *  Clicking it toggles complete, same as the sidebar task list, there's no
 *  separate task-edit view yet to open instead. */
export default function TaskChip({ task, categories, onClick, className }: TaskChipProps) {
  const overdue = !task.completed && task.due_at && isPast(new Date(task.due_at));
  const displayColor = resolveDisplayColor(
    task.color,
    task.category_id,
    task.color_overridden,
    categories
  );

  return (
    <button
      type="button"
      title={task.title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(task);
      }}
      aria-pressed={task.completed}
      aria-label={`${task.completed ? "Mark as not done" : "Mark as done"}: ${task.title}`}
      className={cn(
        "group flex min-h-7 w-full min-w-0 items-center gap-1.5 rounded-sm border border-transparent px-1.5 text-left text-[11px] font-medium text-foreground outline-none transition-colors hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        task.completed
          ? "text-muted-foreground"
          : overdue
            ? "text-destructive"
            : "text-foreground",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
          task.completed
            ? "border-muted-foreground bg-muted-foreground text-background"
            : overdue
              ? "border-destructive text-transparent group-hover:bg-destructive/10"
              : "border-muted-foreground/70 text-transparent group-hover:border-foreground"
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-[2px]",
          isEventColor(displayColor)
            ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
            : "bg-muted-foreground/70"
        )}
      />
      <span className={cn("truncate", task.completed && "line-through")}>{task.title}</span>
    </button>
  );
}
