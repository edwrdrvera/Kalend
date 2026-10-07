export const MAX_GROUP_NAME_LENGTH = 100;

export type GroupNameProblem = "blank" | "too_long";

/** Why a Group name would be refused, or null. Names are stored trimmed, so only the trimmed text counts. */
export function groupNameProblem(name: string): GroupNameProblem | null {
  const trimmed = name.trim();
  if (!trimmed) return "blank";
  return trimmed.length > MAX_GROUP_NAME_LENGTH ? "too_long" : null;
}
