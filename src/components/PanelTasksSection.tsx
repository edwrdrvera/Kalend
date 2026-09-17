"use client";

import { Check, Plus } from "lucide-react";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarTask } from "@/lib/calendar-types";

interface PanelTasksSectionProps {
  tasks: CalendarTask[];
  onToggleComplete: (task: CalendarTask) => void;
  onAdd: () => void;
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

// Spec ambiguity: "returns null if tasks.length === 0" would leave the
// "+ Add" affordance with nowhere to live once the section disappears. The
// label row (with "+ Add") always renders; only the task rows are
// conditional on `tasks.length`, so the parent always has a way to add the
// branch's first task.
export default function PanelTasksSection({
  tasks,
  onToggleComplete,
  onAdd,
}: PanelTasksSectionProps) {
  return (
    <section aria-label="Open tasks" className="px-4 py-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open tasks
          </h3>
          {/* Distinguishes this Space-wide backlog from the agenda's per-day
              task list: this shows everything still open, regardless of date. */}
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            Everything open in this Space
          </p>
        </div>
        <button
          type="button"
          aria-label="Add task"
          onClick={onAdd}
          className="grid size-5 shrink-0 place-items-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {tasks.length > 0 ? (
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
                  aria-label={task.completed ? "Mark as not done" : "Mark as done"}
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
                  <span
                    className={cn(
                      "block truncate text-[13px]",
                      task.completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {task.title}
                  </span>
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
      ) : null}
    </section>
  );
}
