import { format } from "date-fns";
import type { CalendarTask, TaskPatchRequest } from "@/lib/calendar-types";

/** The editable fields of a task, as the inspector's form holds them. */
export interface TaskDraft {
  title: string;
  /** "yyyy-MM-dd", or "" for no due date. */
  dueDate: string;
  categoryId: string | null;
}

export function draftFromTask(task: CalendarTask): TaskDraft {
  return {
    title: task.title,
    dueDate: task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd") : "",
    categoryId: task.category_id,
  };
}

/** A "yyyy-MM-dd" due date as the end of that day in local time, the way every task form saves it. */
export function dueAtFromDate(dueDate: string): string {
  return new Date(`${dueDate}T23:59:00`).toISOString();
}

/** Only the fields the draft changed. An empty patch means the draft is clean. */
export function draftPatch(task: CalendarTask, draft: TaskDraft): TaskPatchRequest {
  const saved = draftFromTask(task);
  const patch: TaskPatchRequest = {};
  const title = draft.title.trim();
  if (title !== saved.title) patch.title = title;
  if (draft.dueDate !== saved.dueDate) {
    patch.due_at = draft.dueDate ? dueAtFromDate(draft.dueDate) : null;
  }
  if (draft.categoryId !== saved.categoryId) patch.category_id = draft.categoryId;
  return patch;
}
