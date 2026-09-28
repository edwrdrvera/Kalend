import { describe, expect, test } from "bun:test";
import { dueAtFromDate } from "@/lib/task-draft";

describe("dueAtFromDate", () => {
  test("lands at 23:59 local time on the chosen day", () => {
    const due = new Date(dueAtFromDate("2026-10-02"));
    expect([due.getFullYear(), due.getMonth(), due.getDate()]).toEqual([2026, 9, 2]);
    expect([due.getHours(), due.getMinutes()]).toEqual([23, 59]);
  });
});
