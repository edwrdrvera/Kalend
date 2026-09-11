"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import { Popover, PopoverBackdrop, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";
import CategorySelect from "./CategorySelect";
import {
  buildSidebarAgenda,
  summarizeSidebarAgenda,
  taskDueLabel,
  type SidebarAgendaSection,
} from "@/lib/sidebar-agenda";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";

interface AgendaSummaryProps {
  events: CalendarEvent[];
  tasks: CalendarTask[];
  selectedDate: Date;
  loading: boolean;
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
}

// -- Task draft helpers -----------------------------------------------------

interface TaskDraft {
  title: string;
  showDueDate: boolean;
  dueDate: string;
  categoryId: string | null;
  initialCategoryId: string | null;
}

function newTaskDraft(selectedSpaceId: string | null): TaskDraft {
  return {
    title: "",
    showDueDate: false,
    dueDate: "",
    categoryId: selectedSpaceId,
    initialCategoryId: selectedSpaceId,
  };
}

function hasTaskDraftInput(draft: TaskDraft): boolean {
  return Boolean(
    draft.title.trim() ||
    draft.dueDate ||
    draft.categoryId !== draft.initialCategoryId
  );
}

// -- Task composer ----------------------------------------------------------

function CreateTaskForm({
  draft,
  onDraftChange,
  onDiscard,
  onSubmitted,
  categories,
  onCreateTask,
}: {
  draft: TaskDraft;
  onDraftChange: (draft: TaskDraft) => void;
  onDiscard: () => void;
  onSubmitted: () => void;
  categories: CalendarCategory[];
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // Explicit UTC so the stored date doesn't shift when the browser's
      // local timezone offset is applied during toISOString() conversion.
      const dueAt = draft.dueDate
        ? new Date(`${draft.dueDate}T23:59:00Z`).toISOString()
        : undefined;
      await onCreateTask(draft.title.trim(), dueAt, draft.categoryId);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 p-1">
      <input
        value={draft.title}
        onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
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
              onChange={(dueDate) => onDraftChange({ ...draft, dueDate })}
            />
            <button
              type="button"
              onClick={() => {
                onDraftChange({ ...draft, showDueDate: false, dueDate: "" });
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
            onClick={() => onDraftChange({ ...draft, showDueDate: true })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + due date
          </button>
        )}
        <CategorySelect
          categories={categories}
          categoryId={draft.categoryId}
          onChange={(categoryId) => onDraftChange({ ...draft, categoryId })}
        />
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onDiscard}
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
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Add task"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

// -- Agenda detail rows -----------------------------------------------------

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
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
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
  const { label: dueLabel, overdue, dueToday } = taskDueLabel(task);
  const urgent = !task.completed && (overdue || dueToday);

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
          "min-w-0 flex-1 truncate text-[13px]",
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

function AgendaDetailList({
  sections,
  categories,
  onEventClick,
  onToggleComplete,
  onDeleteTask,
}: {
  sections: SidebarAgendaSection[];
  categories: CalendarCategory[];
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  onToggleComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
}) {
  return (
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
  );
}

// -- Summary text -----------------------------------------------------------

function summaryText(eventCount: number, taskCount: number, overdueCount: number): string {
  const parts: string[] = [];

  if (eventCount > 0) {
    parts.push(`${eventCount} ${eventCount === 1 ? "event" : "events"}`);
  }

  if (overdueCount > 0) {
    parts.push(`${overdueCount} overdue ${overdueCount === 1 ? "task" : "tasks"}`);
  } else if (taskCount > 0) {
    parts.push(`${taskCount} ${taskCount === 1 ? "task" : "tasks"} due`);
  }

  return parts.join(", ");
}

// -- Component --------------------------------------------------------------

export default function AgendaSummary({
  events,
  tasks,
  selectedDate,
  loading,
  categories,
  selectedSpaceId,
  onCreateTask,
  onToggleTaskComplete,
  onDeleteTask,
  onEventClick,
}: AgendaSummaryProps) {
  const sections = buildSidebarAgenda(events, tasks, selectedDate);
  const summary = summarizeSidebarAgenda(sections, tasks);

  // Single pass over all items for the display counts.
  let eventCount = 0;
  let taskCount = 0;
  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind === "event") eventCount += 1;
      else if (!item.task.completed) taskCount += 1;
    }
  }

  const isEmpty = summary.activeItemCount === 0;
  const hasOverdue = summary.overdueTaskCount > 0;

  const [detailOpen, setDetailOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const openTaskForm = () => {
    setDraft((current) => current ?? newTaskDraft(selectedSpaceId));
    setCreating(true);
  };

  const closeTaskForm = () => {
    setCreating(false);
    setDraft((current) => (current && hasTaskDraftInput(current) ? current : null));
  };

  const discardTaskDraft = () => {
    setCreating(false);
    setDraft(null);
  };

  return (
    <div className="px-4 py-3">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5",
          hasOverdue
            ? "border border-destructive/25 bg-destructive/[0.06]"
            : isEmpty
              ? "opacity-50"
              : "bg-[#f0efed] dark:bg-[#1f1f1f]"
        )}
      >
        {loading ? (
          <div className="flex min-h-[28px] flex-1 items-center gap-2.5">
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            <Popover open={detailOpen} onOpenChange={setDetailOpen}>
              <PopoverTrigger
                disabled={isEmpty}
                aria-label={
                  isEmpty
                    ? "Nothing scheduled"
                    : hasOverdue
                      ? "Agenda summary with overdue tasks"
                      : "Agenda summary"
                }
                className={cn(
                  "flex min-h-[28px] min-w-0 flex-1 items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !isEmpty && "cursor-pointer"
                )}
              >
                {hasOverdue ? (
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                ) : (
                  <Calendar className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                  {isEmpty
                    ? "Nothing scheduled"
                    : summaryText(eventCount, taskCount, summary.overdueTaskCount)}
                </span>
                {!isEmpty && (
                  <ChevronRight
                    className={cn(
                      "ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-150",
                      detailOpen && "rotate-90"
                    )}
                  />
                )}
              </PopoverTrigger>
              <PopoverBackdrop />
              <PopoverContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-[min(340px,calc(100vw-2rem))] max-h-[min(400px,70vh)] overflow-y-auto p-2.5"
              >
                <AgendaDetailList
                  sections={sections}
                  categories={categories}
                  onEventClick={onEventClick}
                  onToggleComplete={onToggleTaskComplete}
                  onDeleteTask={onDeleteTask}
                />
              </PopoverContent>
            </Popover>

            <Popover
              open={creating}
              onOpenChange={(open, details) => {
                if (open) openTaskForm();
                else if (details.reason === "escape-key") discardTaskDraft();
                else closeTaskForm();
              }}
            >
              <PopoverTrigger
                aria-label={creating ? "Close task composer" : "Create a task"}
                aria-expanded={creating}
                className="relative grid size-7 shrink-0 place-items-center rounded-md text-foreground hover:bg-muted"
              >
                {creating ? <X className="size-4" /> : <Plus className="size-4" />}
                {!creating && draft && hasTaskDraftInput(draft) && (
                  <span
                    aria-label="Task draft saved"
                    className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-primary"
                  />
                )}
              </PopoverTrigger>
              <PopoverBackdrop />
              <PopoverContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-[min(340px,calc(100vw-2rem))] p-2.5"
              >
                {draft && (
                  <CreateTaskForm
                    draft={draft}
                    onDraftChange={setDraft}
                    onDiscard={discardTaskDraft}
                    onSubmitted={discardTaskDraft}
                    categories={categories}
                    onCreateTask={onCreateTask}
                  />
                )}
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
    </div>
  );
}
