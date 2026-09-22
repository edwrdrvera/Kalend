"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { format, isSameDay, startOfDay, addMinutes } from "date-fns";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  getEventColorClasses,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";
import { layoutDayEvents } from "@/lib/time-grid-layout";
import { MINUTES_PER_DAY, computeCreateRange, minutesFromMidnight } from "@/lib/time-grid-drag-math";
import { useCreateDrag } from "@/hooks/useCreateDrag";
import { useResizeDrag } from "@/hooks/useResizeDrag";
import { useMoveDrag } from "@/hooks/useMoveDrag";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** Default hour-row height, used by the week view. */
export const HOUR_HEIGHT_PX = 64;
/** Day view is zoomed out (shorter rows) so more of the day fits on screen. */
export const DAY_VIEW_HOUR_HEIGHT_PX = 44;

function formatHourLabel(hour: number): string {
  // 12-hour format. Midnight is kept empty so the label
  // doesn't crowd the very top of the grid (same as Google Calendar's treatment).
  if (hour === 0) return "";
  return format(new Date(2000, 0, 1, hour), "h a");
}

/** Ticks once a minute so the current-time line stays roughly accurate
 *  without re-rendering on every second. */
function useCurrentTime(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}

interface TimeGridProps {
  /** One column per entry — a single day for the Day view, seven for Week. */
  days: Date[];
  events: CalendarEvent[];
  categories: CalendarCategory[];
  /** Single click on an empty slot: select that day. */
  onSlotSelect?: (day: Date) => void;
  /** Double click on an empty slot: create an event at that hour. */
  onSlotCreate?: (day: Date, hour: number, anchorRect: DOMRect) => void;
  /** Drag across empty slots: create an event spanning the dragged range. */
  onSlotDragCreate?: (start: Date, end: Date, anchorRect: DOMRect) => void;
  /** Right-click on an empty slot: open a create menu. */
  onSlotContextMenu?: (day: Date, hour: number, x: number, y: number) => void;
  onEventClick?: (event: CalendarEvent, anchorRect: DOMRect) => void;
  /** Shift+click on an event: toggle it in the multi-selection. */
  onEventShiftClick?: (event: CalendarEvent) => void;
  /** Right-click on an event: open a delete menu. */
  onEventContextMenu?: (event: CalendarEvent, x: number, y: number) => void;
  /** Ids of events currently multi-selected (rendered with a ring). */
  selectedEventIds?: Set<string>;
  /** Fires once a whole-block drag is released, with the event's new
   *  start/end (same duration, possibly a different day). Event blocks
   *  only become draggable when this is provided. */
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  /** Fires once a top/bottom edge drag is released, with the event's new
   *  start/end. Resize handles only render when this is provided. */
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
  /** The sketched box from a drag-create, kept visible on its day column
   *  while the popover it opened is still open. */
  pendingRange?: { start: Date; end: Date } | null;
  /** Height of one hour row in px. Defaults to the week view's HOUR_HEIGHT_PX;
   *  the day view passes a smaller value to zoom out. */
  hourHeight?: number;
}

/** Shared hour-by-hour grid used by both the Week and Day views: one row per
 *  hour, a line marking the current time, and each day's events positioned
 *  by time with overlapping events placed side by side (see
 *  `layoutDayEvents`). Dragging an event block moves it to a new day and/or
 *  time, and dragging its top or bottom edge resizes it, snapped to
 *  `SNAP_MINUTES`. */
export default function TimeGrid({
  days,
  events,
  categories,
  onSlotSelect,
  onSlotCreate,
  onSlotDragCreate,
  onSlotContextMenu,
  onEventClick,
  onEventShiftClick,
  onEventContextMenu,
  selectedEventIds,
  onEventMove,
  onEventResize,
  pendingRange,
  hourHeight = HOUR_HEIGHT_PX,
}: TimeGridProps) {
  const now = useCurrentTime();
  // Total grid height derived from the (view-specific) hour-row height.
  const dayHeight = HOURS.length * hourHeight;
  const nowOffsetPx = (minutesFromMidnight(now) / (24 * 60)) * dayHeight;
  // Show the current-time marker (line + gutter label) only when one of the
  // visible columns is actually today.
  const showNow = days.some((day) => isSameDay(day, now));
  // Day view is a single column, so the per-day background accents (today
  // tint, weekend shading) that help tell week columns apart only make the
  // whole surface look mismatched. Keep day view a flat card surface.
  const isDayView = days.length === 1;

  const gridRef = useRef<HTMLDivElement>(null);

  // ── Drag gestures (extracted hooks) ────────────────────────────────
  const resize = useResizeDrag({ dayHeight, onEventResize });
  const move = useMoveDrag({
    gridRef,
    dayHeight,
    days,
    onEventMove,
    blockedByResize: resize.active,
  });
  const create = useCreateDrag({
    gridRef,
    dayHeight,
    onSlotDragCreate,
    blocked: move.active || resize.active,
  });

  function handleEventClick(e: ReactMouseEvent<HTMLButtonElement>, event: CalendarEvent) {
    e.stopPropagation();
    if (move.wasJustDragged(event.id)) return;
    if (e.shiftKey && onEventShiftClick) {
      onEventShiftClick(event);
      return;
    }
    onEventClick?.(event, e.currentTarget.getBoundingClientRect());
  }

  const { ghost, ghostRef } = move;

  return (
    <div className="flex select-none">
      {/* Hour labels — border-r connects to the column grid's left edge */}
      <div className="relative w-10 shrink-0 border-r border-border sm:w-16">
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{ height: hourHeight }}
            className="pr-1.5 text-right text-[9px] text-muted-foreground sm:pr-3 sm:text-[10px]"
          >
            <span className="relative -top-2 block truncate">{formatHourLabel(hour)}</span>
          </div>
        ))}
        {/* Current-time label, aligned with the red "now" line in the columns. */}
        {showNow && (
          <div
            className="pointer-events-none absolute right-1 z-10 -translate-y-1/2 rounded bg-red-500 px-1 py-px text-[9px] font-semibold text-white tabular-nums sm:right-1.5 sm:text-[10px]"
            style={{ top: nowOffsetPx }}
          >
            {format(now, "h:mm")}
          </div>
        )}
      </div>
      {/* Grid: gutter's border-r provides the left edge; divide-x adds 1px
          separators between columns; border-r on the grid itself caps the
          right outer edge. No wrapper div needed. */}
      <div
        ref={gridRef}
        className="relative grid flex-1 divide-x divide-border border-r border-border"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day, dayIndex) => {
          const blocks = layoutDayEvents(day, events);
          const isToday = isSameDay(day, now);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const columnBg = isDayView
            ? "bg-card"
            : isToday
              ? "bg-foreground/[0.04]"
              : isWeekend
                ? "bg-muted/30"
                : "bg-card";

          return (
            <div
              key={day.getTime()}
              className={`relative border-r border-border last:border-r-0 ${columnBg}`}
              style={{ height: dayHeight }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => create.onSlotPointerDown(e, dayIndex, day)}
                  onClick={() => {
                    if (create.consumeSlotClickSuppression()) return;
                    onSlotSelect?.(day);
                  }}
                  onDoubleClick={(e) =>
                    onSlotCreate?.(day, hour, e.currentTarget.getBoundingClientRect())
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSlotContextMenu?.(day, hour, e.clientX, e.clientY);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSlotSelect?.(day);
                    }
                  }}
                  style={{ height: hourHeight }}
                  className="border-b border-border/40"
                />
              ))}

              {isToday && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex -translate-y-1/2 items-center"
                  style={{ top: nowOffsetPx }}
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <div className="h-[2px] flex-1 bg-red-500" />
                </div>
              )}

              {/* Create-drag preview: the block the pointer is currently
                  sketching out, before the creator opens. */}
              {create.preview?.moved && create.preview.dayIndex === dayIndex && (() => {
                const { lo, hi } = computeCreateRange(create.preview.anchorMinutes, create.preview.liveMinutes);
                return (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 flex items-start overflow-hidden rounded-md border border-primary/40 bg-primary/20 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                    style={{
                      top: `${(lo / MINUTES_PER_DAY) * 100}%`,
                      height: `${((hi - lo) / MINUTES_PER_DAY) * 100}%`,
                    }}
                  >
                    {format(addMinutes(startOfDay(day), lo), "h:mm")} – {format(addMinutes(startOfDay(day), hi), "h:mm")}
                  </div>
                );
              })()}

              {/* Persistent selection box for a drag-create whose popover is
                  still open. Same visual treatment as the live preview
                  above, but keyed off `pendingRange` (state in Calendar)
                  instead of the in-progress drag, so it survives the drag
                  ending and only clears when the popover closes. */}
              {pendingRange && isSameDay(pendingRange.start, day) && (() => {
                const startMinutes = minutesFromMidnight(pendingRange.start);
                const endMinutes =
                  startMinutes +
                  (pendingRange.end.getTime() - pendingRange.start.getTime()) / 60_000;
                return (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 flex items-start overflow-hidden rounded-md border border-primary/40 bg-primary/20 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                    style={{
                      top: `${(startMinutes / MINUTES_PER_DAY) * 100}%`,
                      height: `${((endMinutes - startMinutes) / MINUTES_PER_DAY) * 100}%`,
                    }}
                  >
                    {format(pendingRange.start, "h:mm")} – {format(pendingRange.end, "h:mm")}
                  </div>
                );
              })()}

              {blocks.map(({ event, top, height, left, width }) => {
                const isBeingDragged = move.draggingEventId === event.id;
                const resizePreview = resize.previewFor(event.id);
                const displayTop = resizePreview
                  ? (resizePreview.liveStartMinutes / MINUTES_PER_DAY) * 100
                  : top;
                const displayHeight = resizePreview
                  ? ((resizePreview.liveEndMinutes - resizePreview.liveStartMinutes) / MINUTES_PER_DAY) * 100
                  : height;
                // Below this block height there's only room for the title and
                // time range; the location line would run into the border.
                const showLocation = Boolean(event.location) && height >= (45 / MINUTES_PER_DAY) * 100;

                // Floating inset accent bar: a solid rounded bar of the event's
                // color, inset from the left edge (see the span below). The
                // block keeps its soft tint fill + hue border; the bar adds a
                // stronger color cue without touching the edges.
                const displayColor = resolveDisplayColor(
                  event.color,
                  event.category_id,
                  event.color_overridden,
                  categories
                );
                const accentBarClass = isEventColor(displayColor)
                  ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
                  : "bg-muted-foreground/40";

                return (
                  <button
                    key={event.id}
                    type="button"
                    title={event.location ? `${event.title} (${event.location})` : event.title}
                    onPointerDown={(e) => move.onBlockPointerDown(e, event, dayIndex, day)}
                    onClick={(e) => handleEventClick(e, event)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEventContextMenu?.(event, e.clientX, e.clientY);
                    }}
                    style={{
                      top: `${displayTop}%`,
                      height: `${displayHeight}%`,
                      left: `calc(${left}% + 5px)`,
                      width: `calc(${width}% - 10px)`,
                    }}
                    className={`absolute overflow-hidden rounded-sm border text-left text-xs font-semibold ${onEventMove ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${isBeingDragged ? "opacity-30" : ""} ${selectedEventIds?.has(event.id) ? "ring-2 ring-primary ring-offset-1" : ""} ${getEventColorClasses(displayColor)}`}
                  >
                    {/* Floating inset accent bar, hugging the left edge. */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-1 top-1 bottom-1 w-[3px] rounded-full ${accentBarClass}`}
                    />
                    {/* Absolutely positioned (not just first in flow) so the
                     *  title always sits at the block's top-left corner —
                     *  including in a MIN_BLOCK_HEIGHT_PERCENT-clamped short
                     *  event, where flow content could otherwise center or
                     *  drift within the padded box. Left inset clears the bar. */}
                    <span className="absolute left-[13px] right-1.5 top-0.5 truncate">
                      {event.icon && <span className="mr-1">{event.icon}</span>}
                      {event.title}
                    </span>
                    <span className="absolute left-[13px] right-1.5 top-5 truncate text-[10px] font-medium opacity-90">
                      {format(new Date(event.start_at), "h:mm a")} – {format(new Date(event.end_at), "h:mm a")}
                    </span>
                    {showLocation && (
                      <span className="absolute left-[13px] right-1.5 top-9 truncate text-[11px] font-medium opacity-70">
                        {event.location}
                      </span>
                    )}

                    {onEventResize && !move.moved && (
                      <>
                        <div
                          onPointerDown={(e) => resize.onEdgePointerDown(e, "top", event, day, top, height)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-x-0 top-0 h-1.5 touch-none cursor-ns-resize"
                        />
                        <div
                          onPointerDown={(e) => resize.onEdgePointerDown(e, "bottom", event, day, top, height)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-x-0 bottom-0 h-1.5 touch-none cursor-ns-resize"
                        />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {ghost && (
          <div
            ref={ghostRef}
            // All four dimensions are px, fixed at the block's pre-drag
            // position. useMoveDrag moves the ghost purely via `transform`,
            // written directly to this node on every pointer move so it tracks
            // the cursor without snap stepping. left/width use the column's
            // pixel metrics captured at pickup, so they stay correct even with
            // the border-based column separators, which percentage positioning
            // would drift against.
            className={`pointer-events-none absolute z-20 overflow-hidden rounded-[6px] text-left text-[11px] font-medium shadow-lg ${getEventColorClasses(resolveDisplayColor(ghost.event.color, ghost.event.category_id, ghost.event.color_overridden, categories))}`}
            style={{
              left: ghost.originColumnLeft,
              width: ghost.columnWidth,
              top: (ghost.originalStartMinutes / MINUTES_PER_DAY) * dayHeight,
              height: (ghost.durationMinutes / MINUTES_PER_DAY) * dayHeight,
              transform: "translate3d(0, 0, 0)",
            }}
          >
            {/* Same top-left-pinned title treatment as the real block above,
             *  so the name doesn't drift within the ghost either. */}
            <span className="absolute inset-x-1.5 top-0.5 truncate">
              {ghost.event.icon && <span className="mr-1">{ghost.event.icon}</span>}
              {ghost.event.title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
