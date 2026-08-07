"use client";

import { useEffect, useState } from "react";
import { isSameDay } from "date-fns";
import type { CalendarEvent } from "./Calendar";
import { getEventColorClasses } from "@/lib/event-colors";
import { layoutDayEvents } from "@/lib/time-grid-layout";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_HEIGHT_PX = 56;
const DAY_HEIGHT_PX = HOURS.length * HOUR_HEIGHT_PX;

function formatHourLabel(hour: number): string {
  if (hour === 0) return "";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
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
  onSlotClick?: (day: Date, hour: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

/** Shared hour-by-hour grid used by both the Week and Day views: one row per
 *  hour, a line marking the current time, and each day's events positioned
 *  by time with overlapping events placed side by side (see
 *  `layoutDayEvents`). Not wired into either view yet — that's next. */
export default function TimeGrid({ days, events, onSlotClick, onEventClick }: TimeGridProps) {
  const now = useCurrentTime();
  const nowOffsetPx = (minutesFromMidnight(now) / (24 * 60)) * DAY_HEIGHT_PX;

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

              {blocks.map(({ event, top, height, left, width }) => (
                <button
                  key={event.id}
                  type="button"
                  title={event.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                  className={`absolute overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${getEventColorClasses(event.color)}`}
                >
                  {event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
