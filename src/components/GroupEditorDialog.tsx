"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_INPUT_CLS } from "./DateField";
import { MAX_GROUP_NAME_LENGTH } from "@/lib/group-name";
import type { CalendarGroup } from "@/lib/calendar-types";

/**
 * Create, rename or delete one Group. A Group has only a name and a Space; it
 * never moves. Opened from the Groups list and the panel's settings.
 */
export type GroupEditorTarget =
  | { mode: "create"; spaceId: string; spaceName: string }
  | { mode: "edit"; group: CalendarGroup; spaceName: string; eventCount: number; taskCount: number };

interface GroupEditorDialogProps {
  target: GroupEditorTarget | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (spaceId: string, name: string) => Promise<unknown>;
  onRename: (group: CalendarGroup, name: string) => Promise<unknown>;
  onDelete: (group: CalendarGroup) => Promise<void>;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** What deleting a Group does, in the words the confirmation shows. */
export function deleteOutcome(spaceName: string, eventCount: number, taskCount: number): string {
  if (eventCount === 0 && taskCount === 0) return `It has no events or tasks. This can't be undone.`;
  const items = [eventCount > 0 && plural(eventCount, "event"), taskCount > 0 && plural(taskCount, "task")]
    .filter(Boolean)
    .join(" and ");
  return `Its ${items} stay in ${spaceName}, but are no longer in this Group. This can't be undone.`;
}

export default function GroupEditorDialog(props: GroupEditorDialogProps) {
  const { target } = props;
  if (!target) return null;
  // Remounting per target gives each open fresh fields without an effect.
  const key = target.mode === "create" ? `create:${target.spaceId}` : `edit:${target.group.id}`;
  return <GroupEditorForm key={key} {...props} target={target} />;
}

function GroupEditorForm({
  target,
  onOpenChange,
  onCreate,
  onRename,
  onDelete,
}: GroupEditorDialogProps & { target: GroupEditorTarget }) {
  const [name, setName] = useState(target.mode === "edit" ? target.group.name : "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const busy = submitting || deleting;
  const isEdit = target.mode === "edit";
  const unchanged = isEdit && trimmed === target.group.name;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed || busy) return;
    if (unchanged) {
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (target.mode === "edit") await onRename(target.group, trimmed);
      else await onCreate(target.spaceId, trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (target.mode !== "edit" || busy) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(target.group);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Group");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (confirmingDelete && target.mode === "edit") {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete {target.group.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            {deleteOutcome(target.spaceName, target.eventCount, target.taskCount)}
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Confirm delete Group"
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Group" : `New Group in ${target.spaceName}`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Group name"
            aria-label="Group name"
            maxLength={MAX_GROUP_NAME_LENGTH}
            autoFocus
            className={cn(APP_INPUT_CLS, "w-full")}
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-1">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                aria-label="Delete Group"
              >
                <Trash2 />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
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
