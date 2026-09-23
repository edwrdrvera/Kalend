import { isEventColor } from "@/lib/event-colors";
import { isUuid } from "@/lib/uuid";

/**
 * Pure request-body field rules shared by the per-resource parsers. Each
 * rule takes the raw JSON value (never `undefined`: callers skip absent
 * fields) and returns the cleaned value or the error message the API
 * returns. Create and update both call these same rules, so the two modes
 * cannot drift apart again.
 */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const parsed = <T>(value: T): ParseResult<T> => ({ ok: true, value });
export const rejected = (error: string): { ok: false; error: string } => ({ ok: false, error });

export function asBodyObject(json: unknown): ParseResult<Record<string, unknown>> {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return rejected("Request body must be an object");
  }
  return parsed(json as Record<string, unknown>);
}

/** A title must be a string that is non-blank once trimmed; it is stored trimmed. */
export function title(value: unknown): ParseResult<string> {
  if (typeof value !== "string") return rejected("title must be a string");
  const trimmed = value.trim();
  return trimmed ? parsed(trimmed) : rejected("title is required");
}

export function date(value: unknown, field: string): ParseResult<Date> {
  const result = typeof value === "string" ? new Date(value) : null;
  if (!result || Number.isNaN(result.getTime())) return rejected(`${field} must be a valid date`);
  return parsed(result);
}

export function color(value: unknown): ParseResult<string> {
  return typeof value === "string" && isEventColor(value)
    ? parsed(value)
    : rejected("color must be a supported color");
}

export function boolean(value: unknown, field: string): ParseResult<boolean> {
  return typeof value === "boolean" ? parsed(value) : rejected(`${field} must be a boolean`);
}

/** `null` clears the Space link; a string must be a UUID. */
export function categoryId(value: unknown): ParseResult<string | null> {
  if (value === null) return parsed(null);
  return typeof value === "string" && isUuid(value)
    ? parsed(value)
    : rejected("Space must be a valid identifier");
}

/** `null` clears the field; a string may be at most `max` characters. */
export function optionalText(value: unknown, field: string, max: number): ParseResult<string | null> {
  if (value === null) return parsed(null);
  return typeof value === "string" && value.length <= max
    ? parsed(value)
    : rejected(`${field} must be a string of at most ${max} characters`);
}

type Rules = Record<string, (value: unknown) => ParseResult<unknown>>;
export type Parsed<R extends Rules> = {
  [K in keyof R]?: R[K] extends (value: unknown) => ParseResult<infer T> ? T : never;
};

/**
 * Runs each rule over the fields present in `body` (absent or `undefined`
 * keys are skipped, meaning "leave untouched") and collects the cleaned
 * values. The first failing field's error wins, in rule order.
 */
export function parsePresent<R extends Rules>(body: Record<string, unknown>, rules: R): ParseResult<Parsed<R>> {
  const values: Record<string, unknown> = {};
  for (const [field, rule] of Object.entries(rules)) {
    if (body[field] === undefined) continue;
    const result = rule(body[field]);
    if (!result.ok) return result;
    values[field] = result.value;
  }
  return parsed(values as Parsed<R>);
}
