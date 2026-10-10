import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { CalendarEvent } from "@/lib/calendar-types";
import { isMultiDayEvent, layoutAllDayEvents, layoutDayEvents } from "../time-grid-layout";
import { buildSidebarAgenda } from "../sidebar-agenda";
import { minutesFromMidnight } from "../time-grid-drag-math";

function makeEvent(start: Date, end: Date): CalendarEvent {
  return {
    id: "e",
    title: "Late",
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    color: "blue",
    color_overridden: true,
    category_id: null,
    group_id: null,
    location: null,
    icon: null,
    description: null,
  };
}

describe("an event that ends exactly at midnight", () => {
  const event = () => makeEvent(new Date(2026, 2, 9, 22), new Date(2026, 2, 10, 0));

  it("is not a multi-day event", () => {
    expect(isMultiDayEvent(event())).toBe(false);
  });

  it("gets no all-day bar", () => {
    expect(layoutAllDayEvents([new Date(2026, 2, 9), new Date(2026, 2, 10)], [event()])).toEqual([]);
  });

  it("is not in the sidebar agenda for the next day", () => {
    expect(buildSidebarAgenda([event()], [], new Date(2026, 2, 10))[0].items).toEqual([]);
  });

  it("gets no time-grid block on the next day", () => {
    expect(layoutDayEvents(new Date(2026, 2, 10), [event()])).toEqual([]);
  });

  it("runs to the bottom of its own day's time grid", () => {
    const [block] = layoutDayEvents(new Date(2026, 2, 9), [event()]);
    expect(block.top + block.height).toBeCloseTo(100);
  });
});

describe("a two-day event", () => {
  const event = () => makeEvent(new Date(2026, 2, 9, 10), new Date(2026, 2, 10, 10));

  it("spans both days in the all-day row", () => {
    const blocks = layoutAllDayEvents([new Date(2026, 2, 9), new Date(2026, 2, 10)], [event()]);
    expect(blocks.map((b) => [b.startCol, b.endCol])).toEqual([[0, 1]]);
  });

  it("is listed as all day in the sidebar agenda for the second day", () => {
    const [section] = buildSidebarAgenda([event()], [], new Date(2026, 2, 10));
    expect(section.items).toEqual([{ kind: "event", event: event(), allDay: true }]);
  });
});

describe("time-grid placement on a daylight-saving day", () => {
  // Assigning undefined or deleting TZ leaves Bun on New York, so restore the
  // zone it resolved, or later test files in this process run in New York.
  const originalTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  for (const [label, month, date] of [["spring forward", 2, 8], ["fall back", 10, 1]] as const) {
    it(`draws a 10:00 event on the 10:00 row on ${label} day`, () => {
      const start = new Date(2026, month, date, 10);
      const event = makeEvent(start, new Date(2026, month, date, 11));
      const [block] = layoutDayEvents(new Date(2026, month, date), [event]);
      expect(minutesFromMidnight(start)).toBe(600);
      expect((block.top / 100) * 1440).toBeCloseTo(600);
      expect((block.height / 100) * 1440).toBeCloseTo(60);
    });
  }

  const minutes = (block: { top: number; height: number }) => [
    (block.top / 100) * 1440,
    (block.height / 100) * 1440,
  ];

  it("draws an event inside the repeated hour on fall back day as tall as it lasts", () => {
    const event = makeEvent(new Date("2026-11-01T05:30:00Z"), new Date("2026-11-01T06:30:00Z"));
    const [top, height] = minutes(layoutDayEvents(new Date(2026, 10, 1), [event])[0]);
    expect(top).toBeCloseTo(90);
    expect(height).toBeCloseTo(60);
  });

  it("draws an event across the skipped hour on spring forward day as tall as it lasts", () => {
    const event = makeEvent(new Date("2026-03-08T06:30:00Z"), new Date("2026-03-08T07:30:00Z"));
    const [top, height] = minutes(layoutDayEvents(new Date(2026, 2, 8), [event])[0]);
    expect(top).toBeCloseTo(90);
    expect(height).toBeCloseTo(60);
  });

  it("stops a late event at the bottom of a 25-hour day", () => {
    const event = makeEvent(new Date(2026, 10, 1, 22), new Date(2026, 10, 2, 0));
    const [top, height] = minutes(layoutDayEvents(new Date(2026, 10, 1), [event])[0]);
    expect(top + height).toBeCloseTo(1440);
  });
});
