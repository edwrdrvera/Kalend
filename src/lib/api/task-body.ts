import * as field from "@/lib/api/parse-fields";
import { parsed, rejected, type ParseResult } from "@/lib/api/parse-fields";
import type { TaskPatchRequest } from "@/lib/calendar-types";

const taskRules = {
  title: field.title,
  // null clears the due date (moves the task back to the undated inbox).
  due_at: (value: unknown) => (value === null ? parsed(null) : field.date(value, "due_at")),
  completed: (value: unknown) => field.boolean(value, "completed"),
  color: field.color,
  color_overridden: (value: unknown) => field.boolean(value, "color_overridden"),
  category_id: field.categoryId,
} satisfies Record<keyof TaskPatchRequest, (value: unknown) => ParseResult<unknown>>;

/** The fields an update sets. An absent key means "leave untouched". */
export type TaskPatch = field.Parsed<typeof taskRules>;
export type TaskCreate = TaskPatch & Required<Pick<TaskPatch, "title">>;

export function parseTaskCreate(json: unknown): ParseResult<TaskCreate> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  if (body.value.title === undefined) return rejected("title is required");
  const result = field.parsePresent(body.value, taskRules);
  return result.ok ? parsed(result.value as TaskCreate) : result;
}

export function parseTaskPatch(json: unknown): ParseResult<TaskPatch> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const result = field.parsePresent(body.value, taskRules);
  if (!result.ok) return result;
  if (Object.keys(result.value).length === 0) return rejected("No updatable fields provided");
  return result;
}
