"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Trash2, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QUIET_LINK_CLS } from "./control-styles";

/** An inspector or panel action that shows only an icon. */
export function IconButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      {...props}
    />
  );
}

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
      <Label htmlFor={labelFor} className={cn(FIELD_LABEL_CLS, "w-20 shrink-0")}>
        <span aria-hidden className="shrink-0 [&>svg]:size-3.5">
          {icon}
        </span>
        {label}
      </Label>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

export const FIELD_LABEL_CLS = "text-[12px] font-semibold text-muted-foreground";

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
            <IconButton aria-label={`Back to ${back.label}`} onClick={back.onBack}>
              <ArrowLeft className="size-4" />
            </IconButton>
          )}
          <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        </div>
        <IconButton aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1 text-[12px] text-muted-foreground">
          {[space, group].map(
            (crumb, index) =>
              crumb && (
                <Fragment key={index}>
                  <li className="min-w-0">
                    <Button
                      type="button"
                      variant="link"
                      onClick={crumb.onOpen}
                      className={cn(QUIET_LINK_CLS, "block max-w-full truncate font-medium")}
                    >
                      {crumb.name}
                    </Button>
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
