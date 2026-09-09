import { describe, expect, it } from "bun:test";
import { eventColorReducer, initialEventColor, reconcileDetachedEvents } from "../event-color-state";
import { resolveDisplayColor } from "../event-colors";
import type { CalendarEvent } from "../calendar-types";
import { eventFormPayload } from "../event-form";

const spaces = [
  { id: "space-1", name: "Math", color: "green" },
  { id: "space-2", name: "Physics", color: "purple" },
];
const event: CalendarEvent = {
  id: "event-1", title: "Lecture", start_at: "2026-09-08T10:00:00Z",
  end_at: "2026-09-08T11:00:00Z", color: "blue", category_id: "space-1", color_overridden: false,
};

describe("event editor Space color transitions", () => {
  it("initializes new events from the snapshotted Space without creating a color override", () => {
    expect(initialEventColor(null, "space-1")).toEqual({
      color: "blue",
      categoryId: "space-1",
      colorOverridden: false,
    });
  });

  it("uses saved membership when editing, including an unassigned event", () => {
    expect(initialEventColor({ ...event, category_id: null }, "space-2")).toEqual({
      color: "blue",
      categoryId: null,
      colorOverridden: false,
    });
    expect(initialEventColor(event, "space-2").categoryId).toBe("space-1");
  });

  it("inherits when a Space is assigned to a new or legacy standalone event", () => {
    for (const initial of [initialEventColor(), initialEventColor({ ...event, category_id: null })]) {
      const state = eventColorReducer(initial, { type: "space", categoryId: "space-1", categories: spaces });
      expect(state.colorOverridden).toBe(false);
      expect(resolveDisplayColor(state.color, state.categoryId, state.colorOverridden, spaces)).toBe("green");
    }
  });

  it("inherits live recoloring and changing Spaces without modifying the stored personal color", () => {
    const state = eventColorReducer(initialEventColor(event), { type: "space", categoryId: "space-2", categories: spaces });
    expect(state.color).toBe("blue");
    expect(resolveDisplayColor(state.color, state.categoryId, state.colorOverridden, spaces)).toBe("purple");
    expect(resolveDisplayColor(state.color, state.categoryId, state.colorOverridden, [{ ...spaces[1], color: "red" }])).toBe("red");
  });

  it("keeps an explicit choice across Space changes and editor reopen", () => {
    const picked = eventColorReducer(initialEventColor(event), { type: "pick", color: "orange" });
    const moved = eventColorReducer(picked, { type: "space", categoryId: "space-2", categories: spaces });
    expect(resolveDisplayColor(moved.color, moved.categoryId, moved.colorOverridden, spaces)).toBe("orange");
    expect(initialEventColor({ ...event, color: moved.color, category_id: moved.categoryId, color_overridden: moved.colorOverridden })).toEqual(moved);
  });

  it("treats an explicit choice equal to the Space color as an override", () => {
    const state = eventColorReducer(initialEventColor(event), { type: "pick", color: "green" });
    expect(resolveDisplayColor(state.color, state.categoryId, state.colorOverridden, [{ ...spaces[0], color: "red" }])).toBe("green");
  });

  it("reset restores live inheritance after an explicit choice", () => {
    const picked = eventColorReducer(initialEventColor(event), { type: "pick", color: "orange" });
    const reset = eventColorReducer(picked, { type: "inherit" });
    expect(reset.colorOverridden).toBe(false);
    expect(resolveDisplayColor(reset.color, reset.categoryId, reset.colorOverridden, spaces)).toBe("green");
    expect(resolveDisplayColor(reset.color, reset.categoryId, reset.colorOverridden, [{ ...spaces[0], color: "red" }])).toBe("red");
  });

  it("unlinking preserves inherited visible color, including after reset", () => {
    const reset = eventColorReducer(initialEventColor({ ...event, color: "orange", color_overridden: true }), { type: "inherit" });
    const detached = eventColorReducer(reset, { type: "space", categoryId: null, categories: spaces });
    expect(detached).toEqual({ color: "green", categoryId: null, colorOverridden: false });
    expect(resolveDisplayColor(detached.color, detached.categoryId, detached.colorOverridden, [])).toBe("green");
  });

  it("unlinking an overridden event preserves the personal color and override", () => {
    const detached = eventColorReducer(initialEventColor({ ...event, color: "orange", color_overridden: true }), { type: "space", categoryId: null, categories: spaces });
    expect(detached).toEqual({ color: "orange", categoryId: null, colorOverridden: true });
  });

  it("sends explicit override, reset, and unlink intent through the shared create/edit payload", () => {
    const picked = eventColorReducer(initialEventColor(event), { type: "pick", color: "orange" });
    const reset = eventColorReducer(picked, { type: "inherit" });
    const detached = eventColorReducer(reset, { type: "space", categoryId: null, categories: spaces });
    const payload = (state: typeof picked) => JSON.parse(JSON.stringify(eventFormPayload({
      ...state, title: event.title, startAt: event.start_at, endAt: event.end_at,
    })));
    expect(payload(picked)).toMatchObject({ color: "orange", color_overridden: true, category_id: "space-1" });
    expect(payload(reset)).toMatchObject({ color_overridden: false, category_id: "space-1" });
    expect(payload(detached)).toMatchObject({ color: "green", color_overridden: false, category_id: null });
  });
});

describe("Space deletion response reconciliation", () => {
  it("uses saved color fields without overwriting unrelated edits or resurrecting deleted events", () => {
    const other = { ...event, id: "event-other" };
    const current = { ...event, title: "Updated title", start_at: "2026-09-08T10:30:00Z" };
    const detached = { ...event, color: "green", category_id: null };
    const result = reconcileDetachedEvents([current, other], [detached, { ...detached, id: "deleted-event" }], "space-1");
    expect(result).toEqual([{ ...current, color: "green", category_id: null }, other]);
    expect(result[1]).toBe(other);
  });

  it("does not detach an event already moved to another Space", () => {
    const reassigned = { ...event, category_id: "space-2", color: "orange", color_overridden: true };
    const result = reconcileDetachedEvents([reassigned], [{ ...event, category_id: null, color: "green" }], "space-1");
    expect(result[0]).toBe(reassigned);
  });
});
