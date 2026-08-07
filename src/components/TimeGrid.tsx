"use client";

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { isSameDay, startOfDay, addMinutes } from "date-fns";
import type { CalendarEvent } from "./Calendar";
import { getEventColorClasses } from "@/lib/event-colors";
import { layoutDayEvents } from "@/lib/time-grid-layout";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT_PX = 56;
const DAY_HEIGHT_PX = HOURS.length * HOUR_HEIGHT_PX;
const MINUTES_PER_DAY = 24 * 60;

// Resize drags snap to this increment and can't shrink an event past it.
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;

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
  /** Fires once a top/bottom edge drag is released, with the event's new
   *  start/end. Resize handles only render when this is provided. */
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
}

/** Shared hour-by-hour grid used by both the Week and Day views: one row per
 *  hour, a line marking the current time, and each day's events positioned
 *  by time with overlapping events placed side by side (see
 *  `layoutDayEvents`). Dragging an event block's top or bottom edge resizes
 *  it, snapped to `SNAP_MINUTES`. */
export default function TimeGrid({ days, events, onSlotClick, onEventClick, onEventResize }: TimeGridProps) {
  const now = useCurrentTime();
  const nowOffsetPx = (minutesFromMidnight(now) / (24 * 60)) * DAY_HEIGHT_PX;

  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);

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
          liveStartMinutes: clampMinutes(
            prev.originalStartMinutes + deltaMinutes,
            0,
            prev.originalEndMinutes - MIN_DURATION_MINUTES
          ),
        };
      }

      return {
        ...prev,
        liveEndMinutes: clampMinutes(
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
        className="grid flex-1"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    style={{
                      top: `${displayTop}%`,
                      height: `${displayHeight}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    className={`absolute overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${getEventColorClasses(event.color)}`}
                  >
                    {event.title}

                    {onEventResize && (
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
      </div>
    </div>
  );
}
