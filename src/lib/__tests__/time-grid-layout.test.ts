import { describe, expect, it } from "bun:test";
import { isMultiDayEvent, layoutDayEvents, layoutAllDayEvents } from "../time-grid-layout";
import type { CalendarEvent } from "@/lib/calendar-types";

/** Builds a minimal CalendarEvent stub with only the fields the layout
 *  functions actually read. Keeps tests focused on geometry, not on
 *  filling out unrelated properties. */
function makeEvent(
  start: string,
  end: string,
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent {
  return {
    id: overrides.id ?? "evt-1",
    title: overrides.title ?? "Test",
    start_at: start,
    end_at: end,
    color: overrides.color ?? null,
    color_overridden: overrides.color_overridden ?? false,
    category_id: overrides.category_id ?? null,
    location: overrides.location ?? null,
    icon: overrides.icon ?? null,
  };
}

describe("isMultiDayEvent", () => {
  it("returns false for a same-day event", () => {
    const event = makeEvent("2026-08-20T09:00:00", "2026-08-20T10:00:00");
    expect(isMultiDayEvent(event)).toBe(false);
  });

  it("returns true for a cross-midnight event", () => {
    const event = makeEvent("2026-08-20T22:00:00", "2026-08-21T01:00:00");
    expect(isMultiDayEvent(event)).toBe(true);
  });
});

const DAY = new Date("2026-08-20");

describe("layoutDayEvents", () => {
  it("returns an empty array when there are no events", () => {
    expect(layoutDayEvents(DAY, [])).toEqual([]);
  });

  it("positions a single event with correct top/height and full width", () => {
    const event = makeEvent("2026-08-20T09:00:00", "2026-08-20T10:00:00");
    const [block] = layoutDayEvents(DAY, [event]);

    expect(block.event).toBe(event);
    expect(block.top).toBeCloseTo(37.5);        // 540 / 1440 * 100
    expect(block.height).toBeCloseTo(4.1667, 3); // 60 / 1440 * 100
    expect(block.left).toBe(0);
    expect(block.width).toBe(100);
  });

  it("gives two non-overlapping events full width each", () => {
    const a = makeEvent("2026-08-20T09:00:00", "2026-08-20T10:00:00", { id: "a" });
    const b = makeEvent("2026-08-20T14:00:00", "2026-08-20T15:00:00", { id: "b" });
    const blocks = layoutDayEvents(DAY, [a, b]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].width).toBe(100);
    expect(blocks[1].width).toBe(100);
  });

  it("places two overlapping events in side-by-side columns at 50% width", () => {
    const a = makeEvent("2026-08-20T09:00:00", "2026-08-20T11:00:00", { id: "a" });
    const b = makeEvent("2026-08-20T10:00:00", "2026-08-20T12:00:00", { id: "b" });
    const blocks = layoutDayEvents(DAY, [a, b]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].width).toBe(50);
    expect(blocks[1].width).toBe(50);
    // Different columns
    expect(blocks[0].left).not.toBe(blocks[1].left);
  });

  it("places three overlapping events in three columns at ~33% width", () => {
    const a = makeEvent("2026-08-20T09:00:00", "2026-08-20T11:00:00", { id: "a" });
    const b = makeEvent("2026-08-20T09:30:00", "2026-08-20T11:30:00", { id: "b" });
    const c = makeEvent("2026-08-20T10:00:00", "2026-08-20T12:00:00", { id: "c" });
    const blocks = layoutDayEvents(DAY, [a, b, c]);

    expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      expect(block.width).toBeCloseTo(100 / 3, 3);
    }
    // All in distinct columns
    const lefts = new Set(blocks.map((b) => b.left));
    expect(lefts.size).toBe(3);
  });

  it("does not cluster back-to-back events whose boundaries touch exactly", () => {
    const a = makeEvent("2026-08-20T09:00:00", "2026-08-20T10:00:00", { id: "a" });
    const b = makeEvent("2026-08-20T10:00:00", "2026-08-20T11:00:00", { id: "b" });
    const blocks = layoutDayEvents(DAY, [a, b]);

    expect(blocks).toHaveLength(2);
    // Each in its own cluster → full width
    expect(blocks[0].width).toBe(100);
    expect(blocks[1].width).toBe(100);
  });

  it("assigns identical time windows to separate columns deterministically", () => {
    const a = makeEvent("2026-08-20T10:00:00", "2026-08-20T11:00:00", { id: "a" });
    const b = makeEvent("2026-08-20T10:00:00", "2026-08-20T11:00:00", { id: "b" });
    const blocks = layoutDayEvents(DAY, [a, b]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].width).toBe(50);
    expect(blocks[1].width).toBe(50);
    expect(blocks[0].left).toBe(0);
    expect(blocks[1].left).toBe(50);
  });

  it("clamps an event spanning midnight to the day boundaries", () => {
    const event = makeEvent("2026-08-20T22:00:00", "2026-08-21T02:00:00");
    const [block] = layoutDayEvents(DAY, [event]);

    // Starts at 22:00 = minute 1320
    expect(block.top).toBeCloseTo((1320 / 1440) * 100, 3);
    // Clamped to end of day (~minute 1440), so height covers the rest
    expect(block.height).toBeCloseTo(((1440 - 1320) / 1440) * 100, 0);
    expect(block.width).toBe(100);
  });

  it("enforces a minimum height for a zero-duration event", () => {
    const event = makeEvent("2026-08-20T12:00:00", "2026-08-20T12:00:00");
    const [block] = layoutDayEvents(DAY, [event]);

    // Min block height = 15 minutes / 1440 minutes * 100
    expect(block.height).toBeCloseTo((15 / 1440) * 100, 3);
  });

  it("filters out an event entirely outside the day", () => {
    const event = makeEvent("2026-08-19T09:00:00", "2026-08-19T10:00:00");
    expect(layoutDayEvents(DAY, [event])).toEqual([]);
  });
});

// A week of days for layoutAllDayEvents tests
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(`2026-08-${17 + i}`));

describe("layoutAllDayEvents", () => {
  it("returns an empty array when there are no events", () => {
    expect(layoutAllDayEvents(WEEK, [])).toEqual([]);
  });

  it("positions a single multi-day event with correct columns and lane 0", () => {
    // WEEK is Aug 17–23; event spans Aug 19–21
    const event = makeEvent("2026-08-19T09:00:00", "2026-08-21T17:00:00");
    const [block] = layoutAllDayEvents(WEEK, [event]);

    expect(block.event).toBe(event);
    expect(block.startCol).toBe(2);  // Aug 19 is index 2 in the week
    expect(block.endCol).toBe(4);    // Aug 21 is index 4
    expect(block.lane).toBe(0);
  });

  it("stacks two overlapping multi-day events into separate lanes", () => {
    const a = makeEvent("2026-08-18T09:00:00", "2026-08-20T17:00:00", { id: "a" });
    const b = makeEvent("2026-08-19T09:00:00", "2026-08-21T17:00:00", { id: "b" });
    const blocks = layoutAllDayEvents(WEEK, [a, b]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].lane).toBe(0);
    expect(blocks[1].lane).toBe(1);
  });

  it("clamps an event that starts before the visible range", () => {
    // Starts Aug 15, ends Aug 19 — but WEEK starts Aug 17
    const event = makeEvent("2026-08-15T09:00:00", "2026-08-19T17:00:00");
    const [block] = layoutAllDayEvents(WEEK, [event]);

    expect(block.startCol).toBe(0);  // clamped to week start
    expect(block.endCol).toBe(2);    // Aug 19 is index 2
  });

  it("filters out a single-day event", () => {
    const event = makeEvent("2026-08-20T09:00:00", "2026-08-20T17:00:00");
    expect(layoutAllDayEvents(WEEK, [event])).toEqual([]);
  });

  it("returns an empty array when the days array is empty", () => {
    const event = makeEvent("2026-08-19T09:00:00", "2026-08-21T17:00:00");
    expect(layoutAllDayEvents([], [event])).toEqual([]);
  });
});
