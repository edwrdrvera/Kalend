import { describe, expect, it } from "bun:test";
import type { CalendarEvent } from "../calendar-types";
import { draftFromEvent, eventDraftValues, isEventDraftDirty, rebaseEventDraft } from "../event-draft";

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

describe("rebaseEventDraft", () => {
  const MOVED: CalendarEvent = {
    ...EVENT,
    start_at: "2026-09-09T16:00:00.000Z",
    end_at: "2026-09-09T17:30:00.000Z",
  };

  it("an unedited draft follows the moved event and stays clean", () => {
    const next = rebaseEventDraft(draftFromEvent(EVENT), EVENT, MOVED);
    expect(next).toEqual(draftFromEvent(MOVED));
    expect(isEventDraftDirty(MOVED, next)).toBe(false);
  });

  it("keeps an edited title and takes the new times", () => {
    const edited = { ...draftFromEvent(EVENT), title: "Retro" };
    const next = rebaseEventDraft(edited, EVENT, MOVED);
    expect(next.title).toBe("Retro");
    expect(next.startAt).toBe(draftFromEvent(MOVED).startAt);
    expect(next.endAt).toBe(draftFromEvent(MOVED).endAt);
    expect(eventDraftValues(next).values?.startAt).toBe(MOVED.start_at);
  });

  it("keeps times the user typed", () => {
    const edited = { ...draftFromEvent(EVENT), startAt: "2026-09-10T08:00" };
    const next = rebaseEventDraft(edited, EVENT, MOVED);
    expect(next.startAt).toBe("2026-09-10T08:00");
    expect(next.endAt).toBe(draftFromEvent(MOVED).endAt);
  });
});

describe("rebaseEventDraft whitespace", () => {
  it("treats a whitespace-only change as unedited, like the dirty check does", () => {
    const moved = { ...EVENT, title: "Renamed elsewhere" };
    const padded = { ...draftFromEvent(EVENT), title: `${EVENT.title} ` };
    expect(rebaseEventDraft(padded, EVENT, moved).title).toBe("Renamed elsewhere");
  });
});
