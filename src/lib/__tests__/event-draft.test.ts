import { describe, expect, it } from "bun:test";
import type { CalendarEvent } from "../calendar-types";
import { draftFromEvent, eventDraftValues, isEventDraftDirty } from "../event-draft";

const EVENT: CalendarEvent = {
  id: "event-1",
  title: "Standup",
  start_at: "2026-09-09T14:00:00.000Z",
  end_at: "2026-09-09T15:00:00.000Z",
  color: "blue",
  color_overridden: false,
  category_id: null,
  location: null,
  icon: null,
};

describe("event draft", () => {
  it("a fresh draft is clean, and whitespace-only edits stay clean", () => {
    const draft = draftFromEvent(EVENT);
    expect(isEventDraftDirty(EVENT, draft)).toBe(false);
    expect(isEventDraftDirty(EVENT, { ...draft, title: " Standup ", location: "  " })).toBe(false);
  });

  it("a changed time or Space makes the draft dirty", () => {
    const draft = draftFromEvent(EVENT);
    expect(isEventDraftDirty(EVENT, { ...draft, endAt: "2099-01-01T10:00" })).toBe(true);
    expect(
      isEventDraftDirty(EVENT, { ...draft, colorState: { ...draft.colorState, categoryId: "space-1" } })
    ).toBe(true);
  });

  it("rejects a blank title and an end before the start", () => {
    const draft = draftFromEvent(EVENT);
    expect(eventDraftValues({ ...draft, title: " " }).error).toBe("Add a title before saving.");
    expect(eventDraftValues({ ...draft, endAt: draft.startAt }).error).toBe("Start must be before end.");
  });

  it("round-trips an unchanged event to its saved values", () => {
    expect(eventDraftValues(draftFromEvent(EVENT)).values).toEqual({
      title: "Standup",
      startAt: EVENT.start_at,
      endAt: EVENT.end_at,
      color: "blue",
      colorOverridden: false,
      categoryId: null,
      location: null,
      icon: null,
    });
  });
});
