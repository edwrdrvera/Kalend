"use client";

import { useState, type ReactNode } from "react";
import { Bell, Check, Plus } from "lucide-react";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarTask } from "@/lib/calendar-types";

/** Rows shown before "Show more", so a long backlog doesn't flood the panel. */
const COLLAPSED_ROWS = 5;

/** Placeholder alert choices for the row editor; not saved anywhere yet. */
const ALERT_CHOICES = ["None", "10 minutes before", "1 hour before", "1 day before"];

interface PanelTasksSectionProps {
  tasks: CalendarTask[];
  /** What the list is scoped to, for the caption. */
  scope: "Space" | "Group";
  onToggleComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  /** Moves the due date (null clears it). */
  onChangeDue: (task: CalendarTask, due: Date | null) => void;
  onDelete: (task: CalendarTask) => void;
  /** Shows the new-task composer rendered as `children`. */
  onAddTask: () => void;
  /** The new-task composer, shown under the header while open. */
  children?: ReactNode;
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

const PILL_CLS =
  "h-[26px] rounded-full border px-2.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PanelTasksSection({
  tasks,
  scope,
  onToggleComplete,
  onOpenTask,
  onChangeDue,
  onDelete,
  onAddTask,
  children,
}: PanelTasksSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [alertIdx, setAlertIdx] = useState<Record<string, number>>({});
  const now = new Date();
  const shown = showAll ? tasks : tasks.slice(0, COLLAPSED_ROWS);
  const hidden = tasks.length - shown.length;

  const dueChoices: { label: string; day: Date | null }[] = [
    { label: "Today", day: startOfDay(now) },
    { label: "Tomorrow", day: addDays(startOfDay(now), 1) },
    { label: "Next week", day: addDays(startOfDay(now), 7) },
    { label: "None", day: null },
  ];

  return (
    <section aria-label="Open tasks" className="px-4 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-muted-foreground">
          Open tasks
          <span className="ml-1.5 font-normal">{tasks.length}</span>
        </h3>
        <button
          type="button"
          aria-label="Add task"
          onClick={onAddTask}
          className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus aria-hidden className="size-3.5" />
        </button>
      </div>
      {children}
      {/* Distinguishes this Space-wide or Group-wide backlog from the agenda's per-day
          task list: this shows everything still open, regardless of date. */}
      <p className="mt-0.5 text-[11px] text-muted-foreground/70">Everything open in this {scope}</p>
      {tasks.length === 0 && <p className="mt-2 text-[13px] text-muted-foreground">All caught up.</p>}

      <div className="mt-1 flex flex-col">
        {shown.map((task) => {
          const { text, warning } = dueState(task, now);
          const expanded = expandedId === task.id;
          const alertAt = alertIdx[task.id] ?? 0;
          return (
            <div key={task.id} className="-mx-4 border-b border-border/60 px-4 py-1.5 last:border-b-0">
              <div className="flex items-start gap-2.5">
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
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`Edit task ${task.title}`}
                  onClick={() => setExpandedId(expanded ? null : task.id)}
                  className="-my-0.5 min-w-0 flex-1 rounded-md px-1.5 py-0.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "block truncate text-[13px]",
                      task.completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                </button>
                {alertAt > 0 && <Bell aria-label="Alert on" className="mt-0.5 size-3 shrink-0 text-muted-foreground" />}
                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap text-[11.5px] tabular-nums",
                    warning && !task.completed ? "text-amber-600" : "text-muted-foreground"
                  )}
                >
                  {text}
                </span>
              </div>
              {expanded && (
                <div className="ml-6 mt-2 rounded-xl border border-border bg-muted/30 p-2.5 motion-safe:animate-[fadeIn_180ms_ease-out]">
                  <div className="flex flex-wrap gap-1.5">
                    {dueChoices.map(({ label, day }) => {
                      const on = day
                        ? !!task.due_at && isSameDay(new Date(task.due_at), day)
                        : task.due_at === null;
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => onChangeDue(task, day)}
                          className={cn(
                            PILL_CLS,
                            on
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAlertIdx((q) => ({ ...q, [task.id]: (alertAt + 1) % ALERT_CHOICES.length }))}
                      className="h-[26px] rounded-lg border border-border bg-card px-2.5 text-[12px] font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Alert: {ALERT_CHOICES[alertAt]}
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => onOpenTask(task)}
                      aria-label={`Open task ${task.title}`}
                      className="h-[26px] rounded-lg px-2.5 text-[12px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${task.title}"?`)) onDelete(task);
                      }}
                      className="h-[26px] rounded-lg px-2.5 text-[12px] font-semibold text-red-600 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hidden > 0 || showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 rounded-sm text-[12px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showAll ? "Show fewer" : `Show ${hidden} more`}
        </button>
      ) : null}
    </section>
  );
}
