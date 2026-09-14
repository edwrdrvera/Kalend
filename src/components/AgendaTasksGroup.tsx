"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { addDays, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";

// Reuse the inline task composer from the existing sidebar panel.
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import CategorySelect from "./CategorySelect";
import type { FormEvent } from "react";

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
}

// ── Task draft ───────────────────────────────────────────────────────────

interface TaskDraft {
  title: string;
  showDueDate: boolean;
  dueDate: string;
  categoryId: string | null;
}

function newDraft(selectedSpaceId: string | null): TaskDraft {
  return {
    title: "",
    showDueDate: false,
    dueDate: "",
    categoryId: selectedSpaceId,
  };
}

// ── Inline task composer ─────────────────────────────────────────────────

function InlineTaskComposer({
  categories,
  selectedSpaceId,
  onCreateTask,
  onClose,
}: {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onCreateTask: (
    title: string,
    dueAt?: string,
    categoryId?: string | null
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>(() => newDraft(selectedSpaceId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setDraft(newDraft(selectedSpaceId));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2">
      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Task title"
        aria-label="New task title"
        autoFocus
        className={cn(APP_INPUT_CLS, "w-full")}
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

// ── Component ────────────────────────────────────────────────────────────

export default function AgendaTasksGroup({
  tasks,
  categories,
  selectedDate,
  selectedSpaceId,
  onCreateTask,
  onToggleTaskComplete,
}: AgendaTasksGroupProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  // Count tasks due in the next 7 days that aren't shown today.
  const todayStart = startOfDay(selectedDate);
  const weekEnd = addDays(todayStart, 8);
  const upcomingCount = tasks.filter((t) => {
    if (!t.due_at || t.completed) return false;
    const due = new Date(t.due_at);
    return isAfter(due, todayStart) && !isSameDay(due, todayStart) && isBefore(due, weekEnd);
  }).length;

  // Only show tasks that belong to the selected date.
  const todayTasks = tasks.filter((t) => {
    if (!t.due_at) return true;
    return isSameDay(new Date(t.due_at), todayStart);
  });

  return (
    <section
      aria-label="Tasks"
      className="border-t border-border pt-[14px]"
    >
      <div className="flex items-center justify-between px-3 pb-2">
        <h3 className="text-[11px] font-medium text-muted-foreground">
          Tasks
        </h3>
        <button
          type="button"
          onClick={() => setComposerOpen(!composerOpen)}
          className="text-[12px] font-medium text-primary"
          aria-label={composerOpen ? "Close task composer" : "Add a task"}
        >
          {composerOpen ? "Cancel" : "+ Add"}
        </button>
      </div>

      <div className="flex flex-col">
        {todayTasks.map((task) => {
          const category = task.category_id
            ? categories.find((c) => c.id === task.category_id) ?? null
            : null;

          return (
            <div
              key={task.id}
              className="flex items-start gap-2 rounded-lg py-2"
            >
              <button
                type="button"
                onClick={() => onToggleTaskComplete(task)}
                aria-pressed={task.completed}
                aria-label={
                  task.completed ? "Mark as not done" : "Mark as done"
                }
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
                    task.completed
                      ? "line-through opacity-50"
                      : "text-foreground"
                  )}
                >
                  {task.title}
                </span>
                {category && (
                  <span className="block text-[12px] text-muted-foreground">
                    {category.name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {composerOpen && (
        <InlineTaskComposer
          categories={categories}
          selectedSpaceId={selectedSpaceId}
          onCreateTask={onCreateTask}
          onClose={() => setComposerOpen(false)}
        />
      )}

      {upcomingCount > 0 && (
        <p className="px-3 pt-3 pb-1 text-[12px] text-muted-foreground">
          Next 7 days{" · "}
          <span className="text-primary">{upcomingCount} more</span>
        </p>
      )}
    </section>
  );
}
