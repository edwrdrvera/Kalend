import { describe, expect, it } from "bun:test";
import { DIMMED_ITEM_CLASS, dimClass, isEmphasized, initialSpaceFocus, spaceFocusReducer } from "../space-focus";

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
  it("starts in All Spaces with every item at full strength", () => {
    expect(initialSpaceFocus.selectedSpaceId).toBeNull();
    for (const item of [...items, ...tasks]) {
      expect(isEmphasized(item, initialSpaceFocus)).toBe(true);
    }
  });

  it("emphasizes only the selected Space's Events and Tasks, dated or undated", () => {
    const focus = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    expect(items.map((item) => isEmphasized(item, focus))).toEqual([true, false, false]);
    expect(tasks.map((task) => isEmphasized(task, focus))).toEqual([true, true, false]);
  });

  it("gives the dim class only to items outside the selected Space", () => {
    const focus = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    expect(dimClass(items[0], focus)).toBe("");
    expect(dimClass(items[1], focus)).toBe(DIMMED_ITEM_CLASS);
    expect(dimClass(items[1], initialSpaceFocus)).toBe("");
  });

  it("selecting null returns to All Spaces", () => {
    const selected = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    const all = spaceFocusReducer(selected, { type: "select", spaceId: null });
    expect(all).toEqual(initialSpaceFocus);
    expect(items.every((item) => isEmphasized(item, all))).toBe(true);
  });

  it("deleting the active Space falls back to All Spaces; deleting another leaves selection", () => {
    const selected = spaceFocusReducer(initialSpaceFocus, { type: "select", spaceId: "work" });
    expect(spaceFocusReducer(selected, { type: "deleted", spaceId: "work" }))
      .toEqual({ selectedSpaceId: null });
    expect(spaceFocusReducer(selected, { type: "deleted", spaceId: "personal" }))
      .toEqual({ selectedSpaceId: "work" });
  });
});
