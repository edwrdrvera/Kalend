"use client";

import { useState, type FormEvent } from "react";
import { Calendar, Loader2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import { AgendaDetailList } from "./AgendaSummary";
import CategorySelect from "./CategorySelect";
import {
  buildSidebarAgenda,
  summarizeSidebarAgenda,
} from "@/lib/sidebar-agenda";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";

// ── Task draft helpers ────────────────────────────────────────────────────

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

// ── Inline task composer ──────────────────────────────────────────────────

function InlineTaskComposer({
  categories,
  selectedSpaceId,
  onCreateTask,
}: {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(() => newTaskDraft(selectedSpaceId));
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
      setDraft(newTaskDraft(selectedSpaceId));
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const discard = () => {
    setDraft(newTaskDraft(selectedSpaceId));
    setExpanded(false);
    setError(null);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Add a task"
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-3.5" />
        <span>Add a task</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-2 py-2">
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
            <button
              type="button"
              onClick={() => setDraft({ ...draft, showDueDate: false, dueDate: "" })}
              aria-label="Remove due date"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
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
          onClick={discard}
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

// ── Main panel ────────────────────────────────────────────────────────────

interface SidebarAgendaPanelProps {
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

export default function SidebarAgendaPanel({
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
}: SidebarAgendaPanelProps) {
  const sections = buildSidebarAgenda(events, tasks, selectedDate);
  const summary = summarizeSidebarAgenda(sections, tasks);
  const isEmpty = summary.activeItemCount === 0;

  return (
    <div
      data-testid="agenda-panel"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
    >
      <div className="px-3 pt-2 pb-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          {format(selectedDate, "EEEE, MMMM d")}
        </h2>
      </div>

      <div className="flex-1 px-2">
        {loading ? (
          <div className="flex items-center gap-2 px-1 py-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">Loading...</span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
            <Calendar className="size-6 text-muted-foreground/50" />
            <p className="text-[13px] text-muted-foreground">
              Nothing scheduled for {format(selectedDate, "MMMM d")}
            </p>
          </div>
        ) : (
          <AgendaDetailList
            sections={sections}
            categories={categories}
            onEventClick={onEventClick}
            onToggleComplete={onToggleTaskComplete}
            onDeleteTask={onDeleteTask}
          />
        )}
      </div>

      {/* Inline task composer */}
      <div className="mt-auto shrink-0 border-t border-border/50 px-1">
        <InlineTaskComposer
          categories={categories}
          selectedSpaceId={selectedSpaceId}
          onCreateTask={onCreateTask}
        />
      </div>
    </div>
  );
}
