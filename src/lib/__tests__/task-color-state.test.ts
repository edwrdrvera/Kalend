import { describe, expect, it } from "bun:test";
import type { CalendarTask } from "../calendar-types";
import { reconcileDetachedTasks } from "../task-color-state";

const task: CalendarTask = {
  id: "task-1",
  title: "Problem set",
  due_at: "2026-09-08T12:00:00Z",
  completed: false,
  color: "blue",
  color_overridden: false,
  category_id: "space-1",
};

describe("Space deletion task reconciliation", () => {
  it("merges saved color fields while preserving concurrent task edits", () => {
    const current = {
      ...task,
      title: "Updated problem set",
      due_at: "2026-09-09T12:00:00Z",
      completed: true,
    };
    const detached = {
      ...task,
      category_id: null,
      color: "green",
      color_overridden: false,
    };

    expect(reconcileDetachedTasks([current], [detached], "space-1")).toEqual([{
      ...current,
      category_id: null,
      color: "green",
      color_overridden: false,
    }]);
  });

  it("preserves an explicit color override returned by the server", () => {
    const detached = {
      ...task,
      category_id: null,
      color: "red",
      color_overridden: true,
    };

    expect(reconcileDetachedTasks([task], [detached], "space-1")[0]).toMatchObject({
      category_id: null,
      color: "red",
      color_overridden: true,
    });
  });

  it("does not resurrect deleted tasks or detach a task moved to another Space", () => {
    const reassigned = { ...task, category_id: "space-2" };
    const detached = { ...task, category_id: null, color: "green" };

    const result = reconcileDetachedTasks(
      [reassigned],
      [detached, { ...detached, id: "deleted-task" }],
      "space-1"
    );

    expect(result).toEqual([reassigned]);
    expect(result[0]).toBe(reassigned);
  });
});
