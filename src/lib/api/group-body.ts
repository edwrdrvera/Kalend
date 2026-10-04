import * as field from "@/lib/api/parse-fields";
import { parsed, rejected, type ParseResult } from "@/lib/api/parse-fields";
import type { GroupCreateRequest, GroupPatchRequest } from "@/lib/calendar-types";

const groupRules = {
  name: field.groupName,
} satisfies Record<keyof GroupPatchRequest, (value: unknown) => ParseResult<unknown>>;

export type GroupPatch = { name: string };
export type GroupCreate = { category_id: string; name: string };

const MOVE_ERROR = "A Group cannot move to another Space";

export function parseGroupCreate(json: unknown): ParseResult<GroupCreate> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const { category_id, name, ...rest } = body.value;
  const unknownField = Object.keys(rest)[0];
  if (unknownField) return rejected(`Unknown field: ${unknownField}`);
  if (category_id === undefined) return rejected("category_id is required");
  if (typeof category_id !== "string") return rejected("Space must be a valid identifier");
  const space = field.categoryId(category_id);
  if (!space.ok) return space;
  if (name === undefined) return rejected("name is required");
  const parsedName = groupRules.name(name);
  if (!parsedName.ok) return parsedName;
  return parsed({ category_id: category_id, name: parsedName.value } satisfies GroupCreateRequest);
}

/** A Group is renamed only. A body that names its Space is refused, not ignored. */
export function parseGroupPatch(json: unknown): ParseResult<GroupPatch> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  if ("category_id" in body.value || "space_id" in body.value) return rejected(MOVE_ERROR);
  const result = field.parsePresent(body.value, groupRules);
  if (!result.ok) return result;
  if (result.value.name === undefined) return rejected("No updatable fields provided");
  return parsed({ name: result.value.name });
}
