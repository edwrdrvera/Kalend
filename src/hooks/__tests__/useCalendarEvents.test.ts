import { afterEach, describe, expect, it } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import type { CalendarEvent } from "@/lib/calendar-types";
import type { EventFormValues } from "@/lib/event-form";
import { holdRequests } from "./controlled-fetch";

const { useCalendarEvents } = await import("../useCalendarEvents");

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const VIEW = new Date(2026, 9, 1);

const event = (id: string, start_at = "2026-10-01T10:00:00.000Z"): CalendarEvent => ({
  id,
  title: id,
  start_at,
  end_at: "2026-10-01T11:00:00.000Z",
  color: null,
  color_overridden: false,
  category_id: null,
  group_id: null,
  location: null,
  icon: null,
  description: null,
});

const VALUES: EventFormValues = {
  title: "new",
  startAt: "2026-10-01T10:00:00.000Z",
  endAt: "2026-10-01T11:00:00.000Z",
  color: "blue",
  colorOverridden: false,
  categoryId: null,
  groupId: null,
  location: null,
  icon: null,
  description: null,
};

describe("useCalendarEvents", () => {
  it("keeps an event created while an older list load is still in flight", async () => {
    const requests = holdRequests();
    const { result, act, unmount } = renderHook(() => useCalendarEvents(VIEW));
    await act(() => {});
    const load = requests[0];

    let created!: Promise<CalendarEvent>;
    await act(() => {
      created = result.current.createEvent(VALUES);
    });
    requests[1].respond({ success: true, data: event("new") });
    await act(async () => {
      await created;
    });

    load.respond({ success: true, data: [] });
    await act(() => {});

    expect(result.current.data.map((e) => e.id)).toEqual(["new"]);
    unmount();
  });

  it("keeps a moved event at its new time when an older list load lands after the move", async () => {
    const requests = holdRequests();
    const { result, act, unmount } = renderHook(() => useCalendarEvents(VIEW));
    await act(() => {});
    requests[0].respond({ success: true, data: [event("a")] });
    await act(() => {});

    await act(() => result.current.retry());
    const reload = requests[1];

    const moved = "2026-10-01T15:00:00.000Z";
    let move!: Promise<void>;
    await act(() => {
      move = result.current.changeEventTime(
        result.current.data[0],
        new Date(moved),
        new Date("2026-10-01T16:00:00.000Z")
      );
    });
    requests[2].respond({ success: true, data: event("a", moved) });
    await act(async () => {
      await move;
    });

    reload.respond({ success: true, data: [event("a")] });
    await act(() => {});

    expect(result.current.data[0].start_at).toBe(moved);
    unmount();
  });
});
