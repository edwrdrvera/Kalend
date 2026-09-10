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

  it("exclusively filters both Events and dated/undated Tasks", () => {
    const focus = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    expect(filterBySpace(items, focus)).toEqual([items[0]]);
    expect(filterBySpace(tasks, focus)).toEqual(tasks.slice(0, 2));
  });

  it("unhides only the selected Space and preserves other exclusions on returning to All Spaces", () => {
    const focus = { selectedSpaceId: null, hiddenSpaceIds: ["work", "personal"] };
    expect(filterBySpace(items, focus)).toEqual([items[2]]);
    const selected = spaceFocusReducer(focus, { type: "select", spaceId: "work" });
    expect(selected.hiddenSpaceIds).toEqual(["personal"]);
    expect(filterBySpace(items, selected)).toEqual([items[0]]);
    const all = spaceFocusReducer(selected, { type: "select", spaceId: null });
    expect(all.hiddenSpaceIds).toEqual(["personal"]);
    expect(filterBySpace(items, all)).toEqual([items[0], items[2]]);
  });

  it("hiding the selected Space clears selection; showing it does not select it", () => {
    const selected = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    const hidden = spaceFocusReducer(selected, { type: "toggleVisibility", spaceId: "work" });
    expect(hidden).toEqual({ selectedSpaceId: null, hiddenSpaceIds: ["work"] });
    expect(filterBySpace(items, hidden)).toEqual(items.slice(1));
    expect(spaceFocusReducer(hidden, { type: "toggleVisibility", spaceId: "work" })).toEqual(initialSpaceFocus);
  });

  it("toggling another Space preserves focus", () => {
    const selected = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    expect(spaceFocusReducer(selected, { type: "toggleVisibility", spaceId: "personal" }))
      .toEqual({ selectedSpaceId: "work", hiddenSpaceIds: ["personal"] });
  });

  it("successful deletion clears only matching selection and visibility", () => {
    const focus = { selectedSpaceId: "work", hiddenSpaceIds: ["personal"] };
    expect(spaceFocusReducer(focus, { type: "deleted", spaceId: "work" }))
      .toEqual({ selectedSpaceId: null, hiddenSpaceIds: ["personal"] });
    expect(spaceFocusReducer(focus, { type: "deleted", spaceId: "personal" }))
      .toEqual({ selectedSpaceId: "work", hiddenSpaceIds: [] });
  });
});
