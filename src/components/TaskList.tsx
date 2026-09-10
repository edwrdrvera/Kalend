"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Check, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import { EVENT_COLOR_SWATCH_CLASSES, isEventColor, resolveDisplayColor } from "@/lib/event-colors";
import CategorySelect from "./CategorySelect";
import { buildSidebarAgenda, taskDueLabel } from "@/lib/sidebar-agenda";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";

interface TaskListProps {
  tasks: CalendarTask[];
  events: CalendarEvent[];
  selectedDate: Date;
  loading: boolean;
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  onToggleComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
}

function EventRow({
  event,
  allDay,
  categories,
  onEventClick,
}: {
  event: CalendarEvent;
  allDay: boolean;
  categories: CalendarCategory[];
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
}) {
  const displayColor = resolveDisplayColor(
    event.color,
    event.category_id,
    event.color_overridden,
    categories
  );

  return (
    <button
      type="button"
      onClick={(e) => onEventClick(event, e.currentTarget.getBoundingClientRect())}
      className="flex min-h-10 w-full items-center gap-2 border-b border-border/70 px-1 py-2 text-left transition-colors last:border-b-0 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      aria-label={`Edit event: ${event.title}`}
    >
      <span
        aria-hidden
        className={cn(
          "size-3.5 shrink-0 rounded-[4px]",
          isEventColor(displayColor)
            ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
            : "bg-muted-foreground/70"
        )}
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
        {event.title}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {allDay ? "All day" : format(new Date(event.start_at), "h:mm a")}
      </span>
    </button>
  );
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
  const dueLabel = taskDueLabel(task);
  const urgent = !task.completed && (dueLabel === "Overdue" || dueLabel === "Due today");

  return (
    <div className="group flex min-h-10 items-center gap-2 border-b border-border/70 px-1 py-2 last:border-b-0 hover:bg-muted/45">
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        aria-pressed={task.completed}
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          task.completed
            ? "border-muted-foreground bg-muted-foreground text-foreground"
            : "border-muted-foreground/70 text-transparent hover:border-muted-foreground"
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          task.completed ? "text-muted-foreground line-through" : "text-foreground"
        )}
      >
        {task.title}
      </span>

      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 text-[11px]",
          urgent
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
          task.completed && "opacity-60"
        )}
      >
        {dueLabel}
      </span>

      <button
        type="button"
        onClick={() => onDeleteTask(task)}
        aria-label="Delete task"
        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}


/** Compact task composer opened from the Agenda header. A due date defaults
 *  to end-of-day; closing or submitting removes the composer entirely. */
function CreateTaskForm({
  onClose,
  categories,
  selectedSpaceId,
  onCreateTask,
}: {
  onClose: () => void;
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(selectedSpaceId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 border-y border-border py-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        placeholder="Task title"
        aria-label="New task title"
        autoFocus
        className={cn(APP_INPUT_CLS, "w-full")}
      />

      {showDueDate ? (
        <div className="flex items-center gap-1.5">
          <DateField
            label="Due date"
            value={dueDate}
            onChange={setDueDate}
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

      <div className="flex items-center justify-between gap-2">
        <CategorySelect
          categories={categories}
          categoryId={categoryId}
          onChange={setCategoryId}
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={close}
            className="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            aria-label="Add task"
            className="flex h-7 items-center justify-center rounded-sm bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-40"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Add task"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

const COLLAPSED_STORAGE_KEY = "kalend:tasks-panel-collapsed";

export default function TaskList({
  tasks,
  events,
  selectedDate,
  loading,
  categories,
  selectedSpaceId,
  onCreateTask,
  onToggleComplete,
  onDeleteTask,
  onEventClick,
}: TaskListProps) {
  // Collapsed by default so the panel doesn't cost permanent sidebar space
  // for someone who isn't using tasks. Only reachable client-side (this
  // component never renders during SSR, see Calendar's `mounted` gate), so
  // reading localStorage directly in the initializer is safe, no hydration
  // mismatch to worry about.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_STORAGE_KEY) !== "false"
  );
  const [creating, setCreating] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  const openTaskForm = () => {
    setCreating(true);
    setCollapsed(false);
    localStorage.setItem(COLLAPSED_STORAGE_KEY, "false");
  };

  const sections = buildSidebarAgenda(events, tasks, selectedDate);

  return (
    <div className="flex flex-col border-t border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-semibold text-foreground transition-colors hover:text-foreground"
        >
          <span>Agenda</span>
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              !collapsed && "rotate-90"
            )}
          />
        </button>
        <button
          type="button"
          onClick={creating ? () => setCreating(false) : openTaskForm}
          aria-label={creating ? "Cancel creating task" : "Create a task"}
          aria-expanded={creating}
          className="grid size-7 place-items-center rounded-md text-foreground hover:bg-muted"
        >
          {creating ? <X className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>

      <div
        inert={collapsed}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          collapsed ? "grid-rows-[0fr] opacity-0" : "mt-2.5 grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2.5">
            {creating && (
              <CreateTaskForm
                onClose={() => setCreating(false)}
                categories={categories}
                selectedSpaceId={selectedSpaceId}
                onCreateTask={onCreateTask}
              />
            )}

            {loading ? (
              <p className="text-xs text-muted-foreground">Loading agenda…</p>
            ) : (
              <div>
                {sections.map((section) => (
                  <section key={section.key} aria-labelledby={`agenda-${section.key}`}>
                    <h3
                      id={`agenda-${section.key}`}
                      className="border-b border-border px-1 pb-2 text-xs font-medium text-muted-foreground"
                    >
                      {section.heading}
                    </h3>
                    {section.items.length === 0 ? (
                      <p className="px-1 py-2.5 text-xs text-muted-foreground">Nothing scheduled</p>
                    ) : (
                      <div>
                        {section.items.map((item) =>
                        item.kind === "event" ? (
                          <EventRow
                            key={`event-${item.event.id}`}
                            event={item.event}
                            allDay={item.allDay}
                            categories={categories}
                            onEventClick={onEventClick}
                          />
                        ) : (
                          <TaskRow
                            key={`task-${item.task.id}`}
                            task={item.task}
                            onToggleComplete={onToggleComplete}
                            onDeleteTask={onDeleteTask}
                          />
                        )
                        )}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
