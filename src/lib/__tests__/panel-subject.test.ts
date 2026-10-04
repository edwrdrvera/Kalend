import { describe, expect, it } from "bun:test";
import { inSubject, resolveSubject, subjectKey, subjectTasks } from "../panel-subject";
import type { CalendarCategory, CalendarGroup, CalendarTask } from "../calendar-types";

const school: CalendarCategory = { id: "school", name: "School", color: "blue", description: "Lecture rooms" };
const work: CalendarCategory = { id: "work", name: "Work", color: "not-a-color", description: null };
const bio: CalendarGroup = { id: "bio", category_id: "school", name: "BIO 102" };
const orphan: CalendarGroup = { id: "orphan", category_id: "gone", name: "Orphan" };

const task = (id: string, category_id: string | null, group_id: string | null, completed = false): CalendarTask => ({
  id, title: id, due_at: null, completed, color: null, color_overridden: false, category_id, group_id,
});

describe("resolveSubject", () => {
  it("resolves a Space with its color and description", () => {
    expect(resolveSubject({ kind: "space", spaceId: "school" }, [school], [bio])).toEqual({
      kind: "space", spaceId: "school", name: "School", color: "blue", description: "Lecture rooms",
    });
  });

  it("falls back to the default color when the Space color is not valid", () => {
    expect(resolveSubject({ kind: "space", spaceId: "work" }, [work], [])).toMatchObject({ color: "blue" });
  });

  it("resolves a Group with its Space's name and color", () => {
    expect(resolveSubject({ kind: "group", groupId: "bio" }, [school], [bio])).toEqual({
      kind: "group", groupId: "bio", name: "BIO 102", spaceId: "school", spaceName: "School", color: "blue",
    });
  });

  it("returns null when the Space or Group is gone", () => {
    expect(resolveSubject({ kind: "space", spaceId: "gone" }, [school], [])).toBeNull();
    expect(resolveSubject({ kind: "group", groupId: "missing" }, [school], [bio])).toBeNull();
    expect(resolveSubject({ kind: "group", groupId: "orphan" }, [school], [orphan])).toBeNull();
  });
});

describe("subjectTasks", () => {
  const space = resolveSubject({ kind: "space", spaceId: "school" }, [school], [bio])!;
  const group = resolveSubject({ kind: "group", groupId: "bio" }, [school], [bio])!;
  const tasks = [
    task("in-group", "school", "bio"),
    task("direct", "school", null),
    task("other-space", "work", null),
    task("unassigned", null, null),
    task("done", "school", "bio", true),
  ];

  it("a Group lists only its own open tasks", () => {
    expect(subjectTasks(group, tasks).map((t) => t.id)).toEqual(["in-group"]);
  });

  it("a Space lists its Groups' tasks and its direct tasks, each once", () => {
    expect(subjectTasks(space, tasks).map((t) => t.id)).toEqual(["in-group", "direct"]);
  });

  it("inSubject answers for any item with a Space and Group", () => {
    expect(inSubject(group, { category_id: "school", group_id: "bio" })).toBe(true);
    expect(inSubject(group, { category_id: "school", group_id: null })).toBe(false);
    expect(inSubject(space, { category_id: "school", group_id: "bio" })).toBe(true);
  });
});

describe("subjectKey", () => {
  it("differs between a Space and a Group", () => {
    const space = resolveSubject({ kind: "space", spaceId: "school" }, [school], [])!;
    const group = resolveSubject({ kind: "group", groupId: "bio" }, [school], [bio])!;
    expect(subjectKey(space)).not.toBe(subjectKey(group));
  });
});
