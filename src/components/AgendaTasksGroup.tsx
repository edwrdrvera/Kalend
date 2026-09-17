"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Check, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";
import { bucketTasks, type TaskBucketKey } from "@/lib/task-buckets";

// Reuse the inline task composer from the existing sidebar panel.
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import CategorySelect from "./CategorySelect";

interface AgendaTasksGroupProps {
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  selectedDate: Date;
  selectedSpaceId: string | null;
  onCreateTask: (
    title: string,
    dueAt?: string,
    categoryId?: string | null
  ) => Promise<void>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
  /** Whether a Schedule section renders above this one. When false (no events
   *  that day), the Tasks list is the only section, so it drops its top divider
   *  to avoid an empty band under the date header. */
  precededBySchedule?: boolean;
}

// ── Collapse persistence ─────────────────────────────────────────────────

const COLLAPSE_KEY = "kalend:taskBuckets:collapsed";

function readCollapsed(): Set<TaskBucketKey> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as TaskBucketKey[]);
  } catch {
    return new Set();
  }
}

function writeCollapsed(set: Set<TaskBucketKey>) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore (private mode / disabled storage); collapse state is a convenience.
  }
}

// ── Task draft ───────────────────────────────────────────────────────────

interface TaskDraft {
  title: string;
  showDueDate: boolean;
  dueDate: string;
  categoryId: string | null;
}

function newDraft(selectedSpaceId: string | null, initialDue: string | null): TaskDraft {
  return {
    title: "",
    showDueDate: !!initialDue,
    dueDate: initialDue ?? "",
    categoryId: selectedSpaceId,
  };
}

// ── Inline task composer ─────────────────────────────────────────────────

function InlineTaskComposer({
  categories,
  selectedSpaceId,
  initialDue,
  onCreateTask,
  onClose,
}: {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  initialDue: string | null;
  onCreateTask: (
    title: string,
    dueAt?: string,
    categoryId?: string | null
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>(() =>
    newDraft(selectedSpaceId, initialDue)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus without scrolling: the default autoFocus / focus() scrolls the
  // composer into view, which yanks the agenda's task list upward when the
  // column overflows. preventScroll keeps the list where it is.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const dueAt = draft.dueDate
        ? new Date(`${draft.dueDate}T23:59:00Z`).toISOString()
        : undefined;
      await onCreateTask(draft.title.trim(), dueAt, draft.categoryId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-1 pt-2 pb-1">
      <input
        ref={inputRef}
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Task title"
        aria-label="New task title"
        className={cn(APP_INPUT_CLS, "h-7 w-full text-[13px]")}
      />

      <div className="flex items-center justify-between gap-2">
        {draft.showDueDate ? (
          <div className="flex items-center gap-1.5">
            <DateField
              label="Due date"
              value={draft.dueDate}
              onChange={(dueDate) => setDraft({ ...draft, dueDate })}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDraft({ ...draft, showDueDate: true })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + due date
          </button>
        )}
        <CategorySelect
          categories={categories}
          categoryId={draft.categoryId}
          onChange={(categoryId) => setDraft({ ...draft, categoryId })}
        />
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!draft.title.trim() || submitting}
          aria-label="Add task"
          className="flex h-7 items-center justify-center rounded-sm bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-40"
        >
          Add task
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

// ── Task row ─────────────────────────────────────────────────────────────

function TaskRow({
  task,
  categories,
  onToggleTaskComplete,
}: {
  task: CalendarTask;
  categories: CalendarCategory[];
  onToggleTaskComplete: (task: CalendarTask) => void;
}) {
  const displayColor = resolveDisplayColor(
    task.color,
    task.category_id,
    task.color_overridden,
    categories
  );
  const dotClass = isEventColor(displayColor)
    ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
    : "bg-muted-foreground/40";

  return (
    <div className="flex items-start gap-2 rounded-sm px-1 py-1">
      <button
        type="button"
        onClick={() => onToggleTaskComplete(task)}
        aria-pressed={task.completed}
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        className={cn(
          "mt-px flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          task.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-transparent hover:border-muted-foreground"
        )}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </button>
      <span
        aria-hidden
        className={cn("mt-[6px] size-1.5 shrink-0 rounded-full", dotClass)}
      />
      <span
        className={cn(
          "min-w-0 flex-1 text-[12.5px] leading-[1.35]",
          task.completed ? "line-through opacity-50" : "text-foreground"
        )}
      >
        {task.title}
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

export default function AgendaTasksGroup({
  tasks,
  categories,
  selectedSpaceId,
  onCreateTask,
  onToggleTaskComplete,
  precededBySchedule = false,
}: AgendaTasksGroupProps) {
  const [collapsed, setCollapsed] = useState<Set<TaskBucketKey>>(() => new Set());
  const [composerBucket, setComposerBucket] = useState<TaskBucketKey | null>(null);

  // Read persisted collapse state after mount (localStorage is client-only).
  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggleCollapse = (key: TaskBucketKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeCollapsed(next);
      return next;
    });
  };

  // Bucket relative to the real current day (tasks are a persistent list, not
  // scoped to the calendar's selected day).
  const buckets = bucketTasks(tasks, new Date());

  return (
    <section
      aria-label="Tasks"
      className={cn(precededBySchedule && "border-t border-border pt-3")}
    >
      <h3 className="px-1 pb-1 text-[12.5px] font-semibold text-foreground">
        Tasks
      </h3>

      <div className="flex flex-col">
        {buckets.map((bucket) => {
          // Empty buckets are hidden to keep the list short; Today always shows.
          if (bucket.tasks.length === 0 && bucket.key !== "today") return null;

          const isCollapsed = collapsed.has(bucket.key);
          const composerHere = composerBucket === bucket.key;

          return (
            <div
              key={bucket.key}
              className="mt-3 border-t border-border/60 pt-3 first:mt-0 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center gap-1.5 px-1">
                <button
                  type="button"
                  onClick={() => toggleCollapse(bucket.key)}
                  aria-expanded={!isCollapsed}
                  className="flex min-w-0 items-center gap-1.5 rounded-sm py-0.5 text-left transition-colors hover:text-foreground"
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "text-[12.5px] font-semibold",
                      bucket.danger ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {bucket.label}
                  </span>
                  {bucket.tasks.length > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-px text-[10.5px] font-medium text-muted-foreground">
                      {bucket.tasks.length}
                    </span>
                  )}
                </button>
                {bucket.canAdd && (
                  <button
                    type="button"
                    onClick={() => {
                      setComposerBucket(bucket.key);
                      setCollapsed((prev) => {
                        if (!prev.has(bucket.key)) return prev;
                        const next = new Set(prev);
                        next.delete(bucket.key);
                        writeCollapsed(next);
                        return next;
                      });
                    }}
                    aria-label={`Add a task to ${bucket.label}`}
                    className="ml-auto grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                  </button>
                )}
              </div>

              {composerHere && (
                <InlineTaskComposer
                  categories={categories}
                  selectedSpaceId={selectedSpaceId}
                  initialDue={bucket.defaultDue}
                  onCreateTask={onCreateTask}
                  onClose={() => setComposerBucket(null)}
                />
              )}

              {!isCollapsed && (
                <div className="mt-0.5 flex flex-col">
                  {bucket.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      categories={categories}
                      onToggleTaskComplete={onToggleTaskComplete}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
