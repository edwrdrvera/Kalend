"use client";

import type { CalendarCategory, CalendarEvent } from "./Calendar";
import { getEventColorClasses, resolveDisplayColor } from "@/lib/event-colors";
import { layoutAllDayEvents } from "@/lib/time-grid-layout";

const LANE_HEIGHT_PX = 24;

interface AllDayRowProps {
  /** Same day columns as the `TimeGrid` below it, so bars line up with the
   *  right days. */
  days: Date[];
  events: CalendarEvent[];
  categories: CalendarCategory[];
  onEventClick?: (event: CalendarEvent) => void;
}

/** Row above `TimeGrid` for multi-day events, shown as bars spanning the
 *  days they cover instead of squeezed into a single hour column. Shared by
 *  the Week and Day views (Day view just passes a single-entry `days`). */
export default function AllDayRow({ days, events, categories, onEventClick }: AllDayRowProps) {
  const blocks = layoutAllDayEvents(days, events);
  if (blocks.length === 0) return null;

  const laneCount = Math.max(...blocks.map((b) => b.lane)) + 1;

  return (
    <div className="flex border-b border-neutral-800">
      <div className="w-14 shrink-0" />
      <div
        className="relative flex-1"
        style={{ height: laneCount * LANE_HEIGHT_PX }}
      >
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <div key={day.getTime()} className="border-l border-neutral-800" />
          ))}
        </div>
        {blocks.map(({ event, startCol, endCol, lane }) => (
          <button
            key={event.id}
            type="button"
            title={event.title}
            onClick={() => onEventClick?.(event)}
            style={{
              top: lane * LANE_HEIGHT_PX,
              height: LANE_HEIGHT_PX,
              left: `${(startCol / days.length) * 100}%`,
              width: `${((endCol - startCol + 1) / days.length) * 100}%`,
            }}
            className={`absolute overflow-hidden truncate rounded-r-sm rounded-l-none px-1.5 py-0.5 text-left text-[11px] font-medium ${getEventColorClasses(resolveDisplayColor(event.color, event.category_id, categories))}`}
          >
            {event.title}
          </button>
        ))}
      </div>
    </div>
  );
}
