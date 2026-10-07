import { addDays, isSameDay, startOfDay, startOfWeek } from "date-fns";
import type { CalendarEvent } from "./calendar-types";
import { inSubject, type PanelSubject } from "./panel-subject";

export const UPCOMING_DAYS = 14;
export const UPCOMING_LIMIT = 10;

export interface UpcomingDay {
  day: Date;
  events: CalendarEvent[];
}

/** The subject's events that have not ended and start soon. In-progress events count: they matter until they end. */
export function upcomingEventsByDay(
  events: CalendarEvent[],
  subject: PanelSubject,
  now: Date
): UpcomingDay[] {
  const horizon = addDays(startOfDay(now), UPCOMING_DAYS);
  const upcoming = events
    .filter(
      (e) =>
        inSubject(subject, e) &&
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

export interface WeekLoadDay {
  day: Date;
  /** Hours of the subject's events that fall on this day. */
  hours: number;
}

/** Booked event hours (all Spaces when `subject` is null) for each day of the week containing `now` (Sunday first, matching the calendar grid). Multi-day events count only the part inside each day. */
export function weekLoad(events: CalendarEvent[], subject: PanelSubject | null, now: Date): WeekLoadDay[] {
  const first = startOfWeek(now, { weekStartsOn: 0 });
  const mine = subject ? events.filter((e) => inSubject(subject, e)) : events;
  return Array.from({ length: 7 }, (_, i) => {
    const start = addDays(first, i).getTime();
    const end = addDays(first, i + 1).getTime();
    const ms = mine.reduce((sum, e) => {
      const from = Math.max(start, Date.parse(e.start_at));
      const to = Math.min(end, Date.parse(e.end_at));
      return sum + Math.max(0, to - from);
    }, 0);
    return { day: new Date(start), hours: ms / 3_600_000 };
  });
}
