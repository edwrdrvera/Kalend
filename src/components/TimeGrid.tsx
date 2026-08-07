"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { isSameDay, startOfDay, addMinutes } from "date-fns";
import type { CalendarEvent } from "./Calendar";
import { getEventColorClasses } from "@/lib/event-colors";
import { layoutDayEvents } from "@/lib/time-grid-layout";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT_PX = 56;
const DAY_HEIGHT_PX = HOURS.length * HOUR_HEIGHT_PX;
const MINUTES_PER_DAY = 24 * 60;

// Move drags snap to this increment; a drag shorter than this (in any
// direction) is treated as a click rather than a move.
const SNAP_MINUTES = 15;
const DRAG_THRESHOLD_PX = 4;

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
 *  `original*` stay fixed for the whole gesture (the anchor the drag
 *  computes deltas from); `live*` is what gets rendered as the drag moves.
 *  `moved` only flips true once the pointer travels past
 *  `DRAG_THRESHOLD_PX`, so a plain click never fires `onEventMove`. */
interface MoveDrag {
  eventId: string;
  pointerStartX: number;
  pointerStartY: number;
  originalDayIndex: number;
  originalStartMinutes: number;
  originalEndMinutes: number;
  liveDayIndex: number;
  liveStartMinutes: number;
  liveEndMinutes: number;
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
  // Set right before a real drag's onEventMove fires, so the click event
  // that follows the same pointerup doesn't also open the edit modal.
  const suppressClickRef = useRef(false);

  function handleMovePointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    event: CalendarEvent,
    dayIndex: number,
    top: number,
    height: number
  ) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const originalStartMinutes = (top / 100) * MINUTES_PER_DAY;
    const originalEndMinutes = ((top + height) / 100) * MINUTES_PER_DAY;

    setMoveDrag({
      eventId: event.id,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      originalDayIndex: dayIndex,
      originalStartMinutes,
      originalEndMinutes,
      liveDayIndex: dayIndex,
      liveStartMinutes: originalStartMinutes,
      liveEndMinutes: originalEndMinutes,
      moved: false,
    });
  }

  function handleMovePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!moveDrag) return;

    const deltaX = e.clientX - moveDrag.pointerStartX;
    const deltaY = e.clientY - moveDrag.pointerStartY;
    if (!moveDrag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    const duration = moveDrag.originalEndMinutes - moveDrag.originalStartMinutes;
    const deltaMinutes = snapMinutes((deltaY / DAY_HEIGHT_PX) * MINUTES_PER_DAY);
    const liveStartMinutes = clampMinutes(
      moveDrag.originalStartMinutes + deltaMinutes,
      0,
      MINUTES_PER_DAY - duration
    );

    let liveDayIndex = moveDrag.originalDayIndex;
    const rect = gridRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      const fraction = (e.clientX - rect.left) / rect.width;
      liveDayIndex = Math.min(days.length - 1, Math.max(0, Math.floor(fraction * days.length)));
    }

    setMoveDrag((prev) =>
      prev
        ? {
            ...prev,
            liveDayIndex,
            liveStartMinutes,
            liveEndMinutes: liveStartMinutes + duration,
            moved: true,
          }
        : prev
    );
  }

  function handleMovePointerUp(event: CalendarEvent) {
    if (!moveDrag) return;

    if (moveDrag.moved) {
      suppressClickRef.current = true;
      const dayStart = startOfDay(days[moveDrag.liveDayIndex]);
      onEventMove?.(
        event,
        addMinutes(dayStart, moveDrag.liveStartMinutes),
        addMinutes(dayStart, moveDrag.liveEndMinutes)
      );
    }
    setMoveDrag(null);
  }

  function handleEventClick(e: ReactPointerEvent<HTMLButtonElement>, event: CalendarEvent) {
    e.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onEventClick?.(event);
  }

  const draggedEvent = moveDrag?.moved ? events.find((e) => e.id === moveDrag.eventId) : undefined;

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
                const isBeingDragged = moveDrag?.moved && moveDrag.eventId === event.id;

                return (
                  <button
                    key={event.id}
                    type="button"
                    title={event.title}
                    onPointerDown={(e) => handleMovePointerDown(e, event, dayIndex, top, height)}
                    onPointerMove={handleMovePointerMove}
                    onPointerUp={() => handleMovePointerUp(event)}
                    onPointerCancel={() => setMoveDrag(null)}
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
              height: `${((moveDrag.liveEndMinutes - moveDrag.liveStartMinutes) / MINUTES_PER_DAY) * 100}%`,
            }}
          >
            {draggedEvent.title}
          </div>
        )}
      </div>
    </div>
  );
}
