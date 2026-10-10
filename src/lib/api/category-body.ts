import * as field from "@/lib/api/parse-fields";
import { parsed, rejected, type ParseResult } from "@/lib/api/parse-fields";

const categoryRules = {
  name: field.name,
  color: field.color,
  description: field.description,
};

/** The fields an update sets. An absent key means "leave untouched". */
export type CategoryPatch = field.Parsed<typeof categoryRules>;
export type CategoryCreate = CategoryPatch & Required<Pick<CategoryPatch, "name">>;

export function parseCategoryCreate(json: unknown): ParseResult<CategoryCreate> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const result = field.parsePresent(body.value, categoryRules);
  if (!result.ok) return result;
  const { name, ...rest } = result.value;
  if (name === undefined) return rejected("name is required");
  return parsed({ ...rest, name });
}

export function parseCategoryPatch(json: unknown): ParseResult<CategoryPatch> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const result = field.parsePresent(body.value, categoryRules);
  if (!result.ok) return result;
  if (Object.keys(result.value).length === 0) return rejected("No updatable fields provided");
  return result;
}
