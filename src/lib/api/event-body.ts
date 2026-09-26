import * as field from "@/lib/api/parse-fields";
import { parsed, rejected, type ParseResult } from "@/lib/api/parse-fields";

const MAX_LOCATION_LENGTH = 500;
const MAX_ICON_LENGTH = 10;

const eventRules = {
  title: field.title,
  start_at: (value: unknown) => field.date(value, "start_at"),
  end_at: (value: unknown) => field.date(value, "end_at"),
  color: field.color,
  color_overridden: (value: unknown) => field.boolean(value, "color_overridden"),
  category_id: field.categoryId,
  location: (value: unknown) => field.optionalText(value, "location", MAX_LOCATION_LENGTH),
  icon: (value: unknown) => field.optionalText(value, "icon", MAX_ICON_LENGTH),
};

/** The fields an update sets. An absent key means "leave untouched". */
export type EventPatch = field.Parsed<typeof eventRules>;
export type EventCreate = EventPatch & Required<Pick<EventPatch, "title" | "start_at" | "end_at">>;

/** Validates a POST body: title, start_at and end_at are required, and start must precede end. */
export function parseEventCreate(json: unknown): ParseResult<EventCreate> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const { title, start_at, end_at } = body.value;
  if (typeof title !== "string" || !title.trim() || typeof start_at !== "string" || typeof end_at !== "string") {
    return rejected("title, start_at, and end_at are required");
  }
  // POST's combined date message predates the per-field rules and is part of the API contract.
  if (!field.date(start_at, "start_at").ok || !field.date(end_at, "end_at").ok) {
    return rejected("start_at and end_at must be valid dates");
  }
  const result = field.parsePresent(body.value, eventRules);
  if (!result.ok) return result;
  const event = result.value as EventCreate;
  // Runs after the per-field rules, so a body with a bad field and reversed times reports the field.
  // Before PR #181 the time order was reported first. Both are 400s; only the message differs.
  if (event.start_at >= event.end_at) return rejected("start_at must be before end_at");
  return parsed(event);
}

/**
 * Validates a PATCH body. Each present field follows the same rule as on
 * create. The start-before-end check is left to the handler, which must
 * compare against the stored row when only one side changes.
 */
export function parseEventPatch(json: unknown): ParseResult<EventPatch> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const result = field.parsePresent(body.value, eventRules);
  if (!result.ok) return result;
  if (Object.keys(result.value).length === 0) return rejected("No updatable fields provided");
  return result;
}
