import { describe, expect, it } from "bun:test";
import type { CalendarEvent } from "../calendar-types";
import { upcomingEventsByDay } from "../space-overview";
import type { PanelSubject } from "../panel-subject";

const NOW = new Date(2026, 9, 1, 12, 0);
const WORK: PanelSubject = { kind: "space", spaceId: "work", name: "Work", color: "blue", description: null };
const WEBSITE: PanelSubject = { kind: "group", groupId: "website", name: "Website", spaceId: "work", spaceName: "Work", color: "blue" };

function event(id: string, start: Date, hours = 1, category_id: string | null = "work"): CalendarEvent {
  return {
    id,
    title: id,
    start_at: start.toISOString(),
    end_at: new Date(start.getTime() + hours * 3_600_000).toISOString(),
    color: null,
    color_overridden: false,
    category_id,
    group_id: null,
    location: null,
    icon: null,
    description: null,
  };
}

const ids = (days: ReturnType<typeof upcomingEventsByDay>) => days.map((d) => d.events.map((e) => e.id));

describe("upcomingEventsByDay", () => {
  it("lists a Group's own events only, and its Space's list includes them once", () => {
    const grouped = { ...event("grouped", new Date(2026, 9, 2, 9)), group_id: "website" };
    const direct = event("direct", new Date(2026, 9, 3, 9));
    const events = [grouped, direct];
    expect(ids(upcomingEventsByDay(events, WEBSITE, NOW))).toEqual([["grouped"]]);
    expect(ids(upcomingEventsByDay(events, WORK, NOW))).toEqual([["grouped"], ["direct"]]);
  });

  it("keeps only this Space's events that have not ended and start within 14 days", () => {
    const days = upcomingEventsByDay(
      [
        event("ended", new Date(2026, 9, 1, 9)),
        event("in-progress", new Date(2026, 9, 1, 11), 2),
        event("other-space", new Date(2026, 9, 2, 9), 1, "school"),
        event("unassigned", new Date(2026, 9, 2, 9), 1, null),
        event("day-14", new Date(2026, 9, 14, 23)),
        event("day-15", new Date(2026, 9, 15, 0)),
      ],
      WORK,
      NOW
    );
    expect(ids(days)).toEqual([["in-progress"], ["day-14"]]);
  });

  it("sorts by start time and groups events that share a start day", () => {
    const days = upcomingEventsByDay(
      [
        event("fri-late", new Date(2026, 9, 3, 18)),
        event("thu", new Date(2026, 9, 2, 9)),
        event("fri-early", new Date(2026, 9, 3, 8)),
      ],
      WORK,
      NOW
    );
    expect(ids(days)).toEqual([["thu"], ["fri-early", "fri-late"]]);
    expect(days[1].day).toEqual(new Date(2026, 9, 3));
  });

  it("caps the list at the 10 earliest events", () => {
    const many = Array.from({ length: 12 }, (_, i) => event(`e${i}`, new Date(2026, 9, 2, i)));
    const flat = ids(upcomingEventsByDay(many.reverse(), WORK, NOW)).flat();
    expect(flat).toEqual(Array.from({ length: 10 }, (_, i) => `e${i}`));
  });

  it("returns no days for a Space with nothing coming up", () => {
    expect(upcomingEventsByDay([], WORK, NOW)).toEqual([]);
  });
});
