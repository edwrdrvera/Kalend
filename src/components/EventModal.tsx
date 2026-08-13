"use client";

import { useState, type FormEvent } from "react";
import { format, isSameDay } from "date-fns";
import { Clock, Trash2 } from "lucide-react";
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
import { isEventColor, type EventColor } from "@/lib/event-colors";
import ColorSwatchPicker from "./ColorSwatchPicker";
import CategorySelect from "./CategorySelect";
import type { CalendarCategory, CalendarEvent } from "./Calendar";

export interface EventFormValues {
  title: string;
  startAt: string;
  endAt: string;
  color: EventColor;
  categoryId: string | null;
}

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Populates the form when mode is "edit". Ignored otherwise. */
  event?: CalendarEvent | null;
  /** Pre-populates the start time when mode is "create" (e.g. the clicked day). */
  initialStart?: Date;
  categories: CalendarCategory[];
  onSubmit: (values: EventFormValues) => void;
  /** Only called (and only rendered) when mode is "edit". */
  onDelete?: () => void;
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
              <div className="flex flex-col gap-1.5">
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
              <div className="flex flex-col gap-1.5">
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


export default function EventModal({
  open,
  onOpenChange,
  mode,
  event,
  initialStart,
  categories,
  onSubmit,
  onDelete,
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
  const [categoryId, setCategoryId] = useState<string | null>(() =>
    mode === "edit" && event ? event.category_id : null
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // While a category is linked, the swatch shows (and submits) that
  // category's color instead of the event's own — same live lookup used on
  // the calendar grids (resolveDisplayColor) — and is non-interactive,
  // since picking a color here wouldn't do anything until the category is
  // cleared. `color` itself stays untouched underneath so the user's own
  // color choice is still there if they later clear the category.
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryColor =
    selectedCategory && isEventColor(selectedCategory.color) ? selectedCategory.color : null;
  const swatchColor = categoryColor ?? color;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim() || !startAt || !endAt) return;

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (start >= end) {
      setValidationError("Start time must be before end time.");
      return;
    }

    onSubmit({
      title: title.trim(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      color,
      categoryId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-6 sm:max-w-md">
        {mode === "edit" && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label="Delete event"
            className="absolute top-2 right-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
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

          <div className="flex items-start gap-3">
            <ColorSwatchPicker
              color={swatchColor}
              onColorChange={setColor}
              disabled={categoryColor !== null}
              className="mt-1.5"
            />
            <div className="min-w-0 flex-1">
              <TimeRangeField
                startAt={startAt}
                endAt={endAt}
                onStartAtChange={setStartAt}
                onEndAtChange={setEndAt}
              />
            </div>
          </div>

          <CategorySelect
            categories={categories}
            categoryId={categoryId}
            onChange={setCategoryId}
            className="self-start"
          />

          {(validationError ?? error) && (
            <p className="text-sm text-destructive">{validationError ?? error}</p>
          )}

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
