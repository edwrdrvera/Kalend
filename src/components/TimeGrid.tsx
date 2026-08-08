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

// Move drags snap the drop time to this increment.
const SNAP_MINUTES = 15;
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

function clampMinutes(value: number, min: number, max: number): number {
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
 *  Minutes are relative to midnight of whichever day column is currently
 *  under the pointer, not full `Date`s, so the drag math stays simple;
 *  `handleMovePointerUp` converts back to real dates once the drag ends.
 *  `durationMinutes`/`grabOffsetMinutes` stay fixed for the whole gesture;
 *  `live*` is recomputed from the raw pointer position on every move (not
 *  accumulated as a delta), so the block's start always lands on a clean
 *  `SNAP_MINUTES` mark no matter where in the block it was grabbed or how
 *  far the drag has travelled. `moved` only flips true once the pointer
 *  travels past `DRAG_THRESHOLD_PX`, so a plain click never fires
 *  `onEventMove`. */
interface MoveDrag {
  /** Snapshot of the event taken at pickup, so the ghost preview (and the
   *  isBeingDragged check below) don't need to re-scan `events` by id on
   *  every render while the drag is in progress. */
  event: CalendarEvent;
  pointerStartX: number;
  pointerStartY: number;
  originalDayIndex: number;
  /** The event's real duration, taken from its start/end — not from the
   *  rendered block's height, which `layoutDayEvents` clamps to a minimum
   *  for short events and would otherwise inflate them on every move. */
  durationMinutes: number;
  /** Minutes between the pointer and the block's real (unclamped) top edge
   *  at pickup, so the block doesn't jump to be centered under the cursor. */
  grabOffsetMinutes: number;
  liveDayIndex: number;
  liveStartMinutes: number;
  moved: boolean;
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
}

/** Shared hour-by-hour grid used by both the Week and Day views: one row per
 *  hour, a line marking the current time, and each day's events positioned
 *  by time with overlapping events placed side by side (see
 *  `layoutDayEvents`). Dragging an event block moves it to a new day and/or
 *  time, snapped to `SNAP_MINUTES`, keeping its original duration. */
export default function TimeGrid({ days, events, onSlotClick, onEventClick, onEventMove }: TimeGridProps) {
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
  // the display refreshes) into at most one state update — and one
  // re-render, re-running layoutDayEvents for every day column — per
  // animation frame, instead of one per raw event.
  const rafIdRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

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
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const dayStart = startOfDay(day);
    const originalStartMinutes = (new Date(event.start_at).getTime() - dayStart.getTime()) / 60_000;
    const originalEndMinutes = (new Date(event.end_at).getTime() - dayStart.getTime()) / 60_000;

    setMoveDrag({
      event,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      originalDayIndex: dayIndex,
      durationMinutes: originalEndMinutes - originalStartMinutes,
      grabOffsetMinutes: clientYToMinutes(e.clientY) - originalStartMinutes,
      liveDayIndex: dayIndex,
      liveStartMinutes: originalStartMinutes,
      moved: false,
    });
  }

  function applyPointerMove(clientX: number, clientY: number) {
    const drag = moveDragRef.current;
    if (!drag) return;

    const deltaX = clientX - drag.pointerStartX;
    const deltaY = clientY - drag.pointerStartY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    // Snaps the absolute time under the pointer (minus the fixed grab
    // offset), not the raw movement delta — so the block's start always
    // lands on a clean SNAP_MINUTES mark even when the event's real start
    // wasn't already on one.
    const liveStartMinutes = clampMinutes(
      snapMinutes(clientYToMinutes(clientY) - drag.grabOffsetMinutes),
      0,
      MINUTES_PER_DAY - drag.durationMinutes
    );

    let liveDayIndex = drag.originalDayIndex;
    const rect = gridRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      const fraction = (clientX - rect.left) / rect.width;
      liveDayIndex = Math.min(days.length - 1, Math.max(0, Math.floor(fraction * days.length)));
    }

    setMoveDrag((prev) =>
      prev
        ? {
            ...prev,
            liveDayIndex,
            liveStartMinutes,
            moved: true,
          }
        : prev
    );
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

    if (moveDrag.moved) {
      lastDraggedEventIdRef.current = event.id;
      if (suppressClearTimeoutRef.current !== null) {
        clearTimeout(suppressClearTimeoutRef.current);
      }
      suppressClearTimeoutRef.current = setTimeout(() => {
        lastDraggedEventIdRef.current = null;
        suppressClearTimeoutRef.current = null;
      }, CLICK_SUPPRESS_WINDOW_MS);

      const dayStart = startOfDay(days[moveDrag.liveDayIndex]);
      onEventMove?.(
        event,
        addMinutes(dayStart, moveDrag.liveStartMinutes),
        addMinutes(dayStart, moveDrag.liveStartMinutes + moveDrag.durationMinutes)
      );
    }
    setMoveDrag(null);
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
                    }}
                    onClick={(e) => handleEventClick(e, event)}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    className={`absolute overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${onEventMove ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${isBeingDragged ? "opacity-30" : ""} ${getEventColorClasses(event.color)}`}
                  >
                    {event.title}
                  </button>
                );
              })}
            </div>
          );
        })}

        {draggedEvent && moveDrag && (
          <div
            className={`pointer-events-none absolute z-20 overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] font-medium shadow-lg ${getEventColorClasses(draggedEvent.color)}`}
            style={{
              left: `${(moveDrag.liveDayIndex / days.length) * 100}%`,
              width: `${(1 / days.length) * 100}%`,
              top: `${(moveDrag.liveStartMinutes / MINUTES_PER_DAY) * 100}%`,
              height: `${(moveDrag.durationMinutes / MINUTES_PER_DAY) * 100}%`,
            }}
          >
            {draggedEvent.title}
          </div>
        )}
      </div>
    </div>
  );
}
