"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Press feedback for anything clickable: a small scale-down the moment it is
 *  pressed, so the UI confirms it heard the click. */
export const PRESS_CLS =
  "transition-[color,background-color,border-color,opacity,transform] duration-150 ease-snappy motion-safe:active:scale-[0.97]";

export const ICON_BUTTON_CLS = cn(
  "grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60",
  PRESS_CLS
);

/** One label/value row of an inspector: icon and label on the left, the control on the right. */
export function DetailRow({
  icon,
  label,
  labelFor,
  className,
  children,
}: {
  icon: ReactNode;
  label: string;
  labelFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-11 items-center gap-3 border-t border-border", className)}>
      <label htmlFor={labelFor} className="flex w-20 shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="shrink-0 [&>svg]:size-3.5">
          {icon}
        </span>
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

export const FIELD_LABEL_CLS = "text-[13px] font-medium text-muted-foreground";

/** Where an inspector sits: its Space and Group (links to their overviews) and
 *  the overview Back returns to. */
export interface InspectorNav {
  space: { name: string; onOpen: () => void } | null;
  group: { name: string; onOpen: () => void } | null;
  back: { label: string; onBack: () => void } | null;
}

export function InspectorHeader({
  title,
  itemTitle,
  nav,
  onClose,
}: {
  title: string;
  itemTitle: string;
  nav: InspectorNav;
  onClose: () => void;
}) {
  const { space, group, back } = nav;
  return (
    <header className="flex flex-col gap-2 border-b border-border px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {back && (
            <button type="button" aria-label={`Back to ${back.label}`} onClick={back.onBack} className={ICON_BUTTON_CLS}>
              <ArrowLeft className="size-4" />
            </button>
          )}
          <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        </div>
        <button type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose} className={ICON_BUTTON_CLS}>
          <X className="size-4" />
        </button>
      </div>
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1 text-[12px] text-muted-foreground">
          {[space, group].map(
            (crumb, index) =>
              crumb && (
                <Fragment key={index}>
                  <li className="min-w-0">
                    <button
                      type="button"
                      onClick={crumb.onOpen}
                      className="max-w-full truncate rounded-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
                    >
                      {crumb.name}
                    </button>
                  </li>
                  <li aria-hidden="true">/</li>
                </Fragment>
              )
          )}
          <li aria-current="page" className="min-w-0 truncate text-foreground">
            {itemTitle}
          </li>
        </ol>
      </nav>
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
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-destructive"
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

  const answerEscapeWithStay = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    onStay();
  };

  return (
    <div
      role="alertdialog"
      aria-label="Unsaved changes"
      aria-describedby="unsaved-changes-text"
      onKeyDown={answerEscapeWithStay}
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
