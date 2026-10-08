"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarGroup } from "@/lib/calendar-types";
import { dueAtFromDate } from "@/lib/task-draft";
import { spaceMembership, type Membership } from "@/lib/membership";
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import MembershipSelect from "./MembershipSelect";

interface TaskDraft {
  title: string;
  showDueDate: boolean;
  dueDate: string;
  membership: Membership;
}

export default function InlineTaskComposer({
  categories,
  groups,
  selectedSpaceId,
  onCreateTask,
  onClose,
}: {
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  selectedSpaceId: string | null;
  onCreateTask: (title: string, dueAt?: string, membership?: Membership) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    title: "",
    showDueDate: false,
    dueDate: "",
    membership: spaceMembership(selectedSpaceId),
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
      const dueAt = draft.dueDate ? dueAtFromDate(draft.dueDate) : undefined;
      await onCreateTask(draft.title.trim(), dueAt, draft.membership);
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
            className="rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
          >
            + due date
          </button>
        )}
        <MembershipSelect
          categories={categories}
          groups={groups}
          membership={draft.membership}
          onChange={(membership) => setDraft({ ...draft, membership })}
        />
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!draft.title.trim() || submitting}
          aria-label="Add task"
          className="flex h-7 items-center justify-center rounded-sm bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40"
        >
          Add task
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

