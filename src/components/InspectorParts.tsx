"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ICON_BUTTON_CLS =
  "grid size-7 shrink-0 place-items-center rounded-[7px] border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const FIELD_LABEL_CLS = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function InspectorHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
      <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      <button type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose} className={ICON_BUTTON_CLS}>
        <X className="size-4" />
      </button>
    </header>
  );
}

/** Delete (with a confirm step), the save error, and Save / Retry. */
export function InspectorFooter({
  noun,
  dirty,
  saving,
  saveError,
  navigationPending,
  onDelete,
}: {
  /** "task" or "event", for the confirm text. */
  noun: string;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  navigationPending: boolean;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
      {saveError && (
        <p role="alert" className="text-[12px] text-destructive">
          {saveError}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        {confirmingDelete ? (
          <div role="group" aria-label="Confirm delete" className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground">Delete this {noun}?</span>
            <Button type="button" variant="destructive" size="sm" disabled={navigationPending} onClick={onDelete}>
              Delete
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={navigationPending}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 />
            Delete
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!dirty || saving}>
          {saving ? "Saving…" : saveError ? "Retry" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function UnsavedChangesPrompt({
  noun,
  saving,
  onSave,
  onDiscard,
  onStay,
}: {
  noun: string;
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
        You have unsaved changes to this {noun}.
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
