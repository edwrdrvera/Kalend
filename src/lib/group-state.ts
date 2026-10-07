import type { CalendarGroup } from "./calendar-types";

/**
 * Takes the items out of a deleted Group. Only group_id changes, so a
 * concurrent edit to another field is not replaced by an older snapshot, and
 * each item keeps its Space and its color.
 */
export function releaseGroup<T extends { group_id: string | null }>(items: readonly T[], groupId: string): T[] {
  return items.map((item) => (item.group_id === groupId ? { ...item, group_id: null } : item));
}

/** The Groups left after a Space and its Groups are deleted. */
export function withoutSpaceGroups(groups: readonly CalendarGroup[], categoryId: string): CalendarGroup[] {
  return groups.filter((group) => group.category_id !== categoryId);
}

/** A Group list in a stable, readable order: by Space, then by name. */
export function groupsOfSpace(groups: readonly CalendarGroup[], categoryId: string | null): CalendarGroup[] {
  if (categoryId === null) return [];
  return groups
    .filter((group) => group.category_id === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
