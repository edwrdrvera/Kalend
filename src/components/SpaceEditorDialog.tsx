"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ColorSwatchPicker from "./ColorSwatchPicker";
import { APP_INPUT_CLS } from "./DateField";
import {
  DEFAULT_EVENT_COLOR,
  isEventColor,
  type EventColor,
} from "@/lib/event-colors";
import type { CalendarCategory } from "@/lib/calendar-types";

/**
 * Create or edit one Space (name + color), with delete in edit mode. A single
 * focused dialog, opened from the rail "+" (create), the panel overflow /
 * footer, and the rail context menu (edit). Reuses the same primitives as the
 * event popover (ColorSwatchPicker, APP_INPUT_CLS) so Space and event editing
 * feel like one system.
 */
export interface SpaceEditorTarget {
  mode: "create" | "edit";
  /** The Space being edited; omitted in create mode. */
  category?: CalendarCategory;
}

interface SpaceEditorDialogProps {
  /** The open target, or null when the dialog is closed. */
  target: SpaceEditorTarget | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (
    category: CalendarCategory,
    updates: { name?: string; color?: string }
  ) => Promise<void>;
  onDelete: (category: CalendarCategory) => Promise<void>;
}

export default function SpaceEditorDialog({
  target,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: SpaceEditorDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<EventColor>(DEFAULT_EVENT_COLOR);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form each time the dialog opens for a target. Keyed on identity
  // (mode + category id) so reopening for a different Space resets the fields.
  const targetKey = target ? `${target.mode}:${target.category?.id ?? "new"}` : null;
  useEffect(() => {
    if (!target) return;
    setName(target.category?.name ?? "");
    setColor(
      target.category && isEventColor(target.category.color)
        ? target.category.color
        : DEFAULT_EVENT_COLOR
    );
    setError(null);
    setSubmitting(false);
    setDeleting(false);
    setConfirmingDelete(false);
  }, [targetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEdit = target?.mode === "edit";
  const trimmed = name.trim();
  const busy = submitting || deleting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed || busy || !target) return;

    setSubmitting(true);
    setError(null);
    try {
      if (target.mode === "edit" && target.category) {
        const updates: { name?: string; color?: string } = {};
        if (trimmed !== target.category.name) updates.name = trimmed;
        if (color !== target.category.color) updates.color = color;
        if (Object.keys(updates).length > 0) {
          await onUpdate(target.category, updates);
        }
      } else {
        await onCreate(trimmed, color);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!target?.category || busy) return;

    setDeleting(true);
    setError(null);
    try {
      await onDelete(target.category);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Space");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (target !== null && confirmingDelete && target.category) {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete {target.category.name}?</DialogTitle>
          </DialogHeader>

          <p className="text-[13px] text-muted-foreground">
            Its events and tasks stay, but become unassigned. This can&apos;t be undone.
          </p>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Confirm delete Space"
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete Space
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Space" : "New Space"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ColorSwatchPicker
              color={color}
              onColorChange={setColor}
              className="size-6 rounded-[7px]"
            />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Space name"
              aria-label="Space name"
              autoFocus
              className={cn(APP_INPUT_CLS, "min-w-0 flex-1")}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-1">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                aria-label="Delete Space"
              >
                <Trash2 />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!trimmed || busy}>
                {submitting && <Loader2 className="animate-spin" />}
                {isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
