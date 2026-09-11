import { startOfDay, endOfDay, isSameDay, differenceInCalendarDays } from "date-fns";
import type { CalendarEvent } from "@/lib/calendar-types";

export interface TimeGridBlock {
  event: CalendarEvent;
  /** All four fields are percentages of the day column's box: top/height
   *  along the 24-hour axis, left/width across however many events overlap
   *  at that time. */
  top: number;
  height: number;
  left: number;
  width: number;
}

/** An event that starts and ends on different calendar days doesn't fit
 *  cleanly into a single hour column, so it belongs in the all-day row
 *  instead of `TimeGrid`. */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  return !isSameDay(new Date(event.start_at), new Date(event.end_at));
}

const MINUTES_PER_DAY = 24 * 60;
// Never render an event shorter than 15 minutes tall, so a quick
// appointment doesn't collapse into an unreadable sliver.
const MIN_BLOCK_HEIGHT_PERCENT = (15 / MINUTES_PER_DAY) * 100;

interface TimedEvent {
  event: CalendarEvent;
  startMinutes: number;
  endMinutes: number;
}

/** Positions one day's events into non-overlapping side-by-side columns, so
 *  events happening at the same time never visually collide. Events are
 *  clamped to this calendar day (a multi-day event's portion outside
 *  [00:00, 24:00) here is cut off, since each `TimeGrid` column only covers
 *  one day's worth of hours; multi-day events belong in an all-day row
 *  instead, added alongside the Week/Day views). */
export function layoutDayEvents(day: Date, events: CalendarEvent[]): TimeGridBlock[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const timed = events
    .map((event): TimedEvent | null => {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);
      if (end <= dayStart || start >= dayEnd) return null;

      const clampedStart = start < dayStart ? dayStart : start;
      const clampedEnd = end > dayEnd ? dayEnd : end;
      const startMinutes = (clampedStart.getTime() - dayStart.getTime()) / 60_000;
      const endMinutes = (clampedEnd.getTime() - dayStart.getTime()) / 60_000;

      return { event, startMinutes, endMinutes: Math.max(endMinutes, startMinutes + 1) };
    })
    .filter((item): item is TimedEvent => item !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

  // Group into clusters of mutually-overlapping events: once sorted by start
  // time, a cluster ends as soon as the next event starts after every event
  // seen so far has ended.
  const blocks: TimeGridBlock[] = [];
  let cluster: TimedEvent[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length > 0) blocks.push(...packCluster(cluster));
    cluster = [];
  };

  for (const item of timed) {
    if (cluster.length > 0 && item.startMinutes >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMinutes);
  }
  flushCluster();

  return blocks;
}

/** Within one overlapping cluster, assigns each event to the first column
 *  whose previous occupant has already ended, then splits the cluster's
 *  width evenly across however many columns that took. */
function packCluster(cluster: TimedEvent[]): TimeGridBlock[] {
  const columnEnds: number[] = [];
  const columnByEvent = new Map<TimedEvent, number>();

  for (const item of cluster) {
    let column = columnEnds.findIndex((end) => end <= item.startMinutes);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(item.endMinutes);
    } else {
      columnEnds[column] = item.endMinutes;
    }
    columnByEvent.set(item, column);
  }

  const columnCount = columnEnds.length;
  const width = 100 / columnCount;

  return cluster.map((item) => ({
    event: item.event,
    top: (item.startMinutes / MINUTES_PER_DAY) * 100,
    height: Math.max(
      ((item.endMinutes - item.startMinutes) / MINUTES_PER_DAY) * 100,
      MIN_BLOCK_HEIGHT_PERCENT
    ),
    left: columnByEvent.get(item)! * width,
    width,
  }));
}

export interface AllDayBlock {
  event: CalendarEvent;
  /** Which day columns this event's bar spans, both inclusive and 0-indexed
   *  against the `days` array passed in. */
  startCol: number;
  endCol: number;
  /** Which stacked row within the all-day area this bar sits on, so two
   *  events covering overlapping days don't render on top of each other. */
  lane: number;
}

/** Positions each multi-day event as a horizontal bar across the day columns
 *  it spans, clamped to the visible range. Events whose day ranges overlap
 *  are stacked onto separate lanes instead of overlapping. */
export function layoutAllDayEvents(days: Date[], events: CalendarEvent[]): AllDayBlock[] {
  if (days.length === 0) return [];

  const rangeStart = startOfDay(days[0]);
  const rangeEnd = endOfDay(days[days.length - 1]);

  const spanning = events
    .filter(isMultiDayEvent)
    .map((event) => {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);
      if (end < rangeStart || start > rangeEnd) return null;

      const clampedStart = start < rangeStart ? rangeStart : start;
      const clampedEnd = end > rangeEnd ? rangeEnd : end;

      return {
        event,
        startCol: differenceInCalendarDays(clampedStart, rangeStart),
        endCol: differenceInCalendarDays(clampedEnd, rangeStart),
      };
    })
    .filter((item): item is { event: CalendarEvent; startCol: number; endCol: number } => item !== null)
    .sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);

  const laneEnds: number[] = [];

  return spanning.map(({ event, startCol, endCol }) => {
    let lane = laneEnds.findIndex((end) => end < startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endCol);
    } else {
      laneEnds[lane] = endCol;
    }
    return { event, startCol, endCol, lane };
  });
}
