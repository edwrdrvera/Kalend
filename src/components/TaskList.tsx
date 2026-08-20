"use client";

import { useState, type FormEvent } from "react";
import { format, isPast } from "date-fns";
import { Check, ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES, isEventColor, resolveDisplayColor } from "@/lib/event-colors";
import CategorySelect from "./CategorySelect";
import type { CalendarCategory, CalendarTask } from "./Calendar";

interface TaskListProps {
  tasks: CalendarTask[];
  loading: boolean;
  categories: CalendarCategory[];
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  onToggleComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
}

function TaskRow({
  task,
  categories,
  onToggleComplete,
  onDeleteTask,
}: {
  task: CalendarTask;
  categories: CalendarCategory[];
  onToggleComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
}) {
  const overdue = task.due_at && !task.completed && isPast(new Date(task.due_at));
  const displayColor = resolveDisplayColor(task.color, task.category_id, categories);

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        aria-pressed={task.completed}
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.completed
            ? "border-muted-foreground bg-muted-foreground text-foreground"
            : "border-muted-foreground/70 text-transparent hover:border-muted-foreground"
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>

      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          isEventColor(displayColor) ? EVENT_COLOR_SWATCH_CLASSES[displayColor] : "bg-muted-foreground/70"
        )}
      />

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          task.completed ? "text-muted-foreground line-through" : "text-foreground"
        )}
      >
        {task.title}
      </span>

      {task.due_at && (
        <span
          className={cn(
            "shrink-0 text-xs",
            overdue ? "text-red-400" : "text-muted-foreground"
          )}
        >
          {format(new Date(task.due_at), "MMM d")}
        </span>
      )}

      <button
        type="button"
        onClick={() => onDeleteTask(task)}
        aria-label="Delete task"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/** Idle: a plain "Add a task" row, styled to invite a click but taking no
 *  more space than a single line. Clicking it swaps in the real form
 *  (title input + a "+ due date" toggle for a plain date input, since a
 *  task due "some day" usually doesn't come with a specific time attached).
 *  A given date defaults to end-of-day. Submitting (or Escape, or the
 *  cancel button) collapses back to the idle row, rather than leaving the
 *  form open, so the panel returns to its resting size between adds. */
function CreateTaskForm({
  categories,
  onCreateTask,
}: {
  categories: CalendarCategory[];
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setTitle("");
    setShowDueDate(false);
    setDueDate("");
    setCategoryId(null);
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // Explicit UTC so the stored date doesn't shift when the browser's
      // local timezone offset is applied during toISOString() conversion.
      const dueAt = dueDate ? new Date(`${dueDate}T23:59:00Z`).toISOString() : undefined;
      await onCreateTask(title.trim(), dueAt, categoryId);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-1 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Add a task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          placeholder="Task title"
          aria-label="New task title"
          autoFocus
          className="input input-xs flex-1 text-xs"
        />
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          aria-label="Add task"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Cancel"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {showDueDate ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input input-xs flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              setShowDueDate(false);
              setDueDate("");
            }}
            aria-label="Remove due date"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDueDate(true)}
          className="self-start text-xs text-muted-foreground hover:text-foreground"
        >
          + due date
        </button>
      )}

      <CategorySelect
        categories={categories}
        categoryId={categoryId}
        onChange={setCategoryId}
        className="-ml-2 self-start"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

const COLLAPSED_STORAGE_KEY = "kalend:tasks-panel-collapsed";

export default function TaskList({
  tasks,
  loading,
  categories,
  onCreateTask,
  onToggleComplete,
  onDeleteTask,
}: TaskListProps) {
  // Collapsed by default so the panel doesn't cost permanent sidebar space
  // for someone who isn't using tasks. Only reachable client-side (this
  // component never renders during SSR, see Calendar's `mounted` gate), so
  // reading localStorage directly in the initializer is safe, no hydration
  // mismatch to worry about.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_STORAGE_KEY) !== "false"
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  const dated = tasks
    .filter((t) => t.due_at)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  const undated = tasks.filter((t) => !t.due_at);

  return (
    <div className="flex flex-col border-t border-border px-5 py-4">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="flex items-center justify-between text-xs font-semibold text-foreground transition-colors hover:text-foreground"
      >
        <span>Tasks</span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            collapsed && "-rotate-90"
          )}
        />
      </button>

      <div
        inert={collapsed}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          collapsed ? "grid-rows-[0fr] opacity-0" : "mt-3 grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3">
            <CreateTaskForm categories={categories} onCreateTask={onCreateTask} />

            {loading ? (
              <p className="text-xs text-muted-foreground">Loading tasks…</p>
            ) : tasks.length === 0 ? null : (
              <div className="flex flex-col gap-3">
                {dated.length > 0 && (
                  <div className="flex flex-col">
                    {dated.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        categories={categories}
                        onToggleComplete={onToggleComplete}
                        onDeleteTask={onDeleteTask}
                      />
                    ))}
                  </div>
                )}
                {undated.length > 0 && (
                  <div className="flex flex-col">
                    {dated.length > 0 && (
                      <span className="px-1 pb-1 text-xs text-muted-foreground/60">No date</span>
                    )}
                    {undated.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        categories={categories}
                        onToggleComplete={onToggleComplete}
                        onDeleteTask={onDeleteTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
