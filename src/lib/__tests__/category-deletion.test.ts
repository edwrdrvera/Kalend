import { describe, expect, it } from "bun:test";
import {
  beginCategoryDeletion,
  finishCategoryDeletion,
  isCompletedCategoryDeletion,
} from "../category-deletion";
import type { CategoryDeleteApiResponse } from "../calendar-types";

const response: CategoryDeleteApiResponse = {
  success: true,
  data: { id: "space-1", name: "Math", color: "green" },
  events: [{
    id: "event-1",
    title: "Lecture",
    start_at: "2026-09-08T10:00:00Z",
    end_at: "2026-09-08T11:00:00Z",
    color: "green",
    color_overridden: false,
    category_id: null,
    location: null,
    icon: null,
  }],
  tasks: [{
    id: "task-1",
    title: "Problem set",
    due_at: "2026-09-08T12:00:00Z",
    completed: false,
    color: "green",
    color_overridden: false,
    category_id: null,
  }],
};

describe("category deletion coordination", () => {
  it("marks a deletion pending and ignores a duplicate request until it finishes", () => {
    const pending = new Set<string>();

    expect(beginCategoryDeletion(pending, "space-1")).toBe(true);
    expect(beginCategoryDeletion(pending, "space-1")).toBe(false);
    expect(pending).toEqual(new Set(["space-1"]));

    finishCategoryDeletion(pending, "space-1");
    expect(beginCategoryDeletion(pending, "space-1")).toBe(true);
  });

  it("accepts a successful deletion with detached events and tasks", () => {
    expect(isCompletedCategoryDeletion(response)).toBe(true);
    if (isCompletedCategoryDeletion(response)) {
      expect(response.events).toHaveLength(1);
      expect(response.tasks).toHaveLength(1);
      expect(response.data.id).toBe("space-1");
    }
  });

  it("accepts a successful deletion with no linked items", () => {
    expect(isCompletedCategoryDeletion({ ...response, events: [], tasks: [] })).toBe(true);
  });

  it("rejects responses missing either detached array", () => {
    expect(isCompletedCategoryDeletion({ ...response, events: undefined })).toBe(false);
    expect(isCompletedCategoryDeletion({ ...response, tasks: undefined })).toBe(false);
  });

  it("releases pending state after an incomplete response", () => {
    const pending = new Set<string>();
    beginCategoryDeletion(pending, "space-1");

    expect(isCompletedCategoryDeletion({ success: true, data: response.data })).toBe(false);
    finishCategoryDeletion(pending, "space-1");
    expect(pending.has("space-1")).toBe(false);
  });
});
