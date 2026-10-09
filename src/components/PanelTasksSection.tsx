"use client";

import { useState, type ReactNode } from "react";
import { Bell, Plus } from "lucide-react";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarTask } from "@/lib/calendar-types";
import { bucketTasks } from "@/lib/task-buckets";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { CHIP_CLS, QUIET_LINK_CLS } from "./control-styles";
import TaskCheckbox from "./TaskCheckbox";

/** Rows shown before "Show more", so a long backlog doesn't flood the panel. */
const COLLAPSED_ROWS = 5;

/** Placeholder alert choices for the row editor; not saved anywhere yet. */
const ALERT_CHOICES = ["None", "10 minutes before", "1 hour before", "1 day before"];

interface PanelTasksSectionProps {
  tasks: CalendarTask[];
  onToggleComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  /** Moves the due date (null clears it). */
  onChangeDue: (task: CalendarTask, due: Date | null) => void;
  onDelete: (task: CalendarTask) => void;
  /** Shows the new-task composer rendered as `children`. */
  onAddTask: () => void;
  /** Splits the list under Overdue / Today / This week / Later / No date headings. */
  bucketed?: boolean;
  /** Completed tasks, kept behind a "Show completed" toggle. */
  completed?: CalendarTask[];
  /** Space and Group name shown under each title, when the list spans Spaces. */
  pathOf?: (task: CalendarTask) => string;
  /** The new-task composer, shown under the header while open. */
  children?: ReactNode;
}

interface DueState {
  text: string;
  /** Overdue or imminent (today/tomorrow), rendered in the warning color. */
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

/** The dashboard names the later buckets "Later" and "No date". */
const BUCKET_LABELS: Partial<Record<string, string>> = { month: "Later", unscheduled: "No date" };

const TEXT_BTN_CLS = "h-[26px] px-2.5 text-xs leading-normal font-semibold";

export default function PanelTasksSection({
  tasks,
  onToggleComplete,
  onOpenTask,
  onChangeDue,
  onDelete,
  onAddTask,
  bucketed = false,
  completed = [],
  pathOf,
  children,
}: PanelTasksSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [alertIdx, setAlertIdx] = useState<Record<string, number>>({});
  const now = new Date();
  const shown = showAll || bucketed ? tasks : tasks.slice(0, COLLAPSED_ROWS);
  const hidden = tasks.length - shown.length;
  // One unlabeled group, or the due-date buckets with their headings.
  const groups: { key: string; label: string | null; danger: boolean; tasks: CalendarTask[] }[] = bucketed
    ? bucketTasks(shown, now)
        .filter((b) => b.tasks.length > 0)
        .map((b) => ({ key: b.key, label: BUCKET_LABELS[b.key] ?? b.label, danger: b.danger, tasks: b.tasks }))
    : [{ key: "all", label: null, danger: false, tasks: shown }];

  const dueChoices: { label: string; day: Date | null }[] = [
    { label: "Today", day: startOfDay(now) },
    { label: "Tomorrow", day: addDays(startOfDay(now), 1) },
    { label: "Next week", day: addDays(startOfDay(now), 7) },
    { label: "None", day: null },
  ];

  const renderRow = (task: CalendarTask) => {
    const { text, warning } = dueState(task, now);
    const expanded = expandedId === task.id;
    const alertAt = alertIdx[task.id] ?? 0;
    return (
      <div key={task.id} className="-mx-4 border-b border-border/60 px-4 py-1.5 last:border-b-0">
        <div className="flex items-start gap-2.5">
          <TaskCheckbox
            title={task.title}
            checked={task.completed}
            onToggle={() => onToggleComplete(task)}
            className="mt-0.5"
          />
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`Edit task ${task.title}`}
            onClick={() => setExpandedId(expanded ? null : task.id)}
            className="-my-0.5 min-w-0 flex-1 rounded-md px-1.5 py-0.5 text-left hover:bg-hover focus-ring"
          >
            <span
              className={cn(
                "block truncate text-body transition-colors duration-150",
                task.completed ? "text-muted-foreground line-through" : "text-foreground"
              )}
            >
              {task.title}
            </span>
            {pathOf?.(task) ? (
              <span className="block truncate text-xs leading-normal text-muted-foreground">{pathOf(task)}</span>
            ) : null}
          </button>
          {alertAt > 0 && <Bell role="img" aria-label="Alert on"className="mt-0.5 size-3 shrink-0 text-muted-foreground" />}
          <span
            className={cn(
              "shrink-0 whitespace-nowrap text-xs leading-normal tabular-nums",
              warning && !task.completed ? "text-warning" : "text-muted-foreground"
            )}
          >
            {text}
          </span>
        </div>
        {expanded && (
          <div className="ml-6 mt-2 rounded-xl border border-border bg-muted/30 p-2.5 animate-reveal-down">
            <div className="flex flex-wrap gap-1.5">
              {dueChoices.map(({ label, day }) => {
                const on = day
                  ? !!task.due_at && isSameDay(new Date(task.due_at), day)
                  : task.due_at === null;
                return (
                  <Toggle
                    key={label}
                    pressed={on}
                    onPressedChange={() => onChangeDue(task, day)}
                    className={cn(CHIP_CLS, "aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground aria-pressed:hover:text-background")}
                  >
                    {label}
                  </Toggle>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAlertIdx((q) => ({ ...q, [task.id]: (alertAt + 1) % ALERT_CHOICES.length }))}
                className={cn(CHIP_CLS, "bg-card text-foreground")}
              >
                Alert: {ALERT_CHOICES[alertAt]}
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenTask(task)}
                aria-label={`Open task ${task.title}`}
                className={cn(TEXT_BTN_CLS, "text-muted-foreground")}
              >
                Details
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete "${task.title}"?`)) onDelete(task);
                }}
                className={cn(TEXT_BTN_CLS, "text-destructive hover:text-destructive")}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section aria-label="Tasks" className="px-4 py-3">
      <div className="flex items-center justify-between">
        <h3 className="label-caps">
          Tasks
          <span className="font-normal"> · {tasks.length} open</span>
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Add task"
          onClick={onAddTask}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus aria-hidden className="size-3.5" />
        </Button>
      </div>
      {children}
      {tasks.length === 0 && <p className="mt-2 text-body text-muted-foreground">All caught up.</p>}

      <div className="mt-1 flex flex-col">
        {groups.map((group) => (
          <div key={group.key}>
            {group.label && (
              <h4 className={cn("mb-0.5 mt-3 text-xs leading-normal font-semibold", group.danger ? "text-destructive" : "text-foreground")}>
                {group.label}
                <span className="ml-1.5 font-normal text-muted-foreground">{group.tasks.length}</span>
              </h4>
            )}
            {group.tasks.map(renderRow)}
          </div>
        ))}
      </div>
      {hidden > 0 || showAll ? (
        <Button type="button" variant="link" onClick={() => setShowAll(!showAll)} className={cn(QUIET_LINK_CLS, "mt-2")}>
          {showAll ? "Show fewer" : `Show ${hidden} more`}
        </Button>
      ) : null}
      {completed.length > 0 && (
        <div className="mt-3">
          <Button type="button" variant="link" onClick={() => setShowCompleted(!showCompleted)} className={QUIET_LINK_CLS}>
            {showCompleted ? "Hide" : "Show"} completed ({completed.length})
          </Button>
          {showCompleted && (
            <div className="animate-reveal-down">
              {completed.map(renderRow)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
