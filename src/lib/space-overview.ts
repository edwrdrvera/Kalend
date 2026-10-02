import { addDays, isSameDay, startOfDay } from "date-fns";
import type { CalendarEvent } from "./calendar-types";

export const UPCOMING_DAYS = 14;
export const UPCOMING_LIMIT = 10;

export interface UpcomingDay {
  day: Date;
  events: CalendarEvent[];
}

/** In-progress events count as upcoming: they matter until they end. */
export function upcomingEventsByDay(
  events: CalendarEvent[],
  spaceId: string,
  now: Date
): UpcomingDay[] {
  const horizon = addDays(startOfDay(now), UPCOMING_DAYS);
  const upcoming = events
    .filter(
      (e) =>
        e.category_id === spaceId &&
        new Date(e.end_at) > now &&
        new Date(e.start_at) < horizon
    )
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))
    .slice(0, UPCOMING_LIMIT);

  return groupByDay(upcoming);
}

/** Buckets events already in start order into consecutive days. */
export function groupByDay(events: CalendarEvent[]): UpcomingDay[] {
  const days: UpcomingDay[] = [];
  for (const event of events) {
    const start = new Date(event.start_at);
    const last = days.at(-1);
    if (last && isSameDay(last.day, start)) last.events.push(event);
    else days.push({ day: startOfDay(start), events: [event] });
  }
  return days;
}
