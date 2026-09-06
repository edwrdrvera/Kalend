"use client";

import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
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
    <div className="flex border-b border-border">
      <div className="w-16 shrink-0" />
      <div
        className="grid flex-1 gap-x-2"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${laneCount}, ${LANE_HEIGHT_PX}px)`,
        }}
      >
        {blocks.map(({ event, startCol, endCol, lane }) => (
          <button
            key={event.id}
            type="button"
            title={event.title}
            onClick={() => onEventClick?.(event)}
            style={{
              gridColumn: `${startCol + 1} / ${endCol + 2}`,
              gridRow: lane + 1,
            }}
            className={`overflow-hidden truncate rounded-[6px] px-1.5 py-0.5 text-left text-[11px] font-medium ${getEventColorClasses(resolveDisplayColor(event.color, event.category_id, event.color_overridden, categories))}`}
          >
            {event.title}
          </button>
        ))}
      </div>
    </div>
  );
}
