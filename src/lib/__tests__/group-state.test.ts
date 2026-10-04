import { describe, expect, it } from "bun:test";
import { groupsOfSpace, releaseGroup, withoutSpaceGroups } from "../group-state";
import { reconcileDetachedEvents } from "../event-color-state";
import { reconcileDetachedTasks } from "../task-color-state";
import type { CalendarEvent, CalendarGroup, CalendarTask } from "../calendar-types";

const task = (id: string, category_id: string | null, group_id: string | null): CalendarTask => ({
  id, title: id, due_at: null, completed: false, color: "blue", color_overridden: false, category_id, group_id,
});
const event = (id: string, category_id: string | null, group_id: string | null): CalendarEvent => ({
  id, title: id, start_at: "2026-09-08T10:00:00Z", end_at: "2026-09-08T11:00:00Z", color: "blue",
  color_overridden: false, category_id, group_id, location: null, icon: null, description: null,
});
const group = (id: string, category_id: string, name: string): CalendarGroup => ({ id, category_id, name });

describe("releaseGroup", () => {
  it("clears group_id on that Group's items and nothing else about them", () => {
    const before = [task("a", "school", "bio"), task("b", "school", "hist"), task("c", "school", null)];
    const after = releaseGroup(before, "bio");
    expect(after[0]).toEqual({ ...before[0], group_id: null });
    expect(after[1]).toBe(before[1]);
    expect(after[2]).toBe(before[2]);
  });
});

describe("withoutSpaceGroups", () => {
  it("drops the Groups of the deleted Space only", () => {
    const groups = [group("bio", "school", "BIO"), group("web", "work", "Web")];
    expect(withoutSpaceGroups(groups, "school")).toEqual([groups[1]]);
  });
});

describe("groupsOfSpace", () => {
  it("lists a Space's Groups by name, ignoring case", () => {
    const groups = [group("2", "school", "history"), group("1", "school", "Bio"), group("3", "work", "Aaa")];
    expect(groupsOfSpace(groups, "school").map((g) => g.name)).toEqual(["Bio", "history"]);
    expect(groupsOfSpace(groups, null)).toEqual([]);
  });
});

describe("Space deletion merges group_id too", () => {
  it("events", () => {
    const [merged] = reconcileDetachedEvents([event("e", "school", "bio")], [event("e", null, null)], "school");
    expect(merged).toMatchObject({ category_id: null, group_id: null });
  });

  it("tasks", () => {
    const [merged] = reconcileDetachedTasks([task("t", "school", "bio")], [task("t", null, null)], "school");
    expect(merged).toMatchObject({ category_id: null, group_id: null });
  });
});
