"use client";

import { cn } from "@/lib/utils";
import AlertBell from "./AlertBell";
import TaskCheckbox from "./TaskCheckbox";
import SpaceDot from "./SpaceDot";
import { taskDueLabel } from "@/lib/sidebar-agenda";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";
import { resolveDisplayColor } from "@/lib/event-colors";

interface TaskRowProps {
  task: CalendarTask;
  categories: CalendarCategory[];
  onToggleTaskComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  /** Shows the alert bell. Only the day panel passes it. */
  hasAlert?: boolean;
  /** Space and Group name shown under the title, with the color dot. */
  meta?: string;
}

export default function TaskRow({
  task,
  categories,
  onToggleTaskComplete,
  onOpenTask,
  hasAlert = false,
  meta,
}: TaskRowProps) {
  const displayColor = resolveDisplayColor(
    task.color,
    task.category_id,
    task.color_overridden,
    categories
  );
  const { overdue } = taskDueLabel(task);

  // Each leading element (checkbox, dot) sits in an 18px line box that matches
  // the text's first-line height, so all three centers align and stay aligned
  // to the first line when the title wraps.
  return (
    <div className="flex items-start gap-2 rounded-sm px-1 py-1">
      <span className="flex h-[18px] shrink-0 items-center">
        <TaskCheckbox
          title={task.title}
          checked={task.completed}
          onToggle={() => onToggleTaskComplete(task)}
          overdue={overdue}
          className="translate-y-[1px]"
        />
      </span>
      {meta === undefined && (
        <span className="flex h-[18px] shrink-0 items-center">
          <SpaceDot color={displayColor} overdue={overdue} className="translate-y-[1px]" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpenTask(task)}
          aria-label={overdue ? `Open task ${task.title}, Overdue` : `Open task ${task.title}`}
          className={cn(
            "block w-full rounded-sm text-left text-[12.5px] leading-[18px] hover:underline focus-ring",
            task.completed ? "line-through opacity-50" : "text-foreground"
          )}
        >
          {task.title}
        </button>
        {meta !== undefined && (
          <span className="block truncate text-[11.5px] leading-[18px] text-muted-foreground">
            <SpaceDot color={displayColor} overdue={overdue} className="mr-1.5 inline-block align-middle" />
            {meta}
          </span>
        )}
      </div>
      {hasAlert && (
        <span className="flex h-[18px] shrink-0 items-center">
          <AlertBell />
        </span>
      )}
    </div>
  );
}
