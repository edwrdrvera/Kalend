import { describe, expect, it, mock } from "bun:test";
import { renderHook } from "@/test-utils/render-hook";
import { useEventEditor } from "@/hooks/useEventEditor";
import type { CalendarEvent } from "@/lib/calendar-types";
import type { EventFormValues } from "@/lib/event-form";

const EVENT: CalendarEvent = {
  id: "e1",
  title: "Lecture",
  start_at: "2026-09-21T10:00:00Z",
  end_at: "2026-09-21T11:00:00Z",
  color: null,
  color_overridden: false,
  category_id: "space-1",
  group_id: null,
  location: null,
  icon: null,
  description: null,
};
const VALUES: EventFormValues = {
  title: "Lecture",
  startAt: EVENT.start_at,
  endAt: EVENT.end_at,
  color: "blue",
  colorOverridden: false,
  categoryId: "space-1",
  groupId: null,
  location: null,
  icon: null,
  description: null,
};
const rect = { x: 0, y: 0, width: 10, height: 10 } as DOMRect;

async function setup(createEvent: ReturnType<typeof mock> = mock(async () => EVENT)) {
  const events = { createEvent };
  const onOpenCreated = mock((_event: CalendarEvent) => {});
  const hook = renderHook(() => useEventEditor(events, "space-9", { current: null }, onOpenCreated));
  await hook.act(() => {});
  return { events, onOpenCreated, ...hook };
}

describe("useEventEditor", () => {
  it("opens a create target in the focused Space, and each open bumps the key", async () => {
    const { result, act } = await setup();
    await act(() => result.current.openCreate(new Date("2026-09-21T09:00:00Z"), rect));
    expect(result.current.target?.initialSpaceId).toBe("space-9");
    const first = result.current.key;
    await act(() => result.current.openCreate(new Date("2026-09-21T09:00:00Z"), rect));
    expect(result.current.key).toBe(first + 1);
  });

  it("keeps the drag range until close, then clears both", async () => {
    const { result, act } = await setup();
    const start = new Date("2026-09-21T09:00:00Z");
    const end = new Date("2026-09-21T10:00:00Z");
    await act(() => result.current.openCreateRange(start, end, rect));
    expect(result.current.pendingRange).toEqual({ start, end });
    await act(() => result.current.close());
    expect(result.current.target).toBeNull();
    expect(result.current.pendingRange).toBeNull();
  });

  it("submitting creates the event and closes", async () => {
    const { result, act, events } = await setup();
    await act(() => result.current.openCreate(new Date(), rect));
    await act(() => result.current.submit(VALUES));
    expect(events.createEvent).toHaveBeenCalledWith(VALUES);
    expect(result.current.target).toBeNull();
  });

  it("submitting with openDetails hands the saved event to the panel", async () => {
    const { result, act, onOpenCreated } = await setup();
    await act(() => result.current.openCreate(new Date(), rect));
    await act(() => result.current.submit(VALUES, true));
    expect(onOpenCreated).toHaveBeenCalledWith(EVENT);
    expect(result.current.target).toBeNull();
  });

  it("a plain submit does not open the panel", async () => {
    const { result, act, onOpenCreated } = await setup();
    await act(() => result.current.openCreate(new Date(), rect));
    await act(() => result.current.submit(VALUES));
    expect(onOpenCreated).not.toHaveBeenCalled();
  });

  it("a failed submit keeps the editor open with the error", async () => {
    const { result, act } = await setup(mock(async () => { throw new Error("Title is required"); }));
    await act(() => result.current.openCreate(new Date(), rect));
    await act(() => result.current.submit(VALUES));
    expect(result.current.error).toBe("Title is required");
    expect(result.current.submitting).toBe(false);
    expect(result.current.target).not.toBeNull();
  });
});
