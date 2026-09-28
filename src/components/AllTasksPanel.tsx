"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";
import { bucketTasks, type TaskBucketKey } from "@/lib/task-buckets";
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import CategorySelect from "./CategorySelect";
import PanelShell from "./PanelShell";
import TaskRow from "./TaskRow";

interface AllTasksPanelProps {
  /** Every task across all Spaces; the panel splits open from completed. */
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  /** Seeds a new task's Space. */
  selectedSpaceId: string | null;
  modal: boolean;
  onClose: () => void;
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  onToggleTaskComplete: (task: CalendarTask) => void;
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

// ── Inline task composer ─────────────────────────────────────────────────

interface TaskDraft {
  title: string;
  showDueDate: boolean;
  dueDate: string;
  categoryId: string | null;
}

function InlineTaskComposer({
  categories,
  selectedSpaceId,
  onCreateTask,
  onClose,
}: {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onCreateTask: AllTasksPanelProps["onCreateTask"];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    title: "",
    showDueDate: false,
    dueDate: "",
    categoryId: selectedSpaceId,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus without scrolling: the default autoFocus / focus() scrolls the
  // composer into view, which yanks the task list upward when it overflows.
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
            className="rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!draft.title.trim() || submitting}
          aria-label="Add task"
          className="flex h-7 items-center justify-center rounded-sm bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          Add task
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

// ── Collapsible group ────────────────────────────────────────────────────

function TaskGroup({
  label,
  count,
  danger = false,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  danger?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            "text-[11.5px] font-medium",
            danger ? "text-destructive" : "text-foreground/90"
          )}
        >
          {label}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground/60">
          {count}
        </span>
      </button>
      {expanded && <div className="mt-0.5 flex flex-col gap-1">{children}</div>}
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────

const ICON_BUTTON_CLS =
  "grid size-7 shrink-0 place-items-center rounded-[7px] border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function AllTasksPanel({
  tasks,
  categories,
  selectedSpaceId,
  modal,
  onClose,
  onCreateTask,
  onToggleTaskComplete,
}: AllTasksPanelProps) {
  // Calendar renders only after mount, so reading storage here never runs on the server.
  const [collapsed, setCollapsed] = useState<Set<TaskBucketKey>>(() => readCollapsed());
  const [composerOpen, setComposerOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const toggleCollapse = (key: TaskBucketKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeCollapsed(next);
      return next;
    });
  };

  const openTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const buckets = bucketTasks(openTasks, new Date());

  const row = (task: CalendarTask) => (
    <TaskRow
      key={task.id}
      task={task}
      categories={categories}
      onToggleTaskComplete={onToggleTaskComplete}
    />
  );

  return (
    <PanelShell label="All tasks" modal={modal} onClose={onClose}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-foreground">All tasks</h2>
          <p className="text-[11.5px] text-muted-foreground">
            {openTasks.length} open across all Spaces
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-label="Add a task"
            className={ICON_BUTTON_CLS}
          >
            <Plus className="size-4" />
          </button>
          <button type="button" aria-label="Close panel" onClick={onClose} className={ICON_BUTTON_CLS}>
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {composerOpen && (
          <InlineTaskComposer
            categories={categories}
            selectedSpaceId={selectedSpaceId}
            onCreateTask={onCreateTask}
            onClose={() => setComposerOpen(false)}
          />
        )}

        {openTasks.length === 0 && (
          <p className="px-1 py-2 text-[13px] text-muted-foreground">No open tasks.</p>
        )}

        <div className="flex flex-col">
          {buckets.map((bucket) =>
            bucket.tasks.length === 0 ? null : (
              <TaskGroup
                key={bucket.key}
                label={bucket.label}
                count={bucket.tasks.length}
                danger={bucket.danger}
                expanded={!collapsed.has(bucket.key)}
                onToggle={() => toggleCollapse(bucket.key)}
              >
                {bucket.tasks.map(row)}
              </TaskGroup>
            )
          )}

          {completedTasks.length > 0 && (
            <div className="mt-3 border-t border-border pt-2">
              <TaskGroup
                label="Completed"
                count={completedTasks.length}
                expanded={showCompleted}
                onToggle={() => setShowCompleted((v) => !v)}
              >
                {completedTasks.map(row)}
              </TaskGroup>
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
