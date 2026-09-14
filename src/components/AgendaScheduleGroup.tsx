"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";
import { isMultiDayEvent } from "@/lib/time-grid-layout";
import type { CalendarCategory, CalendarEvent } from "@/lib/calendar-types";

interface AgendaScheduleGroupProps {
  events: CalendarEvent[];
  categories: CalendarCategory[];
  selectedDate: Date;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
}

export default function AgendaScheduleGroup({
  events,
  categories,
  onEventClick,
}: AgendaScheduleGroupProps) {
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  return (
    <section aria-label="Schedule">
      <h3 className="px-3 pb-2 text-[11px] font-medium text-muted-foreground">
        Schedule
      </h3>
      <div className="flex flex-col gap-[11px]">
        {sorted.map((event) => {
          const allDay = isMultiDayEvent(event);
          const displayColor = resolveDisplayColor(
            event.color,
            event.category_id,
            event.color_overridden,
            categories
          );
          const barClass =
            isEventColor(displayColor)
              ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
              : "bg-muted-foreground/70";

          return (
            <button
              key={event.id}
              type="button"
              onClick={(e) =>
                onEventClick(event, e.currentTarget.getBoundingClientRect())
              }
              className="flex items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Edit event: ${event.title}`}
            >
              <span className="w-[58px] shrink-0 whitespace-nowrap text-[12px] font-medium tabular-nums text-muted-foreground">
                {allDay
                  ? "All day"
                  : format(new Date(event.start_at), "h:mm a")}
              </span>
              <span
                aria-hidden
                className={cn(
                  "w-[2.5px] self-stretch rounded-full",
                  barClass
                )}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                {event.title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
