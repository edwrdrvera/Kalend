"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { CalendarCategory, CalendarGroup } from "@/lib/calendar-types";
import { dueAtFromDate } from "@/lib/task-draft";
import { spaceMembership, type Membership } from "@/lib/membership";
import { APP_INPUT_CLS, DateField } from "@/components/DateField";
import MembershipSelect from "./MembershipSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_TITLE_LENGTH } from "@/lib/title";

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
      <Input
        ref={inputRef}
        value={draft.title}
        maxLength={MAX_TITLE_LENGTH}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Task title"
        aria-label="New task title"
        className="h-7 w-full text-body md:text-body focus-ring"
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
            className="rounded-sm text-xs text-muted-foreground hover:text-foreground focus-ring"
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!draft.title.trim() || submitting}
          aria-label="Add task"
          className="text-xs"
        >
          Add task
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

