"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  EVENT_COLORS,
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  type EventColor,
} from "@/lib/event-colors";
import type { CalendarEvent } from "./Calendar";

export interface EventFormValues {
  title: string;
  startAt: string;
  endAt: string;
  color: EventColor;
}

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Populates the form when mode is "edit". Ignored otherwise. */
  event?: CalendarEvent | null;
  /** Pre-populates the start time when mode is "create" (e.g. the clicked day). */
  initialStart?: Date;
  onSubmit: (values: EventFormValues) => void;
  submitting?: boolean;
  error?: string | null;
}

const DEFAULT_COLOR: EventColor = "blue";
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function toDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export default function EventModal({
  open,
  onOpenChange,
  mode,
  event,
  initialStart,
  onSubmit,
  submitting = false,
  error = null,
}: EventModalProps) {
  // Initial values are derived straight from props via lazy useState
  // initializers rather than an effect that calls setState on open — the
  // caller remounts this component (via `key`) each time it should open
  // with fresh data, so there's nothing to resync after mount.
  const [title, setTitle] = useState(() =>
    mode === "edit" && event ? event.title : ""
  );
  const [startAt, setStartAt] = useState(() =>
    mode === "edit" && event
      ? toDateTimeLocal(new Date(event.start_at))
      : toDateTimeLocal(initialStart ?? new Date())
  );
  const [endAt, setEndAt] = useState(() => {
    if (mode === "edit" && event) return toDateTimeLocal(new Date(event.end_at));
    const start = initialStart ?? new Date();
    return toDateTimeLocal(new Date(start.getTime() + DEFAULT_DURATION_MS));
  });
  const [color, setColor] = useState<EventColor>(() =>
    mode === "edit" && event && isEventColor(event.color)
      ? event.color
      : DEFAULT_COLOR
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !startAt || !endAt) return;

    onSubmit({
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update the details for this event."
                : "Add a new event to your calendar."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title" className="sr-only">
              Title
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
              autoFocus
              className={cn(
                "h-auto rounded-none border-x-0 border-t-0 border-b-2 border-input/40 bg-transparent px-0 py-1.5 text-xl font-semibold shadow-none",
                "placeholder:text-muted-foreground/50",
                "focus-visible:border-primary focus-visible:ring-0"
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-pressed={color === c}
                  className={cn(
                    "size-6 rounded-full transition-transform",
                    EVENT_COLOR_SWATCH_CLASSES[c],
                    color === c
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                      : "hover:scale-110"
                  )}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
