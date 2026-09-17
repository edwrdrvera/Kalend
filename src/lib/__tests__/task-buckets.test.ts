import { describe, expect, it } from "bun:test";
import { addDays } from "date-fns";
import { bucketTasks, type TaskBucketKey } from "../task-buckets";
import type { CalendarTask } from "@/lib/calendar-types";

const NOW = new Date(2026, 8, 16, 12, 0); // Wed 2026-09-16, noon

function task(overrides: Partial<CalendarTask> = {}): CalendarTask {
  return {
    id: "t",
    title: "Task",
    due_at: null,
    completed: false,
    color: "blue",
    color_overridden: false,
    category_id: null,
    ...overrides,
  };
}

function iso(d: Date): string {
  return d.toISOString();
}

function bucketOf(t: CalendarTask): TaskBucketKey | null {
  const found = bucketTasks([t], NOW).find((b) => b.tasks.length > 0);
  return found?.key ?? null;
}

describe("bucketTasks", () => {
  it("puts tasks with no due date in Unscheduled", () => {
    expect(bucketOf(task({ due_at: null }))).toBe("unscheduled");
  });

  it("puts a task due today in Today, regardless of time of day", () => {
    expect(bucketOf(task({ due_at: iso(new Date(2026, 8, 16, 8, 0)) }))).toBe("today");
    expect(bucketOf(task({ due_at: iso(new Date(2026, 8, 16, 23, 59)) }))).toBe("today");
  });

  it("puts a past, incomplete task in Overdue", () => {
    expect(bucketOf(task({ due_at: iso(new Date(2026, 8, 10)) }))).toBe("overdue");
  });

  it("drops a past task that is completed (no bucket)", () => {
    expect(bucketOf(task({ due_at: iso(new Date(2026, 8, 10)), completed: true }))).toBeNull();
  });

  it("keeps a completed task that is due today in Today", () => {
    expect(bucketOf(task({ due_at: iso(new Date(2026, 8, 16, 9)), completed: true }))).toBe("today");
  });

  it("puts a task due within the next 7 days in This week", () => {
    expect(bucketOf(task({ due_at: iso(addDays(NOW, 3)) }))).toBe("week");
  });

  it("puts a task due later than a week out in This month", () => {
    expect(bucketOf(task({ due_at: iso(addDays(NOW, 20)) }))).toBe("month");
    // Far-future dated tasks still land in the catch-all, never lost.
    expect(bucketOf(task({ due_at: iso(addDays(NOW, 400)) }))).toBe("month");
  });

  it("always returns the five buckets in display order", () => {
    const keys = bucketTasks([], NOW).map((b) => b.key);
    expect(keys).toEqual(["overdue", "today", "week", "month", "unscheduled"]);
  });

  it("gives addable buckets a default due date and Overdue none", () => {
    const buckets = bucketTasks([], NOW);
    const today = buckets.find((b) => b.key === "today")!;
    const overdue = buckets.find((b) => b.key === "overdue")!;
    const unscheduled = buckets.find((b) => b.key === "unscheduled")!;
    expect(today.defaultDue).toBe("2026-09-16");
    expect(today.canAdd).toBe(true);
    expect(overdue.canAdd).toBe(false);
    expect(unscheduled.defaultDue).toBeNull();
  });

  it("sorts dated buckets by soonest due first", () => {
    const later = task({ id: "later", due_at: iso(addDays(NOW, 5)) });
    const sooner = task({ id: "sooner", due_at: iso(addDays(NOW, 2)) });
    const week = bucketTasks([later, sooner], NOW).find((b) => b.key === "week")!;
    expect(week.tasks.map((t) => t.id)).toEqual(["sooner", "later"]);
  });
});
