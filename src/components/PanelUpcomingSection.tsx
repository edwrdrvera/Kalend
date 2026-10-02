"use client";

import { useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import type { CalendarEvent } from "@/lib/calendar-types";
import { groupByDay, type UpcomingDay } from "@/lib/space-overview";

/** Rows shown before "Show more", so a busy Space doesn't flood the panel. */
const COLLAPSED_ROWS = 5;

interface PanelUpcomingSectionProps {
  days: UpcomingDay[];
  onOpenEvent: (event: CalendarEvent) => void;
}

function dayLabel(day: Date, now: Date): string {
  if (isSameDay(day, now)) return "Today";
  if (isSameDay(day, addDays(now, 1))) return "Tomorrow";
  return format(day, "EEE, MMM d");
}

export default function PanelUpcomingSection({ days, onOpenEvent }: PanelUpcomingSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const total = days.reduce((n, d) => n + d.events.length, 0);
  if (total === 0) return null;

  const all = days.flatMap((d) => d.events);
  const shown = expanded ? all : all.slice(0, COLLAPSED_ROWS);
  const visible = groupByDay(shown);
  const hidden = total - shown.length;
  const now = new Date();

  return (
    <section aria-label="Upcoming" className="px-4 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Upcoming
      </h3>
      <div className="mt-2 flex flex-col gap-2.5">
        {visible.map(({ day, events }) => (
          <div key={day.toISOString()}>
            <p className="text-[11.5px] font-medium text-muted-foreground">{dayLabel(day, now)}</p>
            <ul className="mt-0.5 flex flex-col">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onOpenEvent(event)}
                    aria-label={`Open event ${event.title}`}
                    className="-mx-4 flex w-[calc(100%+2rem)] items-baseline gap-3 rounded-lg px-4 py-1 text-left text-[13px] hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="w-[60px] shrink-0 tabular-nums text-muted-foreground">
                      {format(new Date(event.start_at), "h:mm a")}
                    </span>
                    <span className="min-w-0 truncate text-foreground">{event.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 rounded-sm text-[12px] text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      ) : null}
    </section>
  );
}
