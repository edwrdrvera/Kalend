import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseIcs, type ImportedEvent } from "@/lib/api/ics-import";
import { ICS_NOT_CALENDAR_MESSAGE, ICS_TIME_ZONE_MESSAGE, ICS_TOO_MANY_MESSAGE } from "@/lib/ics-limits";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/description";
import { MAX_TITLE_LENGTH } from "@/lib/title";
import { isMultiDayEvent, layoutAllDayEvents } from "@/lib/time-grid-layout";
import type { CalendarEvent } from "@/lib/calendar-types";

const NOW = new Date("2026-10-13T15:00:00.000Z");
const TZ = "America/Chicago";

const fixture = (name: string) => readFileSync(join(import.meta.dir, "fixtures", name), "utf8");

function parsed(name: string, tz = TZ, now = NOW) {
  const result = parseIcs(fixture(name), { now, tz });
  if ("error" in result) throw new Error(result.error);
  return result;
}

function byUid(events: ImportedEvent[], uid: string) {
  return events.filter((event) => event.importUid === uid);
}

describe("parseIcs", () => {
  it("reads a Canvas export in UTC", () => {
    const { events, skipped } = parsed("canvas.ics", "UTC");
    expect(skipped).toBe(0);
    expect(events.map((event) => event.title).sort()).toEqual(["CS 101 Lecture", "Office hours"]);
    const lecture = events.find((event) => event.importUid === "canvas-cs101@instructure.com");
    expect(lecture).toMatchObject({
      startAt: new Date("2026-10-13T15:00:00.000Z"),
      endAt: new Date("2026-10-13T16:15:00.000Z"),
      location: "Main Hall 201",
      description: "Bring the textbook",
      importOccurrence: "",
    });
  });

  it("reads a Google export using the file's time zone, including the day clocks change", () => {
    const { events } = parsed("google.ics", "UTC");
    const review = events.find((event) => event.importUid === "design-review@google.com");
    const after = events.find((event) => event.importUid === "after-fallback@google.com");
    expect(review).toMatchObject({
      title: "Design review for the fall studio",
      startAt: new Date("2026-10-13T16:00:00.000Z"),
      endAt: new Date("2026-10-13T17:00:00.000Z"),
    });
    expect(after).toMatchObject({
      startAt: new Date("2026-11-01T18:30:00.000Z"),
      endAt: new Date("2026-11-01T19:30:00.000Z"),
    });
  });

  it("reads a TZID that has no VTIMEZONE block", () => {
    const { events } = parsed("tzid.ics", "UTC");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Eastern seminar",
      startAt: new Date("2026-11-01T15:30:00.000Z"),
      endAt: new Date("2026-11-01T16:30:00.000Z"),
    });
  });

  it("reads a floating time in the zone the browser sent", () => {
    const { events } = parsed("floating.ics");
    expect(events[0]).toMatchObject({
      startAt: new Date("2026-10-13T15:00:00.000Z"),
      endAt: new Date("2026-10-13T16:30:00.000Z"),
    });
  });

  it("turns an all-day date into local midnight through the next local midnight", () => {
    const { events } = parsed("all-day.ics");
    const fall = events.find((event) => event.importUid === "fall-break@school");
    const change = events.find((event) => event.importUid === "clock-change@school");
    expect(fall).toMatchObject({
      startAt: new Date("2026-10-15T05:00:00.000Z"),
      endAt: new Date("2026-10-16T05:00:00.000Z"),
    });
    expect(change).toMatchObject({
      startAt: new Date("2026-11-01T06:00:00.000Z"),
      endAt: new Date("2026-11-02T06:00:00.000Z"),
    });
  });

  it("shows that all-day span on one day of the all-day row", () => {
    const event: CalendarEvent = {
      id: "fall",
      title: "Fall break",
      start_at: new Date(2026, 9, 15).toISOString(),
      end_at: new Date(2026, 9, 16).toISOString(),
      color: "blue",
      color_overridden: false,
      category_id: null,
      group_id: null,
      location: null,
      icon: null,
      description: null,
    };
    expect(isMultiDayEvent(event)).toBe(true);
    expect(layoutAllDayEvents([new Date(2026, 9, 15), new Date(2026, 9, 16)], [event]).map((block) => [block.startCol, block.endCol])).toEqual([[0, 0]]);
  });

  it("expands a weekly event for six months and leaves out skipped dates", () => {
    const { events } = parsed("weekly-exdate.ics", "UTC");
    const studio = byUid(events, "studio@school");
    const windowStart = new Date("2026-10-13T00:00:00.000Z");
    const windowEnd = new Date("2027-04-13T00:00:00.000Z");
    const skipped = "2026-10-20T15:00:00.000Z";
    const expected: string[] = [];
    for (let time = new Date("2026-10-13T15:00:00.000Z"); time < windowEnd; time = new Date(time.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      if (time.toISOString() !== skipped) expected.push(time.toISOString());
    }

    expect(studio.map((event) => event.startAt.toISOString())).toEqual(expected);
    expect(studio.some((event) => event.startAt.toISOString() === skipped)).toBe(false);
    expect(studio.every((event) => event.startAt >= windowStart && event.startAt < windowEnd)).toBe(true);
    expect(studio.every((event) => event.importOccurrence === event.startAt.toISOString())).toBe(true);
    expect(expected.length).toBeGreaterThan(20);
  });

  it("replaces one occurrence when the file gives it a new time", () => {
    const { events } = parsed("recurrence-override.ics", "UTC");
    const studio = byUid(events, "studio@school");
    const moved = studio.filter((event) => event.importOccurrence === "2026-10-27T15:00:00.000Z");
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({
      title: "Studio moved",
      location: "Lab",
      startAt: new Date("2026-10-27T17:00:00.000Z"),
      endAt: new Date("2026-10-27T18:00:00.000Z"),
    });
    expect(studio.some((event) => event.startAt.toISOString() === "2026-10-27T15:00:00.000Z")).toBe(false);
  });

  it("imports a one-off event even when its date is outside the next six months", () => {
    const text = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20200101T150000Z
DTEND:20200101T160000Z
SUMMARY:Old lecture
UID:old@school
END:VEVENT
END:VCALENDAR`;
    const result = parseIcs(text, { now: NOW, tz: "UTC" });
    if ("error" in result) throw new Error(result.error);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].startAt.toISOString()).toBe("2020-01-01T15:00:00.000Z");
  });

  it("names a blank title Untitled and shortens fields that are too long", () => {
    const text = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20261013T150000Z
DTEND:20261013T160000Z
SUMMARY:${"A".repeat(MAX_TITLE_LENGTH + 5)}
LOCATION:${"L".repeat(600)}
DESCRIPTION:${"D".repeat(MAX_DESCRIPTION_LENGTH + 5)}
UID:long@school
END:VEVENT
BEGIN:VEVENT
DTSTART:20261014T150000Z
DTEND:20261014T160000Z
SUMMARY:   
UID:blank@school
END:VEVENT
END:VCALENDAR`;
    const result = parseIcs(text, { now: NOW, tz: "UTC" });
    if ("error" in result) throw new Error(result.error);
    const long = result.events.find((event) => event.importUid === "long@school");
    const blank = result.events.find((event) => event.importUid === "blank@school");
    expect(long?.title).toHaveLength(MAX_TITLE_LENGTH);
    expect(long?.location).toHaveLength(500);
    expect(long?.description).toHaveLength(MAX_DESCRIPTION_LENGTH);
    expect(blank?.title).toBe("Untitled");
  });

  it("skips an event with no start and keeps the rest", () => {
    const { events, skipped } = parsed("missing-start.ics", "UTC");
    expect(skipped).toBe(1);
    expect(events.map((event) => event.title)).toEqual(["Has a start"]);
  });

  it("rejects an empty file and text that is not a calendar", () => {
    expect(parseIcs(fixture("empty.ics"), { now: NOW, tz: TZ })).toEqual({ error: ICS_NOT_CALENDAR_MESSAGE });
    expect(parseIcs(fixture("not-a-calendar.txt"), { now: NOW, tz: TZ })).toEqual({ error: ICS_NOT_CALENDAR_MESSAGE });
  });

  it("rejects a time zone the platform does not know", () => {
    expect(parseIcs(fixture("canvas.ics"), { now: NOW, tz: "Not/AZone" })).toEqual({ error: ICS_TIME_ZONE_MESSAGE });
  });

  it("rejects a repeating event that expands past the event cap", () => {
    expect(parseIcs(fixture("hourly.ics"), { now: NOW, tz: "UTC" })).toEqual({ error: ICS_TOO_MANY_MESSAGE });
  });

  it("parses the same file to the same events the second time", () => {
    expect(parsed("canvas.ics", "UTC")).toEqual(parsed("canvas.ics", "UTC"));
    expect(parsed("weekly-exdate.ics", "UTC")).toEqual(parsed("weekly-exdate.ics", "UTC"));
  });
});
