import { describe, expect, it } from "bun:test";
import { buildSidebarAgenda, summarizeSidebarAgenda, taskDueLabel } from "../sidebar-agenda";
import type { CalendarEvent, CalendarTask } from "../calendar-types";

const at = (day: number, hour: number) => new Date(2030, 8, day, hour).toISOString();

function event(
  id: string,
  title: string,
  startAt: string,
  endAt: string
): CalendarEvent {
  return {
    id,
    title,
    start_at: startAt,
    end_at: endAt,
    color: "blue",
    color_overridden: true,
    category_id: null,
  };
}

function task(id: string, title: string, dueAt: string | null, completed = false): CalendarTask {
  return {
    id,
    title,
    due_at: dueAt,
    completed,
    color: "blue",
    color_overridden: true,
    category_id: null,
  };
}

describe("buildSidebarAgenda", () => {
  it("shows the selected day and orders all-day events, timed events, then tasks", () => {
    const sections = buildSidebarAgenda(
      [
        event("late", "Afternoon seminar", at(9, 14), at(9, 15)),
        event("spanning", "Conference", at(9, 0), at(10, 0)),
        event("early", "Biology lecture", at(9, 9), at(9, 10)),
      ],
      [
        task("done", "Read chapter", at(9, 23), true),
        task("open", "Finish report", at(9, 23)),
      ],
      new Date(2030, 8, 9)
    );

    expect(sections[0].heading).toBe("Monday, September 9");
    expect(
      sections[0].items.map((item) =>
        item.kind === "event" ? item.event.id : item.task.id
      )
    ).toEqual(["spanning", "early", "late", "open", "done"]);
  });

  it("omits other dates while retaining undated tasks in the selected-day snapshot", () => {
    const sections = buildSidebarAgenda(
      [event("later", "Later", at(11, 9), at(11, 10))],
      [task("earlier", "Earlier", at(8, 23)), task("undated", "Someday", null)],
      new Date(2030, 8, 9)
    );

    expect(sections.map((section) => section.heading)).toEqual(["Monday, September 9"]);
    expect(sections[0].items.map((item) => item.kind)).toEqual(["task"]);
    expect(sections[0].items[0]).toMatchObject({ task: { id: "undated" } });
  });

  it("includes a multi-day event when it overlaps the selected day", () => {
    const sections = buildSidebarAgenda(
      [event("spanning", "Conference", at(8, 9), at(10, 17))],
      [],
      new Date(2030, 8, 9)
    );

    expect(sections[0].items).toMatchObject([
      { kind: "event", allDay: true, event: { id: "spanning" } },
    ]);
  });
});

describe("taskDueLabel", () => {
  it("distinguishes overdue, today, future, and undated tasks", () => {
    const now = new Date(2030, 8, 9, 12);

    expect(taskDueLabel(task("past", "Past", at(8, 23)), now)).toEqual({
      label: "Overdue",
      overdue: true,
      dueToday: false,
    });
    expect(taskDueLabel(task("today", "Today", at(9, 23)), now)).toEqual({
      label: "Due today",
      overdue: false,
      dueToday: true,
    });
    expect(taskDueLabel(task("future", "Future", at(10, 23)), now)).toEqual({
      label: "Due",
      overdue: false,
      dueToday: false,
    });
    expect(taskDueLabel(task("none", "None", null), now)).toEqual({
      label: "No due date",
      overdue: false,
      dueToday: false,
    });
  });
});

describe("summarizeSidebarAgenda", () => {
  it("counts visible events and incomplete tasks while reporting overdue tasks globally", () => {
    const tasks = [
      task("overdue", "Overdue", at(8, 23)),
      task("today", "Today", at(9, 23)),
      task("done", "Done", at(9, 23), true),
    ];
    const sections = buildSidebarAgenda(
      [event("event", "Lecture", at(9, 9), at(9, 10))],
      tasks,
      new Date(2030, 8, 9)
    );

    expect(summarizeSidebarAgenda(sections, tasks, new Date(2030, 8, 9, 12))).toEqual({
      activeItemCount: 2,
      overdueTaskCount: 1,
    });
  });
});
