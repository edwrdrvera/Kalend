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
    expect(result.current.submitting).toBe(false);
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

  it("a slow create that finishes after the user opened another slot leaves that editor open", async () => {
    const pending = Promise.withResolvers<CalendarEvent>();
    const { result, act, onOpenCreated } = await setup(mock(() => pending.promise));
    await act(() => result.current.openCreate(new Date("2026-10-01T09:00:00Z"), rect));
    let submitted!: Promise<void>;
    await act(() => {
      submitted = result.current.submit(VALUES, true);
    });
    const second = new Date("2026-10-02T09:00:00Z");
    await act(() => result.current.openCreate(second, rect));
    pending.resolve(EVENT);
    await act(() => submitted);
    expect(result.current.target?.start).toEqual(second);
    expect(result.current.submitting).toBe(false);
    expect(onOpenCreated).not.toHaveBeenCalled();
  });

  it("a slow create that fails after the user opened another slot keeps its error off that editor", async () => {
    const pending = Promise.withResolvers<CalendarEvent>();
    const { result, act } = await setup(mock(() => pending.promise));
    await act(() => result.current.openCreate(new Date("2026-10-01T09:00:00Z"), rect));
    let submitted!: Promise<void>;
    await act(() => {
      submitted = result.current.submit(VALUES);
    });
    await act(() => result.current.openCreate(new Date("2026-10-02T09:00:00Z"), rect));
    pending.reject(new Error("Network down"));
    await act(() => submitted);
    expect(result.current.target).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("a second submit while the first is in flight sends one create", async () => {
    const pending = Promise.withResolvers<CalendarEvent>();
    const { result, act, events } = await setup(mock(() => pending.promise));
    await act(() => result.current.openCreate(new Date(), rect));
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(() => {
      first = result.current.submit(VALUES);
      second = result.current.submit(VALUES);
    });
    pending.resolve(EVENT);
    await act(async () => {
      await Promise.all([first, second]);
    });
    expect(events.createEvent).toHaveBeenCalledTimes(1);
    expect(result.current.target).toBeNull();
  });

  it("a create that finishes after the user cancelled does not open the panel", async () => {
    const pending = Promise.withResolvers<CalendarEvent>();
    const { result, act, events, onOpenCreated } = await setup(mock(() => pending.promise));
    await act(() => result.current.openCreate(new Date(), rect));
    let submitted!: Promise<void>;
    await act(() => {
      submitted = result.current.submit(VALUES, true);
    });
    await act(() => result.current.close());
    pending.resolve(EVENT);
    await act(() => submitted);
    expect(events.createEvent).toHaveBeenCalledTimes(1);
    expect(result.current.target).toBeNull();
    expect(result.current.submitting).toBe(false);
    expect(onOpenCreated).not.toHaveBeenCalled();
  });
});
