"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";

interface TaskRowProps {
  task: CalendarTask;
  categories: CalendarCategory[];
  onToggleTaskComplete: (task: CalendarTask) => void;
}

export default function TaskRow({ task, categories, onToggleTaskComplete }: TaskRowProps) {
  const displayColor = resolveDisplayColor(
    task.color,
    task.category_id,
    task.color_overridden,
    categories
  );
  const dotClass = isEventColor(displayColor)
    ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
    : "bg-muted-foreground/40";

  // Each leading element (checkbox, dot) sits in an 18px line box that matches
  // the text's first-line height, so all three centers align and stay aligned
  // to the first line when the title wraps.
  return (
    <div className="flex items-start gap-2 rounded-sm px-1 py-1">
      <span className="flex h-[18px] shrink-0 items-center">
        <button
          type="button"
          onClick={() => onToggleTaskComplete(task)}
          aria-pressed={task.completed}
          aria-label={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
          className={cn(
            "flex size-[15px] translate-y-[1px] items-center justify-center rounded-[4px] border-[1.5px] transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            task.completed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-transparent hover:border-muted-foreground"
          )}
        >
          <Check className="size-2.5" strokeWidth={3} />
        </button>
      </span>
      <span className="flex h-[18px] shrink-0 items-center">
        <span aria-hidden className={cn("size-1.5 translate-y-[1px] rounded-full", dotClass)} />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-[12.5px] leading-[18px]",
          task.completed ? "line-through opacity-50" : "text-foreground"
        )}
      >
        {task.title}
      </span>
    </div>
  );
}
