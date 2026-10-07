import { describe, expect, it } from "bun:test";
import type { AlertOffset } from "../alerts";
import type { CalendarEvent } from "../calendar-types";
import {
  draftFromEvent,
  eventDraftValues,
  isEventDraftDirty,
  isEventFieldsDirty,
  rebaseEventDraft,
  type SavedEvent,
} from "../event-draft";

const EVENT: CalendarEvent = {
  id: "event-1",
  title: "Standup",
  start_at: "2026-09-09T14:00:00.000Z",
  end_at: "2026-09-09T15:00:00.000Z",
  color: "blue",
  color_overridden: false,
  category_id: null,
  group_id: null,
  location: null,
  icon: null,
  description: null,
};

const WITH_NOTE: CalendarEvent = { ...EVENT, description: "Bring ID" };

const saved = (event: CalendarEvent, alertOffset: AlertOffset | null = null): SavedEvent => ({
  event,
  alertOffset,
});

describe("event draft", () => {
  it("a fresh draft is clean, and whitespace-only edits stay clean", () => {
    const draft = draftFromEvent(saved(EVENT));
    expect(isEventDraftDirty(saved(EVENT), draft)).toBe(false);
    expect(isEventDraftDirty(saved(EVENT), { ...draft, title: " Standup ", location: "  " })).toBe(false);
  });

  it("a changed time or Space makes the draft dirty", () => {
    const draft = draftFromEvent(saved(EVENT));
    expect(isEventDraftDirty(saved(EVENT), { ...draft, endAt: "2099-01-01T10:00" })).toBe(true);
    expect(
      isEventDraftDirty(saved(EVENT), { ...draft, colorState: { ...draft.colorState, categoryId: "space-1" } })
    ).toBe(true);
  });

  it("rejects a blank title and an end before the start", () => {
    const draft = draftFromEvent(saved(EVENT));
    expect(eventDraftValues({ ...draft, title: " " }).error).toBe("Add a title before saving.");
    expect(eventDraftValues({ ...draft, endAt: draft.startAt }).error).toBe("Start must be before end.");
  });

  it("round-trips an unchanged event to its saved values", () => {
    expect(eventDraftValues(draftFromEvent(saved(EVENT))).values).toEqual({
      title: "Standup",
      startAt: EVENT.start_at,
      endAt: EVENT.end_at,
      color: "blue",
      colorOverridden: false,
      categoryId: null,
      groupId: null,
      location: null,
      icon: null,
      description: null,
    });
  });
});

describe("event draft description", () => {
  it("starts empty for no description and holds the saved text otherwise", () => {
    expect(draftFromEvent(saved(EVENT)).description).toBe("");
    expect(draftFromEvent(saved(WITH_NOTE)).description).toBe("Bring ID");
  });

  it("whitespace-only edits stay clean, real edits and removals are dirty", () => {
    const empty = draftFromEvent(saved(EVENT));
    expect(isEventFieldsDirty(EVENT, { ...empty, description: "  \n" })).toBe(false);
    expect(isEventFieldsDirty(EVENT, { ...empty, description: "Note" })).toBe(true);
    const noted = draftFromEvent(saved(WITH_NOTE));
    expect(isEventFieldsDirty(WITH_NOTE, { ...noted, description: " Bring ID " })).toBe(false);
    expect(isEventFieldsDirty(WITH_NOTE, { ...noted, description: "" })).toBe(true);
  });

  it("saves trimmed text, and null for blank text", () => {
    const draft = draftFromEvent(saved(EVENT));
    expect(eventDraftValues({ ...draft, description: "  Note  " }).values?.description).toBe("Note");
    expect(eventDraftValues({ ...draft, description: "   " }).values?.description).toBeNull();
  });

  it("refuses a description over the limit", () => {
    const draft = draftFromEvent(saved(EVENT));
    expect(eventDraftValues({ ...draft, description: "x".repeat(2000) }).error).toBeNull();
    expect(eventDraftValues({ ...draft, description: "x".repeat(2001) }).error).toContain("too long");
  });

  it("keeps an edited description and follows an unedited one when the event is replaced", () => {
    const edited = { ...draftFromEvent(saved(EVENT)), description: "Mine" };
    expect(rebaseEventDraft(edited, saved(EVENT), saved(WITH_NOTE)).description).toBe("Mine");
    const untouched = draftFromEvent(saved(EVENT));
    expect(rebaseEventDraft(untouched, saved(EVENT), saved(WITH_NOTE)).description).toBe("Bring ID");
  });
});

describe("event draft alert", () => {
  it("starts from the event's stored alert", () => {
    expect(draftFromEvent(saved(EVENT, 15)).alertOffset).toBe(15);
    expect(draftFromEvent(saved(EVENT)).alertOffset).toBeNull();
  });

  it("an alert change alone makes the draft dirty, but not the event's fields", () => {
    const draft = draftFromEvent(saved(EVENT, 15));
    expect(isEventDraftDirty(saved(EVENT, 15), draft)).toBe(false);
    expect(isEventDraftDirty(saved(EVENT, 15), { ...draft, alertOffset: 5 })).toBe(true);
    expect(isEventDraftDirty(saved(EVENT, 15), { ...draft, alertOffset: null })).toBe(true);
    expect(isEventFieldsDirty(EVENT, { ...draft, alertOffset: 5 })).toBe(false);
    expect(isEventFieldsDirty(EVENT, { ...draft, title: "Retro" })).toBe(true);
  });

  it("setting an alert on an event that had none is dirty", () => {
    const draft = draftFromEvent(saved(EVENT));
    expect(isEventDraftDirty(saved(EVENT), { ...draft, alertOffset: 60 })).toBe(true);
  });
});

describe("rebaseEventDraft", () => {
  const MOVED: CalendarEvent = {
    ...EVENT,
    start_at: "2026-09-09T16:00:00.000Z",
    end_at: "2026-09-09T17:30:00.000Z",
  };

  it("an unedited draft follows the moved event and stays clean", () => {
    const next = rebaseEventDraft(draftFromEvent(saved(EVENT)), saved(EVENT), saved(MOVED));
    expect(next).toEqual(draftFromEvent(saved(MOVED)));
    expect(isEventDraftDirty(saved(MOVED), next)).toBe(false);
  });

  it("keeps an edited title and takes the new times", () => {
    const edited = { ...draftFromEvent(saved(EVENT)), title: "Retro" };
    const next = rebaseEventDraft(edited, saved(EVENT), saved(MOVED));
    expect(next.title).toBe("Retro");
    expect(next.startAt).toBe(draftFromEvent(saved(MOVED)).startAt);
    expect(next.endAt).toBe(draftFromEvent(saved(MOVED)).endAt);
    expect(eventDraftValues(next).values?.startAt).toBe(MOVED.start_at);
  });

  it("keeps times the user typed", () => {
    const edited = { ...draftFromEvent(saved(EVENT)), startAt: "2026-09-10T08:00" };
    const next = rebaseEventDraft(edited, saved(EVENT), saved(MOVED));
    expect(next.startAt).toBe("2026-09-10T08:00");
    expect(next.endAt).toBe(draftFromEvent(saved(MOVED)).endAt);
  });

  it("an unedited alert follows the stored alert and stays clean", () => {
    const next = rebaseEventDraft(draftFromEvent(saved(EVENT)), saved(EVENT), saved(EVENT, 15));
    expect(next.alertOffset).toBe(15);
    expect(isEventDraftDirty(saved(EVENT, 15), next)).toBe(false);
  });

  it("keeps an alert the user chose, and it is clean once that alert is stored", () => {
    const edited = { ...draftFromEvent(saved(EVENT)), alertOffset: 5 as const };
    const stillUnsaved = rebaseEventDraft(edited, saved(EVENT), saved(MOVED));
    expect(stillUnsaved.alertOffset).toBe(5);
    expect(isEventDraftDirty(saved(MOVED), stillUnsaved)).toBe(true);

    const afterSave = rebaseEventDraft(stillUnsaved, saved(MOVED), saved(MOVED, 5));
    expect(afterSave.alertOffset).toBe(5);
    expect(isEventDraftDirty(saved(MOVED, 5), afterSave)).toBe(false);
  });

  it("keeps a cleared alert the user chose", () => {
    const cleared = { ...draftFromEvent(saved(EVENT, 15)), alertOffset: null };
    const next = rebaseEventDraft(cleared, saved(EVENT, 15), saved(MOVED, 15));
    expect(next.alertOffset).toBeNull();
  });
});

describe("event draft Group membership", () => {
  const IN_GROUP = { ...EVENT, category_id: "space-1", group_id: "bio" };

  it("saves the Space and the Group, and is dirty only when the Group changes", () => {
    const draft = draftFromEvent(saved(IN_GROUP));
    expect(eventDraftValues(draft).values).toMatchObject({ categoryId: "space-1", groupId: "bio" });
    expect(isEventDraftDirty(saved(IN_GROUP), draft)).toBe(false);
    const left = { ...draft, colorState: { ...draft.colorState, groupId: null } };
    expect(isEventDraftDirty(saved(IN_GROUP), left)).toBe(true);
  });

  it("an unedited draft follows a newly saved Group, and an edited one is kept", () => {
    const moved = { ...IN_GROUP, group_id: "hist" };
    expect(rebaseEventDraft(draftFromEvent(saved(IN_GROUP)), saved(IN_GROUP), saved(moved)).colorState.groupId).toBe("hist");
    const edited = { ...draftFromEvent(saved(IN_GROUP)), colorState: { ...draftFromEvent(saved(IN_GROUP)).colorState, groupId: null } };
    expect(rebaseEventDraft(edited, saved(IN_GROUP), saved(moved)).colorState.groupId).toBeNull();
  });
});

describe("rebaseEventDraft whitespace", () => {
  it("treats a whitespace-only change as unedited, like the dirty check does", () => {
    const moved = { ...EVENT, title: "Renamed elsewhere" };
    const padded = { ...draftFromEvent(saved(EVENT)), title: `${EVENT.title} ` };
    expect(rebaseEventDraft(padded, saved(EVENT), saved(moved)).title).toBe("Renamed elsewhere");
  });
});
