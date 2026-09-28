"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarCategory, CalendarTask, TaskPatchRequest } from "@/lib/calendar-types";
import { draftFromTask, draftPatch, type TaskDraft } from "@/lib/task-draft";
import { APP_INPUT_CLS, DateField } from "./DateField";
import CategorySelect from "./CategorySelect";
import PanelShell from "./PanelShell";

interface TaskInspectorProps {
  task: CalendarTask;
  categories: CalendarCategory[];
  modal: boolean;
  onClose: () => void;
  /** Resolves false when the save failed, so the draft stays. */
  onSave: (task: CalendarTask, patch: TaskPatchRequest) => Promise<boolean>;
  onToggleComplete: (task: CalendarTask) => void;
  onDelete: (task: CalendarTask) => void;
  onDirtyChange: (dirty: boolean) => void;
  /** A navigation is waiting on the user's Save / Discard / Stay answer. */
  navigationPending: boolean;
  onProceed: () => void;
  onStay: () => void;
}

const ICON_BUTTON_CLS =
  "grid size-7 shrink-0 place-items-center rounded-[7px] border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A task's details in the right panel. Mount it with `key={task.id}` so each
 *  task gets a fresh draft. */
export default function TaskInspector({
  task,
  categories,
  modal,
  onClose,
  onSave,
  onToggleComplete,
  onDelete,
  onDirtyChange,
  navigationPending,
  onProceed,
  onStay,
}: TaskInspectorProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => draftFromTask(task));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const patch = draftPatch(task, draft);
  const dirty = Object.keys(patch).length > 0;
  const titleMissing = draft.title.trim() === "";

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const update = (changes: Partial<TaskDraft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    setSaveError(null);
  };

  const save = async (): Promise<boolean> => {
    if (titleMissing) {
      setSaveError("Add a title before saving.");
      return false;
    }
    setSaving(true);
    setSaveError(null);
    const ok = await onSave(task, patch);
    setSaving(false);
    if (!ok) setSaveError("Couldn't save your changes.");
    return ok;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (dirty && !saving) void save();
  };

  const saveAndProceed = async () => {
    if (await save()) onProceed();
    else onStay();
  };

  return (
    <PanelShell label="Task details" modal={modal} onClose={onClose}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
        <h2 className="text-[13px] font-semibold text-foreground">Task details</h2>
        <button
          type="button"
          aria-label="Close task details"
          onClick={onClose}
          className={ICON_BUTTON_CLS}
        >
          <X className="size-4" />
        </button>
      </header>

      {navigationPending && (
        <UnsavedChangesPrompt saving={saving} onSave={saveAndProceed} onDiscard={onProceed} onStay={onStay} />
      )}

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </span>
          <input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            aria-invalid={titleMissing || undefined}
            className={cn(APP_INPUT_CLS, "w-full focus-visible:ring-2 focus-visible:ring-ring")}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Due date
          </span>
          <div className="flex items-center gap-1.5">
            <DateField label="Due date" value={draft.dueDate} onChange={(dueDate) => update({ dueDate })} />
            {draft.dueDate && (
              <button
                type="button"
                aria-label="Clear due date"
                onClick={() => update({ dueDate: "" })}
                className={ICON_BUTTON_CLS}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Space
          </span>
          <CategorySelect
            categories={categories}
            categoryId={draft.categoryId}
            onChange={(categoryId) => update({ categoryId })}
            className="-mx-2 w-fit"
          />
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          onClick={() => onToggleComplete(task)}
          className="flex w-fit items-center gap-2 rounded-sm text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-[15px] items-center justify-center rounded-[4px] border-[1.5px]",
              task.completed
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-transparent"
            )}
          >
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          Done
        </button>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
          {saveError && (
            <p role="alert" className="text-[12px] text-destructive">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            {confirmingDelete ? (
              <div role="group" aria-label="Confirm delete" className="flex items-center gap-1.5">
                <span className="text-[12px] text-muted-foreground">Delete this task?</span>
                <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(task)}>
                  Delete
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
                <Trash2 />
                Delete
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!dirty || saving}>
              {saving ? "Saving…" : saveError ? "Retry" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </PanelShell>
  );
}

function UnsavedChangesPrompt({
  saving,
  onSave,
  onDiscard,
  onStay,
}: {
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}) {
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    saveRef.current?.focus();
  }, []);

  // Escape answers the prompt with Stay instead of reaching the panel, where
  // it would request the close again.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    onStay();
  };

  return (
    <div
      role="alertdialog"
      aria-label="Unsaved changes"
      aria-describedby="unsaved-changes-text"
      onKeyDown={handleKeyDown}
      className="m-4 mb-0 flex flex-col gap-2 rounded-lg border border-border bg-muted/60 p-3"
    >
      <p id="unsaved-changes-text" className="text-[12.5px] text-foreground">
        You have unsaved changes to this task.
      </p>
      <div className="flex items-center gap-1.5">
        <Button ref={saveRef} type="button" size="sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onStay}>
          Stay
        </Button>
      </div>
    </div>
  );
}
