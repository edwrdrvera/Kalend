"use client";

import { useState, useEffect, useReducer, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { format, isSameDay } from "date-fns";
import { Clock, MapPin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { APP_INPUT_CLS, DateField, SMALL_INPUT_CLS } from "@/components/DateField";
import { DEFAULT_EVENT_COLOR, isEventColor, resolveDisplayColor } from "@/lib/event-colors";
import { eventColorReducer, initialEventColor } from "@/lib/event-color-state";
import type { EventFormValues } from "@/lib/event-form";
import ColorSwatchPicker from "./ColorSwatchPicker";
import CategorySelect from "./CategorySelect";
import { POPOVER_WIDTH } from "@/lib/popover-position";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;
/** Mirrors the API's field limits (`src/app/api/events/route.ts`). */
const MAX_LOCATION_LENGTH = 500;
const MAX_ICON_LENGTH = 10;
/** Gap between the anchor cell edge and the popover panel. */
const SIDE_GAP = 10;
/** Used for vertical centering; approximate — exact height varies with content. */
const POPOVER_HEIGHT_ESTIMATE = 300;

export type { EventFormValues } from "@/lib/event-form";

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
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  if (isSameDay(start, end)) {
    return `${format(start, "EEEE, MMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
  }
  return `${format(start, "EEE, MMM d, h:mm a")} – ${format(end, "EEE, MMM d, h:mm a")}`;
}

interface EventCreatePopoverProps {
  /** Bounding rect of the clicked day cell — used to anchor the panel. */
  anchorRect: DOMRect;
  /** Which side of the anchor to open on, pre-computed by the caller. */
  side: "left" | "right";
  /** Pre-populates the form when editing an existing event. */
  event?: CalendarEvent | null;
  /** Pre-populates start time when creating from a clicked day or time slot. */
  initialStart?: Date;
  /** Snapshotted Space focus used only when creating a new event. */
  initialSpaceId?: string | null;
  categories: CalendarCategory[];
  onSubmit: (values: EventFormValues) => void;
  onDelete?: () => void;
  onClose: () => void;
  submitting?: boolean;
  error?: string | null;
}

/** Inline floating panel for quick event creation, anchored to the day cell
 *  the user clicked. Opens to the right (or left when near the edge). No
 *  dialog backdrop — the calendar stays fully visible behind it. */
export default function EventCreatePopover({
  anchorRect,
  side,
  event,
  initialStart,
  initialSpaceId = null,
  categories,
  onSubmit,
  onDelete,
  onClose,
  submitting = false,
  error = null,
}: EventCreatePopoverProps) {
  const isEditing = Boolean(event);
  const [title, setTitle] = useState(() => event?.title ?? "");
  const [icon, setIcon] = useState(() => event?.icon ?? "");
  const [location, setLocation] = useState(() => event?.location ?? "");
  const [startAt, setStartAt] = useState(() =>
    toDateTimeLocal(event ? new Date(event.start_at) : initialStart ?? new Date())
  );
  const [endAt, setEndAt] = useState(() =>
    toDateTimeLocal(
      event
        ? new Date(event.end_at)
        : new Date((initialStart ?? new Date()).getTime() + DEFAULT_DURATION_MS)
    )
  );
  const [colorState, dispatchColor] = useReducer(
    eventColorReducer,
    initialEventColor(event, initialSpaceId)
  );
  const { color, categoryId, colorOverridden } = colorState;
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fixed position: vertically centered on the anchor, horizontally offset
  // to the chosen side.
  const rawTop = anchorRect.top + anchorRect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
  const top = Math.max(8, Math.min(rawTop, window.innerHeight - POPOVER_HEIGHT_ESTIMATE - 8));
  // On viewports narrower than the panel (plus its 8px margins), shrink the
  // panel to fit instead of letting it overflow the screen.
  const effectiveWidth = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
  const left =
    side === "right"
      ? anchorRect.right + SIDE_GAP
      : anchorRect.left - effectiveWidth - SIDE_GAP;
  const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - effectiveWidth - 8));
  // If the anchor sits close enough to the viewport edge that clamping had
  // to move the panel away from it, the tail arrow would no longer point at
  // the anchor cell — hide it rather than show a misleading pointer.
  const wasClamped = clampedLeft !== left;

  const tailWidth = 8;
  const tailHeight = 14;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const tailTop = Math.max(
    12,
    Math.min(anchorCenterY - top - tailHeight / 2, POPOVER_HEIGHT_ESTIMATE - 12 - tailHeight)
  );

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = splitDateTimeLocal(startAt);
  const end = splitDateTimeLocal(endAt);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const visibleColor = resolveDisplayColor(color, categoryId, colorOverridden, categories);
  const swatchColor = isEventColor(visibleColor) ? visibleColor : DEFAULT_EVENT_COLOR;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!title.trim()) return;
    const s = new Date(startAt);
    const en = new Date(endAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) {
      setValidationError("Invalid date.");
      return;
    }
    if (s >= en) {
      setValidationError("Start must be before end.");
      return;
    }
    onSubmit({
      title: title.trim(),
      startAt: s.toISOString(),
      endAt: en.toISOString(),
      color,
      colorOverridden,
      categoryId,
      location: location.trim() || null,
      icon: icon.trim() || null,
    });
  };

  return createPortal(
    <>
      {/* Backdrop: sits below the panel and nested pickers (both z-50) at
          z-49. Any click that reaches this div landed outside the panel and
          all open pickers, so it closes the editor. Clicks on the panel or
          on any nested picker popover are captured by those elements first
          and never reach the backdrop. */}
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        // Close on click (not pointerdown) so the backdrop stays mounted
        // through the full pointer cycle. If we close on pointerdown, React
        // removes the backdrop before pointerup/click fire, and those events
        // land on the now-exposed calendar grid — selecting a day and opening
        // a new creation popover.
        onClick={onClose}
      />
      {/* Fixed, compact editor that stays visually subordinate to the calendar. */}
      <div
        role="dialog"
        aria-label={isEditing ? "Edit event" : "Create event"}
        style={{
          position: "fixed",
          top,
          left: clampedLeft,
          width: effectiveWidth,
          zIndex: 50,
          filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.12))",
        }}
        className="animate-in fade-in-0 zoom-in-95 duration-100"
      >
      <div className="relative rounded-md border border-border bg-popover text-popover-foreground">
        {!wasClamped && (
          <svg
            aria-hidden="true"
            className="absolute overflow-visible"
            style={{
              top: tailTop,
              width: tailWidth,
              height: tailHeight,
              ...(side === "right" ? { left: -tailWidth } : { right: -tailWidth }),
            }}
            viewBox={`0 0 ${tailWidth} ${tailHeight}`}
          >
            <path
              d={
                side === "right"
                  ? `M ${tailWidth} 0 L 0 ${tailHeight / 2} L ${tailWidth} ${tailHeight}`
                  : `M 0 0 L ${tailWidth} ${tailHeight / 2} L 0 ${tailHeight}`
              }
              className="fill-popover stroke-border"
              strokeWidth="1"
            />
          </svg>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3">
          {/* Title, with a small optional icon/symbol alongside it */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="new-event-icon" className="sr-only">
              Event icon
            </label>
            <input
              id="new-event-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, MAX_ICON_LENGTH))}
              placeholder="🙂"
              title="Optional emoji or symbol for this event"
              maxLength={MAX_ICON_LENGTH}
              className={cn(APP_INPUT_CLS, "w-9 shrink-0 text-center")}
            />
            <label htmlFor="new-event-title" className="sr-only">
              Event title
            </label>
            <input
              id="new-event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEditing ? "Event title" : "New event"}
              required
              autoFocus
              className={cn(APP_INPUT_CLS, "w-full font-semibold")}
            />
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <label htmlFor="new-event-location" className="sr-only">
              Location
            </label>
            <input
              id="new-event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={MAX_LOCATION_LENGTH}
              className={cn(APP_INPUT_CLS, "w-full")}
            />
          </div>

          {/* Collapsed time summary → expands to date/time pickers */}
          <div className="flex flex-col">
            <div
              inert={timeExpanded}
              className={cn(
                "grid transition-all duration-150 ease-in-out",
                timeExpanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
              )}
            >
              <div className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTimeExpanded(true)}
                  className="-mx-1 flex items-center gap-2 rounded-sm px-1 py-1 text-left text-xs text-foreground/80 transition-colors hover:bg-muted/50"
                >
                  <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>{formatTimeRangeSummary(startAt, endAt)}</span>
                </button>
              </div>
            </div>
            <div
              inert={!timeExpanded}
              className={cn(
                "grid transition-all duration-150 ease-in-out",
                timeExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Start</label>
                    <div className="flex flex-col gap-1.5">
                      <DateField
                        label="Start date"
                        value={start.date}
                        onChange={(d) => setStartAt(joinDateTimeLocal(d, start.time))}
                      />
                      <input
                        type="time"
                        aria-label="Start time"
                        value={start.time}
                        onChange={(e) => setStartAt(joinDateTimeLocal(start.date, e.target.value))}
                        className={cn(SMALL_INPUT_CLS, "w-full")}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">End</label>
                    <div className="flex flex-col gap-1.5">
                      <DateField
                        label="End date"
                        value={end.date}
                        onChange={(d) => setEndAt(joinDateTimeLocal(d, end.time))}
                      />
                      <input
                        type="time"
                        aria-label="End time"
                        value={end.time}
                        onChange={(e) => setEndAt(joinDateTimeLocal(end.date, e.target.value))}
                        className={cn(SMALL_INPUT_CLS, "w-full")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Color + Space row */}
          <div className="flex items-center gap-2">
            <ColorSwatchPicker
              color={swatchColor}
              onColorChange={(nextColor) => dispatchColor({ type: "pick", color: nextColor })}
            />
            <CategorySelect
              categories={categories}
              categoryId={categoryId}
              onChange={(nextId) => dispatchColor({ type: "space", categoryId: nextId, categories })}
            />
          </div>
          {selectedCategory && (
            colorOverridden ? (
              <button
                type="button"
                className="self-start text-xs font-medium text-primary hover:underline"
                onClick={() => dispatchColor({ type: "inherit" })}
              >
                Use Space color
              </button>
            ) : <p className="text-xs text-muted-foreground">Using Space color</p>
          )}

          {(validationError ?? error) && (
            <p className="text-xs text-destructive">{validationError ?? error}</p>
          )}

          <div className="flex items-center justify-end gap-1.5 border-t border-border pt-3">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                aria-label="Delete event"
                className="mr-auto rounded-sm px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-sm px-3"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} size="sm" className="rounded-sm px-3">
              {submitting ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Create event"}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </>,
    document.body
  );
}
