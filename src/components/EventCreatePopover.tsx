"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { format, isSameDay } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFAULT_EVENT_COLOR, isEventColor, type EventColor } from "@/lib/event-colors";
import ColorSwatchPicker from "./ColorSwatchPicker";
import CategorySelect from "./CategorySelect";
import MiniCalendar from "./MiniCalendar";
import { POPOVER_WIDTH } from "@/lib/popover-position";
import type { CalendarCategory } from "@/lib/calendar-types";
import type { EventFormValues } from "./EventModal";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;
/** Gap between the anchor cell edge and the popover panel. */
const SIDE_GAP = 10;
/** Used for vertical centering; approximate — exact height varies with content. */
const POPOVER_HEIGHT_ESTIMATE = 300;

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

const INPUT_CLS =
  "h-6 w-full rounded border border-input bg-transparent px-1.5 text-xs text-foreground outline-none focus:border-primary";

/** MiniCalendar in a popover — replaces <input type="date">. */
function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(INPUT_CLS, "cursor-pointer text-left hover:bg-muted/30")}>
        {value ? format(date, "MMM d, yyyy") : "Select date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <MiniCalendar
          currentDate={date}
          viewDate={date}
          onDateSelect={(d) => {
            onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface EventCreatePopoverProps {
  /** Bounding rect of the clicked day cell — used to anchor the panel. */
  anchorRect: DOMRect;
  /** Which side of the anchor to open on, pre-computed by the caller. */
  side: "left" | "right";
  /** Pre-populates start time (e.g. the clicked day or time slot). */
  initialStart: Date;
  categories: CalendarCategory[];
  onSubmit: (values: EventFormValues) => void;
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
  initialStart,
  categories,
  onSubmit,
  onClose,
  submitting = false,
  error = null,
}: EventCreatePopoverProps) {
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState(() => toDateTimeLocal(initialStart));
  const [endAt, setEndAt] = useState(() =>
    toDateTimeLocal(new Date(initialStart.getTime() + DEFAULT_DURATION_MS))
  );
  const [color, setColor] = useState<EventColor>(DEFAULT_EVENT_COLOR);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fixed position: vertically centered on the anchor, horizontally offset
  // to the chosen side.
  const rawTop = anchorRect.top + anchorRect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
  const top = Math.max(8, Math.min(rawTop, window.innerHeight - POPOVER_HEIGHT_ESTIMATE - 8));
  const left =
    side === "right"
      ? anchorRect.right + SIDE_GAP
      : anchorRect.left - POPOVER_WIDTH - SIDE_GAP;

  // Tail triangle dimensions.
  const TAIL_W = 10; // px — how far the tip extends from the panel edge
  const TAIL_H = 16; // px — top-to-bottom span of the triangle base
  // Vertically center the tail on the anchor's midpoint; clamp to stay
  // within the panel's visible area.
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const tailTop = Math.max(
    14,
    Math.min(anchorCenterY - top - TAIL_H / 2, POPOVER_HEIGHT_ESTIMATE - 14 - TAIL_H)
  );

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click-outside closes (mousedown so it fires before the blur of the input)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay one tick so the click that opened the popover doesn't immediately
    // close it via this handler.
    const id = setTimeout(() => {
      document.addEventListener("mousedown", onMouseDown);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [onClose]);

  const start = splitDateTimeLocal(startAt);
  const end = splitDateTimeLocal(endAt);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryColor =
    selectedCategory && isEventColor(selectedCategory.color)
      ? selectedCategory.color
      : null;
  const swatchColor = categoryColor ?? color;

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
      categoryId,
    });
  };

  return createPortal(
    // Outer wrapper: fixed position + entry animation.
    // drop-shadow (not box-shadow) traces the combined outline of the panel
    // AND the tail triangle, so the shadow wraps the whole shape as one piece.
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top,
        left,
        width: POPOVER_WIDTH,
        zIndex: 50,
        filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.16))",
      }}
      className="animate-in fade-in-0 zoom-in-95 duration-100"
    >
      {/* Panel + tail as one solid shape. The tail is a clip-path triangle
          inside the panel div, extending outside its bounds — overflow: visible
          is the default so it peeks past the rounded rect. The ring renders on
          the rounded rect; drop-shadow on the wrapper covers the tail tip. */}
      <div className="relative rounded-2xl bg-popover text-popover-foreground ring-1 ring-foreground/10">
        {/* Tail — inline SVG so only the two outer slanted edges get the
            border stroke; the flat edge that abuts the panel has no stroke,
            making the tail look like a continuous part of the panel body. */}
        <svg
          className="absolute overflow-visible"
          style={{
            top: tailTop,
            width: TAIL_W,
            height: TAIL_H,
            ...(side === "right" ? { left: -TAIL_W } : { right: -TAIL_W }),
          }}
          viewBox={`0 0 ${TAIL_W} ${TAIL_H}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={
              side === "right"
                ? `M ${TAIL_W} 0 L 0 ${TAIL_H / 2} L ${TAIL_W} ${TAIL_H}`
                : `M 0 0 L ${TAIL_W} ${TAIL_H / 2} L 0 ${TAIL_H}`
            }
            className="fill-popover stroke-foreground/10"
            strokeWidth="1"
            strokeLinejoin="miter"
          />
        </svg>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New event"
          required
          autoFocus
          className="h-auto rounded-none border-x-0 border-t-0 border-b-2 border-input/40 bg-transparent px-0 py-1 text-base font-semibold outline-none placeholder:text-muted-foreground/50 focus:border-primary"
        />

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
                className="-mx-1 flex items-center gap-2 rounded-lg px-1 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted/50"
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
                      value={start.date}
                      onChange={(d) => setStartAt(joinDateTimeLocal(d, start.time))}
                    />
                    <input
                      type="time"
                      value={start.time}
                      onChange={(e) => setStartAt(joinDateTimeLocal(start.date, e.target.value))}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">End</label>
                  <div className="flex flex-col gap-1.5">
                    <DateField
                      value={end.date}
                      onChange={(d) => setEndAt(joinDateTimeLocal(d, end.time))}
                    />
                    <input
                      type="time"
                      value={end.time}
                      onChange={(e) => setEndAt(joinDateTimeLocal(end.date, e.target.value))}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Color + category row */}
        <div className="flex items-center gap-2">
          <ColorSwatchPicker
            color={swatchColor}
            onColorChange={setColor}
            disabled={categoryColor !== null}
          />
          <CategorySelect
            categories={categories}
            categoryId={categoryId}
            onChange={setCategoryId}
          />
        </div>

        {(validationError ?? error) && (
          <p className="text-xs text-destructive">{validationError ?? error}</p>
        )}

        <Button type="submit" disabled={submitting} size="sm" className="w-full">
          {submitting ? "Creating…" : "Create event"}
        </Button>
      </form>
      </div>
    </div>,
    document.body
  );
}
