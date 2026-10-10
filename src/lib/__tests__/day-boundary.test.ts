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
  const originalTz = process.env.TZ;
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
    });
  }
});
