"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { isSameDay, startOfDay, addMinutes } from "date-fns";
import type { CalendarEvent } from "./Calendar";
import { getEventColorClasses } from "@/lib/event-colors";
import { layoutDayEvents } from "@/lib/time-grid-layout";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT_PX = 56;
const DAY_HEIGHT_PX = HOURS.length * HOUR_HEIGHT_PX;
const MINUTES_PER_DAY = 24 * 60;

// Drags snap the time to this increment.
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
// A press on an event block has to travel this many pixels before it counts
// as a drag rather than a click (which opens the edit modal instead).
const DRAG_THRESHOLD_PX = 4;
// A click on an event block within this many ms of that same event's drag
// ending is treated as the tail end of that drag, not a new click — bounded
// rather than open-ended so a dropped click can't block future clicks.
const CLICK_SUPPRESS_WINDOW_MS = 300;

function formatHourLabel(hour: number): string {
  if (hour === 0) return "";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

/** Tracks an in-progress drag of a whole event block to a new day/time.
 *  Only the static, once-per-gesture geometry lives here — the fields that
 *  change on every pointer move (the ghost's live day/time) are written
 *  straight to `liveDragRef` and the ghost element's own style instead, so
 *  moving the pointer doesn't re-render TimeGrid (see `applyPointerMove`).
 *  `moved` only flips true once the pointer travels past
 *  `DRAG_THRESHOLD_PX`, so a plain click never fires `onEventMove`; that one
 *  flip is the only state update a move-drag causes before it ends. */
interface MoveDrag {
  /** Snapshot of the event taken at pickup, so the ghost preview (and the
   *  isBeingDragged check below) don't need to re-scan `events` by id on
   *  every render while the drag is in progress. */
  event: CalendarEvent;
  pointerStartX: number;
  pointerStartY: number;
  originalDayIndex: number;
  originalStartMinutes: number;
  /** The event's real duration, taken from its start/end — not from the
   *  rendered block's height, which `layoutDayEvents` clamps to a minimum
   *  for short events and would otherwise inflate them on every move. */
  durationMinutes: number;
  /** Minutes between the pointer and the block's real (unclamped) top edge
   *  at pickup, so the block doesn't jump to be centered under the cursor. */
  grabOffsetMinutes: number;
  moved: boolean;
}

/** The drag's current day/time, snapped to `SNAP_MINUTES` — written on every
 *  pointer move and read once, on drop, to build the `onEventMove` call.
 *  Kept in a ref rather than state since it changes far more often than the
 *  component needs to re-render. */
interface LiveDragTarget {
  dayIndex: number;
  startMinutes: number;
}

/** Tracks an in-progress top/bottom edge drag on one event block. Minutes
 *  are relative to midnight of the day column being dragged in, not full
 *  `Date`s, so the drag math stays simple; `handleResizePointerUp` converts
 *  back to real dates once the drag ends. `original*` stay fixed for the
 *  whole gesture (the anchor the drag computes deltas from); `live*` is
 *  what gets rendered as the drag moves. */
interface ResizeDrag {
  eventId: string;
  edge: "top" | "bottom";
  pointerStartY: number;
  originalStartMinutes: number;
  originalEndMinutes: number;
  liveStartMinutes: number;
  liveEndMinutes: number;
}

interface TimeGridProps {
  /** One column per entry — a single day for the Day view, seven for Week. */
  days: Date[];
  events: CalendarEvent[];
  onSlotClick?: (day: Date, hour: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
  /** Fires once a whole-block drag is released, with the event's new
   *  start/end (same duration, possibly a different day). Event blocks
   *  only become draggable when this is provided. */
  onEventMove?: (event: CalendarEvent, start: Date, end: Date) => void;
  /** Fires once a top/bottom edge drag is released, with the event's new
   *  start/end. Resize handles only render when this is provided. */
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
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
  onSlotClick,
  onEventClick,
  onEventMove,
  onEventResize,
}: TimeGridProps) {
  const now = useCurrentTime();
  const nowOffsetPx = (minutesFromMidnight(now) / (24 * 60)) * DAY_HEIGHT_PX;

  const gridRef = useRef<HTMLDivElement>(null);
  const [moveDrag, setMoveDrag] = useState<MoveDrag | null>(null);
  // Mirrors `moveDrag` so the rAF callback scheduled below always reads the
  // latest drag state instead of whatever was current when it was queued.
  // Synced via an effect (not assigned inline) since refs can't be written
  // during render.
  const moveDragRef = useRef<MoveDrag | null>(null);
  useEffect(() => {
    moveDragRef.current = moveDrag;
  });
  // Where the ghost preview would drop right now, snapped to SNAP_MINUTES.
  // Written on every pointer move, read once on pointer up — never in
  // React state, so updating it doesn't trigger a render.
  const liveDragRef = useRef<LiveDragTarget | null>(null);
  // True for the rest of the gesture once `applyPointerMove` has fired the
  // one-time `moved: true` state update, so later frames (which run before
  // the state update above has actually re-rendered and caught moveDragRef
  // up) don't fire it again.
  const hasStartedMoveRef = useRef(false);
  // The floating ghost block rendered while a move-drag is in progress (see
  // the JSX below). Its position tracks the raw pointer via a CSS transform
  // written directly to this node in `applyPointerMove`, bypassing React
  // state entirely so the ghost never lags a render behind the cursor and
  // moving it doesn't force every day column to re-render.
  const ghostRef = useRef<HTMLDivElement>(null);
  // Holds the id of the event whose drag most recently ended, so the click
  // that follows a real drag's pointerup can be told apart from an
  // unrelated click on the same block — cleared automatically after
  // CLICK_SUPPRESS_WINDOW_MS via suppressClearTimeoutRef below rather than
  // left for a click to clear, so it can't get stuck if that click never
  // fires. (A setTimeout, not a Date.now() comparison, so nothing impure
  // needs to be read from inside the component body.)
  const lastDraggedEventIdRef = useRef<string | null>(null);
  const suppressClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Coalesces rapid native pointermove events (which can fire faster than
  // the display refreshes) into at most one ghost-position update per
  // animation frame, instead of one per raw event.
  const rafIdRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);

  function clientYToMinutes(clientY: number): number {
    const top = gridRef.current?.getBoundingClientRect().top ?? 0;
    return ((clientY - top) / DAY_HEIGHT_PX) * MINUTES_PER_DAY;
  }

  function cancelPendingMoveFrame() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      cancelPendingMoveFrame();
      if (suppressClearTimeoutRef.current !== null) {
        clearTimeout(suppressClearTimeoutRef.current);
      }
    };
  }, []);

  function handleMovePointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    event: CalendarEvent,
    dayIndex: number,
    day: Date
  ) {
    if (!onEventMove || resizeDrag) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const dayStart = startOfDay(day);
    const originalStartMinutes = (new Date(event.start_at).getTime() - dayStart.getTime()) / 60_000;
    const originalEndMinutes = (new Date(event.end_at).getTime() - dayStart.getTime()) / 60_000;

    hasStartedMoveRef.current = false;
    liveDragRef.current = { dayIndex, startMinutes: originalStartMinutes };
    setMoveDrag({
      event,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      originalDayIndex: dayIndex,
      originalStartMinutes,
      durationMinutes: originalEndMinutes - originalStartMinutes,
      grabOffsetMinutes: clientYToMinutes(e.clientY) - originalStartMinutes,
      moved: false,
    });
  }

  function applyPointerMove(clientX: number, clientY: number) {
    const drag = moveDragRef.current;
    if (!drag) return;

    const deltaX = clientX - drag.pointerStartX;
    const deltaY = clientY - drag.pointerStartY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    // Flips `moved` exactly once per gesture — this is the only React state
    // update a move-drag causes before it ends (it's what mounts the ghost
    // and dims the origin block). `hasStartedMoveRef` guards it rather than
    // `drag.moved` itself: `moveDragRef` only catches up to this state
    // change after the next render, and later frames can fire before that
    // happens.
    if (!hasStartedMoveRef.current) {
      hasStartedMoveRef.current = true;
      setMoveDrag((prev) => (prev ? { ...prev, moved: true } : prev));
    }

    // The ghost tracks the pointer 1:1 in pixels via a transform written
    // straight to its DOM node — not the SNAP_MINUTES-rounded position — so
    // it never visibly steps or lags behind the cursor. The snapped values
    // used to actually place the event are computed separately below and
    // only ever read once, on drop.
    const rect = gridRef.current?.getBoundingClientRect();
    const dayColumnWidth = rect && days.length > 0 ? rect.width / days.length : 0;
    const durationPx = (drag.durationMinutes / MINUTES_PER_DAY) * DAY_HEIGHT_PX;
    const originalLeftPx = drag.originalDayIndex * dayColumnWidth;
    const originalTopPx = (drag.originalStartMinutes / MINUTES_PER_DAY) * DAY_HEIGHT_PX;

    const clampedDeltaX = rect
      ? clamp(deltaX, -originalLeftPx, rect.width - dayColumnWidth - originalLeftPx)
      : deltaX;
    const clampedDeltaY = clamp(deltaY, -originalTopPx, DAY_HEIGHT_PX - durationPx - originalTopPx);

    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${clampedDeltaX}px, ${clampedDeltaY}px, 0)`;
    }

    // Snaps the absolute time under the pointer (minus the fixed grab
    // offset), not the raw movement delta — so the block's start always
    // lands on a clean SNAP_MINUTES mark even when the event's real start
    // wasn't already on one.
    const liveStartMinutes = clamp(
      snapMinutes(clientYToMinutes(clientY) - drag.grabOffsetMinutes),
      0,
      MINUTES_PER_DAY - drag.durationMinutes
    );

    let liveDayIndex = drag.originalDayIndex;
    if (rect && rect.width > 0) {
      const fraction = (clientX - rect.left) / rect.width;
      liveDayIndex = Math.min(days.length - 1, Math.max(0, Math.floor(fraction * days.length)));
    }

    liveDragRef.current = { dayIndex: liveDayIndex, startMinutes: liveStartMinutes };
  }

  function handleMovePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!moveDrag) return;

    latestPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const pointer = latestPointerRef.current;
        if (pointer) applyPointerMove(pointer.clientX, pointer.clientY);
      });
    }
  }

  function handleMovePointerUp(event: CalendarEvent) {
    cancelPendingMoveFrame();
    if (!moveDrag) return;

    // Reads hasStartedMoveRef/liveDragRef rather than moveDrag.moved — the
    // ref is updated synchronously in applyPointerMove, while the state
    // read here can still reflect the render before the pointer crossed
    // DRAG_THRESHOLD_PX if pointerup lands before that render committed.
    if (hasStartedMoveRef.current && liveDragRef.current) {
      const target = liveDragRef.current;

      lastDraggedEventIdRef.current = event.id;
      if (suppressClearTimeoutRef.current !== null) {
        clearTimeout(suppressClearTimeoutRef.current);
      }
      suppressClearTimeoutRef.current = setTimeout(() => {
        lastDraggedEventIdRef.current = null;
        suppressClearTimeoutRef.current = null;
      }, CLICK_SUPPRESS_WINDOW_MS);

      const dayStart = startOfDay(days[target.dayIndex]);
      onEventMove?.(
        event,
        addMinutes(dayStart, target.startMinutes),
        addMinutes(dayStart, target.startMinutes + moveDrag.durationMinutes)
      );
    }
    setMoveDrag(null);
    hasStartedMoveRef.current = false;
    liveDragRef.current = null;
  }

  function handleEventClick(e: ReactMouseEvent<HTMLButtonElement>, event: CalendarEvent) {
    e.stopPropagation();
    if (lastDraggedEventIdRef.current === event.id) {
      lastDraggedEventIdRef.current = null;
      if (suppressClearTimeoutRef.current !== null) {
        clearTimeout(suppressClearTimeoutRef.current);
        suppressClearTimeoutRef.current = null;
      }
      return;
    }
    onEventClick?.(event);
  }

  function handleResizePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    edge: "top" | "bottom",
    event: CalendarEvent,
    top: number,
    height: number
  ) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const originalStartMinutes = (top / 100) * MINUTES_PER_DAY;
    const originalEndMinutes = ((top + height) / 100) * MINUTES_PER_DAY;

    setResizeDrag({
      eventId: event.id,
      edge,
      pointerStartY: e.clientY,
      originalStartMinutes,
      originalEndMinutes,
      liveStartMinutes: originalStartMinutes,
      liveEndMinutes: originalEndMinutes,
    });
  }

  function handleResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizeDrag) return;

    const deltaMinutes = snapMinutes(
      ((e.clientY - resizeDrag.pointerStartY) / DAY_HEIGHT_PX) * MINUTES_PER_DAY
    );

    setResizeDrag((prev) => {
      if (!prev) return prev;

      if (prev.edge === "top") {
        return {
          ...prev,
          liveStartMinutes: clamp(
            prev.originalStartMinutes + deltaMinutes,
            0,
            prev.originalEndMinutes - MIN_DURATION_MINUTES
          ),
        };
      }

      return {
        ...prev,
        liveEndMinutes: clamp(
          prev.originalEndMinutes + deltaMinutes,
          prev.originalStartMinutes + MIN_DURATION_MINUTES,
          MINUTES_PER_DAY
        ),
      };
    });
  }

  function handleResizePointerUp(event: CalendarEvent, day: Date) {
    if (!resizeDrag) return;

    const dayStart = startOfDay(day);
    onEventResize?.(
      event,
      addMinutes(dayStart, resizeDrag.liveStartMinutes),
      addMinutes(dayStart, resizeDrag.liveEndMinutes)
    );
    setResizeDrag(null);
  }

  const draggedEvent = moveDrag?.moved ? moveDrag.event : undefined;

  return (
    <div className="flex flex-1 overflow-y-auto">
      <div className="w-14 shrink-0">
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{ height: HOUR_HEIGHT_PX }}
            className="pr-2 text-right text-[10px] text-neutral-500"
          >
            <span className="relative -top-2">{formatHourLabel(hour)}</span>
          </div>
        ))}
      </div>
      <div
        ref={gridRef}
        className="relative grid flex-1"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day, dayIndex) => {
          const blocks = layoutDayEvents(day, events);
          const isToday = isSameDay(day, now);

          return (
            <div
              key={day.getTime()}
              className="relative border-l border-neutral-800"
              style={{ height: DAY_HEIGHT_PX }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSlotClick?.(day, hour)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSlotClick?.(day, hour);
                    }
                  }}
                  style={{ height: HOUR_HEIGHT_PX }}
                  className="border-b border-neutral-800 transition-colors hover:bg-neutral-900"
                />
              ))}

              {isToday && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: nowOffsetPx }}
                >
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <div className="h-px flex-1 bg-red-500" />
                </div>
              )}

              {blocks.map(({ event, top, height, left, width }) => {
                const isBeingDragged = moveDrag?.moved && moveDrag.event.id === event.id;
                const isResizing = resizeDrag?.eventId === event.id;
                const displayTop = isResizing
                  ? (resizeDrag.liveStartMinutes / MINUTES_PER_DAY) * 100
                  : top;
                const displayHeight = isResizing
                  ? ((resizeDrag.liveEndMinutes - resizeDrag.liveStartMinutes) / MINUTES_PER_DAY) * 100
                  : height;

                return (
                  <button
                    key={event.id}
                    type="button"
                    title={event.title}
                    onPointerDown={(e) => handleMovePointerDown(e, event, dayIndex, day)}
                    onPointerMove={handleMovePointerMove}
                    onPointerUp={() => handleMovePointerUp(event)}
                    onPointerCancel={() => {
                      cancelPendingMoveFrame();
                      setMoveDrag(null);
                      hasStartedMoveRef.current = false;
                      liveDragRef.current = null;
                    }}
                    onClick={(e) => handleEventClick(e, event)}
                    style={{
                      top: `${displayTop}%`,
                      height: `${displayHeight}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    className={`absolute overflow-hidden rounded text-left text-[11px] font-medium ${onEventMove ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${isBeingDragged ? "opacity-30" : ""} ${getEventColorClasses(event.color)}`}
                  >
                    {/* Absolutely positioned (not just first in flow) so the
                     *  title always sits at the block's top-left corner —
                     *  including in a MIN_BLOCK_HEIGHT_PERCENT-clamped short
                     *  event, where flow content could otherwise center or
                     *  drift within the padded box. */}
                    <span className="absolute inset-x-1.5 top-0.5 truncate">{event.title}</span>

                    {onEventResize && !moveDrag?.moved && (
                      <>
                        <div
                          onPointerDown={(e) => handleResizePointerDown(e, "top", event, top, height)}
                          onPointerMove={handleResizePointerMove}
                          onPointerUp={() => handleResizePointerUp(event, day)}
                          onPointerCancel={() => setResizeDrag(null)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-x-0 top-0 h-1.5 touch-none cursor-ns-resize"
                        />
                        <div
                          onPointerDown={(e) => handleResizePointerDown(e, "bottom", event, top, height)}
                          onPointerMove={handleResizePointerMove}
                          onPointerUp={() => handleResizePointerUp(event, day)}
                          onPointerCancel={() => setResizeDrag(null)}
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

        {draggedEvent && moveDrag && (
          <div
            ref={ghostRef}
            // top/left/width/height are fixed at the block's pre-drag
            // position and never updated from state — applyPointerMove
            // moves the ghost purely via `transform`, written directly to
            // this node on every pointer move so it tracks the cursor
            // exactly instead of jumping between SNAP_MINUTES positions.
            //
            // top/height are px, not %: gridRef (this element's parent) can
            // render taller than DAY_HEIGHT_PX — it's a flex-1 child that
            // stretches to fill any leftover viewport space below the
            // 24-hour content — while every real event block is a
            // percentage of its own day column, which stays exactly
            // DAY_HEIGHT_PX. Percentages of the two different heights drift
            // apart the further down the day an event sits, so the ghost
            // needs the same fixed pixel scale the real blocks get for
            // free from their day column. left/width stay percentages
            // since gridRef's width always matches the day columns' summed
            // width exactly (no analogous stretch happens horizontally).
            className={`pointer-events-none absolute z-20 overflow-hidden rounded text-left text-[11px] font-medium shadow-lg ${getEventColorClasses(draggedEvent.color)}`}
            style={{
              left: `${(moveDrag.originalDayIndex / days.length) * 100}%`,
              width: `${(1 / days.length) * 100}%`,
              top: (moveDrag.originalStartMinutes / MINUTES_PER_DAY) * DAY_HEIGHT_PX,
              height: (moveDrag.durationMinutes / MINUTES_PER_DAY) * DAY_HEIGHT_PX,
              transform: "translate3d(0, 0, 0)",
            }}
          >
            {/* Same top-left-pinned title treatment as the real block above,
             *  so the name doesn't drift within the ghost either. */}
            <span className="absolute inset-x-1.5 top-0.5 truncate">{draggedEvent.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

