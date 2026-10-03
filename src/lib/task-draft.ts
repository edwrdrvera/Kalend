import { format } from "date-fns";
import type { AlertOffset } from "@/lib/alerts";
import type { CalendarTask, TaskPatchRequest } from "@/lib/calendar-types";

/** The editable fields of a task, as the inspector's form holds them. */
export interface TaskDraft {
  title: string;
  /** "yyyy-MM-dd", or "" for no due date. */
  dueDate: string;
  categoryId: string | null;
  /** The one alert the inspector offers. Null means none. */
  alertOffset: AlertOffset | null;
}

/** What the inspector's draft is compared against: the task and its stored alert. */
export interface SavedTask {
  task: CalendarTask;
  alertOffset: AlertOffset | null;
}

export function draftFromTask({ task, alertOffset }: SavedTask): TaskDraft {
  return {
    title: task.title,
    dueDate: task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd") : "",
    categoryId: task.category_id,
    alertOffset,
  };
}

/** A "yyyy-MM-dd" due date as the end of that day in local time, the way every task form saves it. */
export function dueAtFromDate(dueDate: string): string {
  return new Date(`${dueDate}T23:59:00`).toISOString();
}

/** The alert a save would leave on the task. A task with no due date can't have one. */
export function wantedAlert(draft: TaskDraft): AlertOffset | null {
  return draft.dueDate ? draft.alertOffset : null;
}

/** Only the task fields the draft changed. An empty patch means no field changed. */
export function draftPatch(task: CalendarTask, draft: TaskDraft): TaskPatchRequest {
  const saved = draftFromTask({ task, alertOffset: draft.alertOffset });
  const patch: TaskPatchRequest = {};
  const title = draft.title.trim();
  if (title !== saved.title) patch.title = title;
  if (draft.dueDate !== saved.dueDate) {
    patch.due_at = draft.dueDate ? dueAtFromDate(draft.dueDate) : null;
  }
  if (draft.categoryId !== saved.categoryId) patch.category_id = draft.categoryId;
  return patch;
}

/** True when a save has anything to send: a task field or the alert. */
export function isTaskDraftDirty(saved: SavedTask, draft: TaskDraft): boolean {
  return Object.keys(draftPatch(saved.task, draft)).length > 0 || wantedAlert(draft) !== saved.alertOffset;
}

/** Moves the fields the user hasn't edited onto the newly saved task and keeps the edited ones. */
export function rebaseTaskDraft(draft: TaskDraft, previous: SavedTask, next: SavedTask): TaskDraft {
  const was = draftFromTask(previous);
  const now = draftFromTask(next);
  return {
    title: draft.title.trim() === was.title ? now.title : draft.title,
    dueDate: draft.dueDate === was.dueDate ? now.dueDate : draft.dueDate,
    categoryId: draft.categoryId === was.categoryId ? now.categoryId : draft.categoryId,
    alertOffset: draft.alertOffset === was.alertOffset ? now.alertOffset : draft.alertOffset,
  };
}
