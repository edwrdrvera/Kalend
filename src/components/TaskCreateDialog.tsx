"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_INPUT_CLS } from "./DateField";
import CategorySelect from "./CategorySelect";
import type { CalendarCategory } from "@/lib/calendar-types";

/** Quick task creation seeded with a due date, opened from the calendar's
 *  right-click menu. Title + Space, with the due date fixed to the clicked day. */
interface TaskCreateDialogProps {
  /** The day the task is due, or null when closed. */
  day: Date | null;
  categories: CalendarCategory[];
  initialSpaceId: string | null;
  onCreate: (
    title: string,
    dueAt?: string,
    categoryId?: string | null
  ) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export default function TaskCreateDialog({
  day,
  categories,
  initialSpaceId,
  onCreate,
  onOpenChange,
}: TaskCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(initialSpaceId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dayKey = day ? day.toDateString() : null;
  useEffect(() => {
    if (!day) return;
    setTitle("");
    setCategoryId(initialSpaceId);
    setError(null);
    setSubmitting(false);
    inputRef.current?.focus({ preventScroll: true });
  }, [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = title.trim();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trimmed || submitting || !day) return;
    setSubmitting(true);
    setError(null);
    try {
      const due = new Date(day);
      due.setHours(23, 59, 0, 0);
      await onCreate(trimmed, due.toISOString(), categoryId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={day !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            aria-label="Task title"
            className={cn(APP_INPUT_CLS, "w-full text-[13px]")}
          />

          <div className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <span>Due {day ? format(day, "EEE, MMM d") : ""}</span>
            <CategorySelect
              categories={categories}
              categoryId={categoryId}
              onChange={setCategoryId}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!trimmed || submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
