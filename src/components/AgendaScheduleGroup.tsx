"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  resolveDisplayColor,
} from "@/lib/event-colors";
import { isMultiDayEvent } from "@/lib/time-grid-layout";
import type { CalendarAlert, CalendarCategory, CalendarEvent } from "@/lib/calendar-types";
import AlertBell from "./AlertBell";

interface AgendaScheduleGroupProps {
  events: CalendarEvent[];
  categories: CalendarCategory[];
  /** Space and Group name shown under each title. */
  pathOf: (item: { category_id: string | null; group_id: string | null }) => string;
  selectedDate: Date;
  /** Event ids that have an alert get a bell. */
  alertsByItem: ReadonlyMap<string, CalendarAlert>;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
}

export default function AgendaScheduleGroup({
  events,
  categories,
  pathOf,
  alertsByItem,
  onEventClick,
}: AgendaScheduleGroupProps) {
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  return (
    <section aria-label="Schedule">
      <div className="flex flex-col">
        {sorted.map((event) => {
          const allDay = isMultiDayEvent(event);
          const displayColor = resolveDisplayColor(
            event.color,
            event.category_id,
            event.color_overridden,
            categories
          );
          const swatchClass =
            isEventColor(displayColor)
              ? EVENT_COLOR_SWATCH_CLASSES[displayColor]
              : "bg-muted-foreground/70";
          const path = pathOf(event);

          return (
            <div key={event.id} className="flex items-start gap-1">
              <button
                type="button"
                onClick={(e) =>
                  onEventClick(event, e.currentTarget.getBoundingClientRect())
                }
                className="-mx-1.5 flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-1.5 py-[7px] text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
                aria-label={`Open event: ${event.title}`}
              >
                <span className="w-14 shrink-0 whitespace-nowrap text-[12.5px] tabular-nums text-muted-foreground">
                  {allDay
                    ? "All day"
                    : format(new Date(event.start_at), "h:mm a")}
                </span>
                <span
                  aria-hidden
                  className={cn("mt-1 size-[9px] shrink-0 rounded-[3px]", swatchClass)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">{event.title}</span>
                  {path && <span className="block truncate text-[11.5px] text-muted-foreground">{path}</span>}
                </span>
              </button>
              {alertsByItem.has(event.id) && (
                <span className="flex h-[30px] shrink-0 items-center">
                  <AlertBell />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
