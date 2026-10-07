"use client";

import { Check } from "lucide-react";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarTask } from "@/lib/calendar-types";

interface PanelTasksSectionProps {
  tasks: CalendarTask[];
  /** What the list is scoped to, for the caption. */
  scope: "Space" | "Group";
  onToggleComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
}

interface DueState {
  text: string;
  /** Overdue or imminent (today/tomorrow) — rendered in the warning color. */
  warning: boolean;
}

function dueState(task: CalendarTask, now: Date): DueState {
  if (!task.due_at) return { text: "No date", warning: false };

  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const due = startOfDay(new Date(task.due_at));

  if (isBefore(due, today)) return { text: "Overdue", warning: true };
  if (isSameDay(due, today)) return { text: "Due today", warning: true };
  if (isSameDay(due, tomorrow)) return { text: "Due tomorrow", warning: true };
  return { text: format(due, "MMM d"), warning: false };
}

export default function PanelTasksSection({
  tasks,
  scope,
  onToggleComplete,
  onOpenTask,
}: PanelTasksSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section aria-label="Open tasks" className="px-4 py-3">
      <h3 className="text-[12px] font-semibold text-muted-foreground">
        Open tasks
        <span className="ml-1.5 font-normal">{tasks.length}</span>
      </h3>
      {/* Distinguishes this Space-wide or Group-wide backlog from the agenda's per-day
          task list: this shows everything still open, regardless of date. */}
      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
        Everything open in this {scope}
      </p>

      <div className="mt-1 flex flex-col">
        {tasks.map((task) => {
          const { text, warning } = dueState(task, new Date());
          return (
            <div
              key={task.id}
              className="-mx-4 flex items-start gap-2 rounded-lg px-4 py-2 hover:bg-muted/50"
            >
              <button
                type="button"
                onClick={() => onToggleComplete(task)}
                aria-pressed={task.completed}
                aria-label={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
                className={cn(
                  "mt-0.5 flex size-[14px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  task.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent hover:border-muted-foreground"
                )}
              >
                <Check className="size-2.5" strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  aria-label={`Open task ${task.title}`}
                  className={cn(
                    "block w-full truncate rounded-sm text-left text-[13px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    task.completed ? "text-muted-foreground line-through" : "text-foreground"
                  )}
                >
                  {task.title}
                </button>
                <span
                  className={cn(
                    "block text-[11.5px]",
                    warning && !task.completed ? "text-amber-600" : "text-muted-foreground"
                  )}
                >
                  {text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
