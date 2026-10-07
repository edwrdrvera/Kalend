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
  group_id: null,
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

describe("task draft membership", () => {
  const IN_BIO: CalendarTask = { ...TASK, category_id: "school", group_id: "bio" };

  test("starts from the saved Space and Group and is clean", () => {
    const draft = draftFromTask(saved(IN_BIO));
    expect([draft.categoryId, draft.groupId]).toEqual(["school", "bio"]);
    expect(isTaskDraftDirty(saved(IN_BIO), draft)).toBe(false);
    expect(draftPatch(IN_BIO, draft)).toEqual({});
  });

  test("joining a Group sends the Space and the Group together", () => {
    const draft = { ...draftFromTask(saved(TASK)), categoryId: "school", groupId: "bio" };
    expect(draftPatch(TASK, draft)).toEqual({ category_id: "school", group_id: "bio" });
  });

  test("leaving the Group but not the Space sends group_id null with the same Space", () => {
    const draft = { ...draftFromTask(saved(IN_BIO)), groupId: null };
    expect(draftPatch(IN_BIO, draft)).toEqual({ category_id: "school", group_id: null });
    expect(isTaskDraftDirty(saved(IN_BIO), draft)).toBe(true);
  });

  test("moving to another Space sends no Group", () => {
    const draft = { ...draftFromTask(saved(IN_BIO)), categoryId: "work", groupId: null };
    expect(draftPatch(IN_BIO, draft)).toEqual({ category_id: "work", group_id: null });
  });

  test("an unedited membership follows the newly saved task, and an edited one is kept", () => {
    const moved: CalendarTask = { ...IN_BIO, category_id: "work", group_id: null };
    const followed = rebaseTaskDraft(draftFromTask(saved(IN_BIO)), saved(IN_BIO), saved(moved));
    expect([followed.categoryId, followed.groupId]).toEqual(["work", null]);

    const edited = { ...draftFromTask(saved(IN_BIO)), groupId: "hist" };
    const kept = rebaseTaskDraft(edited, saved(IN_BIO), saved(moved));
    expect([kept.categoryId, kept.groupId]).toEqual(["school", "hist"]);
  });
});
