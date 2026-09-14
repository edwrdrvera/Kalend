import { describe, expect, it } from "bun:test";
import { filterBySpace, initialSpaceFocus, spaceFocusReducer } from "../space-focus";

const items = [
  { id: "work-event", category_id: "work" },
  { id: "personal-event", category_id: "personal" },
  { id: "unassigned-event", category_id: null },
];
const tasks = [
  { id: "dated", category_id: "work", due_at: "2026-09-09" },
  { id: "undated", category_id: "work", due_at: null },
  { id: "unassigned-task", category_id: null, due_at: null },
];

describe("Space focus", () => {
  it("starts in All Spaces including unassigned items and undated Tasks", () => {
    expect(initialSpaceFocus.selectedSpaceId).toBeNull();
    expect(filterBySpace(items, initialSpaceFocus)).toEqual(items);
    expect(filterBySpace(tasks, initialSpaceFocus)).toEqual(tasks);
  });

  it("exclusively filters both Events and dated/undated Tasks to the selected Space", () => {
    const focus = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    expect(filterBySpace(items, focus)).toEqual([items[0]]);
    expect(filterBySpace(tasks, focus)).toEqual(tasks.slice(0, 2));
  });

  it("selecting null returns to All Spaces", () => {
    const selected = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    const all = spaceFocusReducer(selected, { type: "select", spaceId: null });
    expect(all).toEqual(initialSpaceFocus);
    expect(filterBySpace(items, all)).toEqual(items);
  });

  it("deleting the active Space falls back to All Spaces; deleting another leaves selection", () => {
    const selected = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    expect(spaceFocusReducer(selected, { type: "deleted", spaceId: "work" }))
      .toEqual({ selectedSpaceId: null });
    expect(spaceFocusReducer(selected, { type: "deleted", spaceId: "personal" }))
      .toEqual({ selectedSpaceId: "work" });
  });
});
