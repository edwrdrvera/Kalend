import * as field from "@/lib/api/parse-fields";
import { parsed, rejected, type ParseResult } from "@/lib/api/parse-fields";
import { ALERT_OFFSETS, isAlertOffset, type AlertOffset, type AlertTarget } from "@/lib/alerts";
import type { AlertCreateRequest } from "@/lib/calendar-types";
import { isUuid } from "@/lib/uuid";

const itemId = (name: string) => (value: unknown): ParseResult<string> =>
  typeof value === "string" && isUuid(value) ? parsed(value) : rejected(`${name} must be a valid identifier`);

const alertRules = {
  event_id: itemId("event_id"),
  task_id: itemId("task_id"),
  offset_minutes: (value: unknown): ParseResult<AlertOffset> =>
    isAlertOffset(value)
      ? parsed(value)
      : rejected(`offset_minutes must be one of ${ALERT_OFFSETS.join(", ")}`),
} satisfies Record<keyof AlertCreateRequest, (value: unknown) => ParseResult<unknown>>;

/** The one item an alert belongs to. Naming both, or neither, is not representable. */
export type AlertCreate = {
  target: AlertTarget;
  offset_minutes: AlertOffset;
};

export function parseAlertCreate(json: unknown): ParseResult<AlertCreate> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const result = field.parsePresent(body.value, alertRules);
  if (!result.ok) return result;
  const { event_id, task_id, offset_minutes } = result.value;
  if (offset_minutes === undefined) return rejected("offset_minutes is required");
  if (event_id !== undefined && task_id !== undefined) {
    return rejected("Name either event_id or task_id, not both");
  }
  if (event_id !== undefined) return parsed({ target: { kind: "event", id: event_id }, offset_minutes });
  if (task_id !== undefined) return parsed({ target: { kind: "task", id: task_id }, offset_minutes });
  return rejected("event_id or task_id is required");
}
