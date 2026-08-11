"use client";

import { useState, type FormEvent } from "react";
import { format, isPast } from "date-fns";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CalendarTask } from "./Calendar";

interface TaskListProps {
  tasks: CalendarTask[];
  loading: boolean;
  onCreateTask: (title: string, dueAt?: string) => Promise<void>;
  onToggleComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
}

function TaskRow({
  task,
  onToggleComplete,
  onDeleteTask,
}: {
  task: CalendarTask;
  onToggleComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
}) {
  const overdue = task.due_at && !task.completed && isPast(new Date(task.due_at));

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-neutral-800/60">
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        aria-pressed={task.completed}
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.completed
            ? "border-neutral-500 bg-neutral-500 text-neutral-900"
            : "border-neutral-600 text-transparent hover:border-neutral-400"
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          task.completed ? "text-neutral-500 line-through" : "text-neutral-200"
        )}
      >
        {task.title}
      </span>

      {task.due_at && (
        <span
          className={cn(
            "shrink-0 text-xs",
            overdue ? "text-red-400" : "text-neutral-500"
          )}
        >
          {format(new Date(task.due_at), "MMM d")}
        </span>
      )}

      <button
        type="button"
        onClick={() => onDeleteTask(task)}
        aria-label="Delete task"
        className="shrink-0 text-neutral-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/** Quick-add: title is the only required field, an "+ due date" toggle
 *  reveals a plain date input rather than forcing a due date up front (a
 *  task with no due date just sits undated, in the "No date" section
 *  below). A given date defaults to end-of-day, since a task due "some day"
 *  usually doesn't come with a specific time attached. */
function CreateTaskForm({ onCreateTask }: { onCreateTask: (title: string, dueAt?: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const dueAt = dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : undefined;
      await onCreateTask(title.trim(), dueAt);
      setTitle("");
      setShowDueDate(false);
      setDueDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          aria-label="New task title"
          className="h-8 flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          aria-label="Add task"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {showDueDate ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-7 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              setShowDueDate(false);
              setDueDate("");
            }}
            aria-label="Remove due date"
            className="text-neutral-500 hover:text-neutral-300"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDueDate(true)}
          className="self-start text-xs text-neutral-500 hover:text-neutral-300"
        >
          + due date
        </button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

const COLLAPSED_STORAGE_KEY = "kalend:tasks-panel-collapsed";

export default function TaskList({
  tasks,
  loading,
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
    <div className="flex flex-col border-t border-neutral-800 px-5 py-4">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="flex items-center justify-between text-sm font-semibold text-neutral-200 transition-colors hover:text-neutral-100"
      >
        <span>Tasks</span>
        <ChevronDown
          className={cn(
            "size-4 text-neutral-500 transition-transform duration-200",
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
            <CreateTaskForm onCreateTask={onCreateTask} />

            {loading ? (
              <p className="text-xs text-neutral-500">Loading tasks…</p>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-neutral-500">No tasks yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {dated.length > 0 && (
                  <div className="flex flex-col">
                    {dated.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggleComplete={onToggleComplete}
                        onDeleteTask={onDeleteTask}
                      />
                    ))}
                  </div>
                )}
                {undated.length > 0 && (
                  <div className="flex flex-col">
                    {dated.length > 0 && (
                      <span className="px-1 pb-1 text-xs text-neutral-600">No date</span>
                    )}
                    {undated.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
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
