"use client";

import { useState, type FormEvent } from "react";
import { format, isSameDay } from "date-fns";
import { Clock } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function splitDateTimeLocal(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

function joinDateTimeLocal(date: string, time: string): string {
  return `${date}T${time || "00:00"}`;
}

function formatTimeRangeSummary(startValue: string, endValue: string): string {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Select a time";
  }

  if (isSameDay(start, end)) {
    return `${format(start, "EEEE, MMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
  }

  return `${format(start, "EEE, MMM d, h:mm a")} – ${format(end, "EEE, MMM d, h:mm a")}`;
}

/** Collapsed: a single clickable summary ("Thursday, Aug 6 · 12:00 PM – 1:00
 *  PM"). Expanded: separate date/time pickers for start and end. Both
 *  panels stay mounted and cross-fade via a grid-template-rows transition,
 *  so revealing the pickers is an animation rather than an instant swap. */
function TimeRangeField({
  startAt,
  endAt,
  onStartAtChange,
  onEndAtChange,
}: {
  startAt: string;
  endAt: string;
  onStartAtChange: (value: string) => void;
  onEndAtChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const start = splitDateTimeLocal(startAt);
  const end = splitDateTimeLocal(endAt);

  return (
    <div className="flex flex-col">
      <div
        inert={expanded}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          expanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="-mx-2.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-muted/50"
          >
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            <span>{formatTimeRangeSummary(startAt, endAt)}</span>
          </button>
        </div>
      </div>

      <div
        inert={!expanded}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <div className="flex gap-1.5">
                <Input
                  type="date"
                  value={start.date}
                  onChange={(e) =>
                    onStartAtChange(joinDateTimeLocal(e.target.value, start.time))
                  }
                  required={expanded}
                />
                <Input
                  type="time"
                  value={start.time}
                  onChange={(e) =>
                    onStartAtChange(joinDateTimeLocal(start.date, e.target.value))
                  }
                  required={expanded}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">End</Label>
              <div className="flex gap-1.5">
                <Input
                  type="date"
                  value={end.date}
                  onChange={(e) =>
                    onEndAtChange(joinDateTimeLocal(e.target.value, end.time))
                  }
                  required={expanded}
                />
                <Input
                  type="time"
                  value={end.time}
                  onChange={(e) =>
                    onEndAtChange(joinDateTimeLocal(end.date, e.target.value))
                  }
                  required={expanded}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Collapsed: a single circular swatch for the active color. Popout: the
 *  full palette in a shadcn Popover. Picking a color updates the indicator
 *  and closes the popover (tracked explicitly — Popover only auto-closes
 *  on outside click/Escape, not on an arbitrary click inside its content). */
function ColorPickerField({
  color,
  onColorChange,
}: {
  color: EventColor;
  onColorChange: (color: EventColor) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={`Change color, currently ${color}`}
          className={cn(
            "size-7 shrink-0 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-popover transition-all hover:scale-105 hover:ring-foreground/20",
            EVENT_COLOR_SWATCH_CLASSES[color]
          )}
        />
        <PopoverContent className="w-auto p-2.5">
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onColorChange(c);
                  setOpen(false);
                }}
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
        </PopoverContent>
      </Popover>
      <span className="text-sm text-muted-foreground capitalize">{color}</span>
    </div>
  );
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
      <DialogContent className="gap-0 p-6 sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader className="gap-1">
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

          <TimeRangeField
            startAt={startAt}
            endAt={endAt}
            onStartAtChange={setStartAt}
            onEndAtChange={setEndAt}
          />

          <ColorPickerField color={color} onColorChange={setColor} />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent p-0">
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
