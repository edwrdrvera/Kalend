// Pinned in package.json to 2.2.1 with no caret. Recurrence, skipped dates,
// and a TZID with no VTIMEZONE block are read from this version, and a newer
// release can change those.
import ICAL from "ical.js";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/description";
import { MAX_LOCATION_LENGTH } from "@/lib/event-form";
import {
  ICS_NOT_CALENDAR_MESSAGE,
  ICS_TIME_ZONE_MESSAGE,
  ICS_TOO_MANY_MESSAGE,
  MAX_IMPORTED_EVENTS,
} from "@/lib/ics-limits";
import { MAX_TITLE_LENGTH } from "@/lib/title";

export interface ImportedEvent {
  importUid: string;
  /** ISO time of the occurrence's original start, or "" when the event does not repeat. */
  importOccurrence: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location: string | null;
  description: string | null;
}

export type IcsParseResult =
  | { events: ImportedEvent[]; skipped: number }
  | { error: string };

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// A repeating event is walked one occurrence at a time. The cap stops a rule
// such as every second from running without end. Crossing it rejects the file.
const MAX_EXPANSION_STEPS = 100_000;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Turns calendar text into events for one user.
 * `now` and `tz` decide the six-month window for repeating events, and `tz`
 * is the zone for floating times and all-day dates.
 */
export function parseIcs(text: string, options: { now: Date; tz: string }): IcsParseResult {
  if (!isValidTimeZone(options.tz)) return { error: ICS_TIME_ZONE_MESSAGE };
  if (!text.trim()) return { error: ICS_NOT_CALENDAR_MESSAGE };

  let component: ICAL.Component;
  try {
    component = new ICAL.Component(ICAL.parse(text));
  } catch {
    return { error: ICS_NOT_CALENDAR_MESSAGE };
  }
  if (component.name !== "vcalendar") return { error: ICS_NOT_CALENDAR_MESSAGE };

  const windowStart = startOfZonedDay(options.now, options.tz);
  const windowEnd = zonedDayAfterMonths(options.now, options.tz, 6);
  const rows = new Map<string, ImportedEvent>();
  let skipped = 0;
  let steps = 0;

  for (const group of groupEvents(component.getAllSubcomponents("vevent"))) {
    const master = pickMaster(group);
    if (!master) {
      for (const componentOfException of group) {
        const outcome = singleEvent(new ICAL.Event(componentOfException), options.tz, true);
        if (outcome === "skip") {
          skipped += 1;
          continue;
        }
        if (rows.size >= MAX_IMPORTED_EVENTS) return { error: ICS_TOO_MANY_MESSAGE };
        rows.set(rowKey(outcome), outcome);
      }
      continue;
    }

    let event: ICAL.Event;
    try {
      event = new ICAL.Event(master);
    } catch {
      skipped += 1;
      continue;
    }
    if (!master.hasProperty("dtstart")) {
      skipped += 1;
      continue;
    }

    if (!event.isRecurring()) {
      const outcome = singleEvent(event, options.tz, false);
      if (outcome === "skip") {
        skipped += 1;
        continue;
      }
      if (rows.size >= MAX_IMPORTED_EVENTS) return { error: ICS_TOO_MANY_MESSAGE };
      rows.set(rowKey(outcome), outcome);
      continue;
    }

    // iterator() treats a passed time as a new start, not a resume point,
    // so the walk always begins at the event's own start.
    const iter = event.iterator();
    let next = readNext(iter);
    while (next && next !== "stop") {
      steps += 1;
      if (steps > MAX_EXPANSION_STEPS) return { error: ICS_TOO_MANY_MESSAGE };
      const original = toInstant(next, options.tz, declaredZone(master, "dtstart"));
      if (!original) {
        skipped += 1;
      } else if (original >= windowEnd) {
        break;
      } else if (original >= windowStart) {
        const outcome = occurrenceEvent(event, next, options.tz);
        if (outcome === "skip") {
          skipped += 1;
        } else {
          if (rows.size >= MAX_IMPORTED_EVENTS && !rows.has(rowKey(outcome))) {
            return { error: ICS_TOO_MANY_MESSAGE };
          }
          rows.set(rowKey(outcome), outcome);
        }
      }
      next = readNext(iter);
    }
    if (next === "stop") skipped += 1;
  }

  return { events: [...rows.values()], skipped };
}

function readNext(iter: ICAL.RecurExpansion): ICAL.Time | null | "stop" {
  try {
    return iter.next() ?? null;
  } catch {
    return "stop";
  }
}

function groupEvents(vevents: ICAL.Component[]): ICAL.Component[][] {
  const byUid = new Map<string, ICAL.Component[]>();
  for (const vevent of vevents) {
    const uid = componentUid(vevent);
    const list = byUid.get(uid) ?? [];
    list.push(vevent);
    byUid.set(uid, list);
  }
  return [...byUid.values()];
}

function componentUid(vevent: ICAL.Component): string {
  const uid = vevent.getFirstPropertyValue("uid");
  if (typeof uid === "string" && uid.trim()) return uid.trim();
  const start = vevent.getFirstPropertyValue("dtstart");
  const summary = vevent.getFirstPropertyValue("summary");
  const startText = start && typeof start === "object" && "toString" in start ? String(start) : "none";
  const summaryText = typeof summary === "string" ? summary : "";
  return `missing:${startText}:${summaryText}`;
}

function pickMaster(group: ICAL.Component[]): ICAL.Component | null {
  const plain = group.filter((component) => !component.hasProperty("recurrence-id"));
  return plain.find((component) => component.hasProperty("rrule") || component.hasProperty("rdate")) ?? plain[0] ?? null;
}

function singleEvent(event: ICAL.Event, timeZone: string, fromException: boolean): ImportedEvent | "skip" {
  if (!event.component.hasProperty("dtstart")) return "skip";
  let startTime: ICAL.Time;
  let endTime: ICAL.Time;
  try {
    startTime = event.startDate;
    endTime = event.endDate;
  } catch {
    return "skip";
  }
  const startTzid = declaredZone(event.component, "dtstart");
  const endTzid = declaredZone(event.component, "dtend") ?? startTzid;
  const startAt = toInstant(startTime, timeZone, startTzid);
  const endAt = toInstant(endTime, timeZone, endTzid);
  if (!startAt || !endAt || endAt.getTime() <= startAt.getTime()) return "skip";
  let occurrence = "";
  if (fromException) {
    try {
      const key = occurrenceKey(event.recurrenceId, timeZone, declaredZone(event.component, "recurrence-id") ?? startTzid);
      if (!key) return "skip";
      occurrence = key;
    } catch {
      return "skip";
    }
  }
  return {
    importUid: componentUid(event.component),
    importOccurrence: occurrence,
    title: titleFrom(textOf(event.summary)),
    startAt,
    endAt,
    location: clip(textOf(event.location), MAX_LOCATION_LENGTH),
    description: clip(textOf(event.description), MAX_DESCRIPTION_LENGTH),
  };
}

function occurrenceEvent(event: ICAL.Event, when: ICAL.Time, timeZone: string): ImportedEvent | "skip" {
  let details: ReturnType<ICAL.Event["getOccurrenceDetails"]>;
  try {
    details = event.getOccurrenceDetails(when);
  } catch {
    return "skip";
  }
  const masterStart = declaredZone(event.component, "dtstart");
  const masterEnd = declaredZone(event.component, "dtend") ?? masterStart;
  const item = details.item.component;
  const startAt = toInstant(details.startDate, timeZone, declaredZone(item, "dtstart") ?? masterStart);
  const endAt = toInstant(details.endDate, timeZone, declaredZone(item, "dtend") ?? masterEnd);
  const occurrence = occurrenceKey(when, timeZone, masterStart);
  if (!startAt || !endAt || !occurrence || endAt.getTime() <= startAt.getTime()) return "skip";
  return {
    importUid: componentUid(event.component),
    importOccurrence: occurrence,
    title: titleFrom(textOf(details.item.summary)),
    startAt,
    endAt,
    location: clip(textOf(details.item.location), MAX_LOCATION_LENGTH),
    description: clip(textOf(details.item.description), MAX_DESCRIPTION_LENGTH),
  };
}

function rowKey(event: ImportedEvent): string {
  return `${event.importUid}\0${event.importOccurrence}`;
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function titleFrom(summary: string): string {
  const title = summary.trim() || "Untitled";
  return title.length <= MAX_TITLE_LENGTH ? title : title.slice(0, MAX_TITLE_LENGTH);
}

function clip(value: string, max: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function occurrenceKey(time: ICAL.Time, timeZone: string, declaredTzid: string | null): string | null {
  if (time.isDate) return dateStamp(time);
  const instant = toInstant(time, timeZone, declaredTzid);
  return instant ? instant.toISOString() : null;
}

function dateStamp(time: ICAL.Time): string {
  return `${String(time.year).padStart(4, "0")}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

/**
 * A floating time has no zone of its own, so it is read in `timeZone`.
 * A TZID that came with a VTIMEZONE is already applied. A TZID on its own is
 * still an IANA name, and the wall clock is converted with that name.
 */
// A TZID with no VTIMEZONE leaves the time floating. The zone name stays on
// the property as its TZID parameter, which is the public place ical.js keeps it.
function declaredZone(component: ICAL.Component, name: string): string | null {
  const tzid = component.getFirstProperty(name)?.getParameter("tzid");
  return typeof tzid === "string" && tzid ? tzid : null;
}

function toInstant(time: ICAL.Time, timeZone: string, declaredTzid: string | null): Date | null {
  try {
    if (time.isDate) return zonedWallTimeToUtc(wallFrom(time, true), timeZone);
    if (time.zone.tzid !== "floating") return time.toJSDate();
    if (!declaredTzid) return zonedWallTimeToUtc(wallFrom(time, false), timeZone);
    if (!isValidTimeZone(declaredTzid)) return null;
    return zonedWallTimeToUtc(wallFrom(time, false), declaredTzid);
  } catch {
    return null;
  }
}

function wallFrom(time: ICAL.Time, dateOnly: boolean): WallTime {
  return {
    year: time.year,
    month: time.month,
    day: time.day,
    hour: dateOnly ? 0 : time.hour,
    minute: dateOnly ? 0 : time.minute,
    second: dateOnly ? 0 : time.second,
  };
}

function startOfZonedDay(instant: Date, timeZone: string): Date {
  const { year, month, day } = zonedDateParts(instant, timeZone);
  return zonedWallTimeToUtc({ year, month, day, hour: 0, minute: 0, second: 0 }, timeZone);
}

function zonedDayAfterMonths(instant: Date, timeZone: string, months: number): Date {
  const { year, month, day } = zonedDateParts(instant, timeZone);
  const shifted = new Date(Date.UTC(year, month - 1 + months, day));
  return zonedWallTimeToUtc({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  }, timeZone);
}

function zonedDateParts(instant: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

function zonedWallTimeToUtc(wall: WallTime, timeZone: string): Date {
  const utcMillis = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const offset = zoneOffset(utcMillis, timeZone);
  let corrected = utcMillis - offset;
  const second = zoneOffset(corrected, timeZone);
  if (second !== offset) corrected = utcMillis - second;
  return new Date(corrected);
}

function zoneOffset(utcMillis: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMillis));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second));
  return asUtc - utcMillis;
}
