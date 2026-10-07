import { describe, expect, it } from "bun:test";
import { dueSectionLabel, tasksDueOn } from "../day-agenda";
import type { CalendarTask } from "../calendar-types";

function task(id: string, dueAt: Date | null, completed = false): CalendarTask {
  return {
    id,
    title: id,
    due_at: dueAt ? dueAt.toISOString() : null,
    completed,
    color: "blue",
    color_overridden: true,
    category_id: null,
    group_id: null,
  };
}

const wednesday = new Date(2030, 8, 18, 12);

describe("tasksDueOn", () => {
  it("keeps only tasks due on the selected local day", () => {
    const tasks = [
      task("due-wed", new Date(2030, 8, 18, 17)),
      task("overdue", new Date(2030, 8, 16, 17)),
      task("due-thu", new Date(2030, 8, 19, 9)),
      task("undated", null),
    ];
    expect(tasksDueOn(tasks, wednesday).map((t) => t.id)).toEqual(["due-wed"]);
  });

  it("counts the first and last minute of the local day as that day", () => {
    const tasks = [
      task("midnight", new Date(2030, 8, 18, 0, 0)),
      task("late", new Date(2030, 8, 18, 23, 59)),
      task("next-midnight", new Date(2030, 8, 19, 0, 0)),
    ];
    expect(tasksDueOn(tasks, wednesday).map((t) => t.id)).toEqual(["midnight", "late"]);
  });

  it("lists open tasks before completed ones, each by due time", () => {
    const tasks = [
      task("done-early", new Date(2030, 8, 18, 8), true),
      task("open-late", new Date(2030, 8, 18, 20)),
      task("open-early", new Date(2030, 8, 18, 9)),
    ];
    expect(tasksDueOn(tasks, wednesday).map((t) => t.id)).toEqual([
      "open-early",
      "open-late",
      "done-early",
    ]);
  });
});

describe("dueSectionLabel", () => {
  it("says Due today when the day is today", () => {
    expect(dueSectionLabel(wednesday, new Date(2030, 8, 18, 7))).toBe("Due today");
  });

  it("says Due this day for any other day", () => {
    expect(dueSectionLabel(wednesday, new Date(2030, 8, 17, 7))).toBe("Due this day");
  });
});
