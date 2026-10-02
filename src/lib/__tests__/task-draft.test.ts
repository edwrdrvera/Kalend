import { describe, expect, test } from "bun:test";
import type { AlertOffset } from "@/lib/alerts";
import type { CalendarTask } from "@/lib/calendar-types";
import {
  draftFromTask,
  draftPatch,
  dueAtFromDate,
  isTaskDraftDirty,
  rebaseTaskDraft,
  wantedAlert,
  type SavedTask,
} from "@/lib/task-draft";

const TASK: CalendarTask = {
  id: "task-1",
  title: "Essay",
  due_at: new Date("2026-10-05T23:59:00").toISOString(),
  completed: false,
  color: null,
  color_overridden: false,
  category_id: null,
};

const saved = (task: CalendarTask, alertOffset: AlertOffset | null = null): SavedTask => ({ task, alertOffset });

describe("dueAtFromDate", () => {
  test("lands at 23:59 local time on the chosen day", () => {
    const due = new Date(dueAtFromDate("2026-10-02"));
    expect([due.getFullYear(), due.getMonth(), due.getDate()]).toEqual([2026, 9, 2]);
    expect([due.getHours(), due.getMinutes()]).toEqual([23, 59]);
  });
});

describe("task draft alert", () => {
  test("starts from the task's stored alert and is clean", () => {
    const draft = draftFromTask(saved(TASK, 60));
    expect(draft.alertOffset).toBe(60);
    expect(isTaskDraftDirty(saved(TASK, 60), draft)).toBe(false);
  });

  test("an alert change alone is dirty and leaves the task patch empty", () => {
    const draft = { ...draftFromTask(saved(TASK, 60)), alertOffset: 5 as const };
    expect(isTaskDraftDirty(saved(TASK, 60), draft)).toBe(true);
    expect(draftPatch(TASK, draft)).toEqual({});
    expect(isTaskDraftDirty(saved(TASK, 60), { ...draft, alertOffset: null })).toBe(true);
  });

  test("a task with no due date wants no alert, whatever the draft holds", () => {
    const draft = { ...draftFromTask(saved(TASK, 60)), dueDate: "" };
    expect(wantedAlert(draft)).toBeNull();
    expect(wantedAlert({ ...draft, dueDate: "2026-10-05" })).toBe(60);
  });

  test("clearing the due date of an alerted task is dirty even with the alert choice kept", () => {
    const draft = { ...draftFromTask(saved(TASK, 60)), dueDate: "" };
    expect(draftPatch(TASK, draft)).toEqual({ due_at: null });
    expect(isTaskDraftDirty(saved(TASK, 60), draft)).toBe(true);
  });

  test("an undated task with no alert stays clean", () => {
    const undated = { ...TASK, due_at: null };
    expect(isTaskDraftDirty(saved(undated), draftFromTask(saved(undated)))).toBe(false);
  });
});

describe("rebaseTaskDraft", () => {
  test("an unedited alert follows the stored alert and stays clean", () => {
    const next = rebaseTaskDraft(draftFromTask(saved(TASK)), saved(TASK), saved(TASK, 15));
    expect(next.alertOffset).toBe(15);
    expect(isTaskDraftDirty(saved(TASK, 15), next)).toBe(false);
  });

  test("keeps a chosen alert and an edited title", () => {
    const edited = { ...draftFromTask(saved(TASK)), title: "Essay v2", alertOffset: 5 as const };
    const next = rebaseTaskDraft(edited, saved(TASK), saved({ ...TASK, completed: true }, 15));
    expect(next.title).toBe("Essay v2");
    expect(next.alertOffset).toBe(5);
  });

  test("an unedited draft follows the saved due date", () => {
    const moved = { ...TASK, due_at: new Date("2026-10-09T23:59:00").toISOString() };
    const next = rebaseTaskDraft(draftFromTask(saved(TASK)), saved(TASK), saved(moved));
    expect(next).toEqual(draftFromTask(saved(moved)));
  });
});
