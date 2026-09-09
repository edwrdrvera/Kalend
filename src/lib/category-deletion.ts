import type { CalendarEvent, CalendarTask, CategoryDeleteApiResponse } from "./calendar-types";

export type CompletedCategoryDeletion = CategoryDeleteApiResponse & {
  data: NonNullable<CategoryDeleteApiResponse["data"]>;
  events: CalendarEvent[];
  tasks: CalendarTask[];
};

/** Returns false when the same Space deletion is already awaiting a response. */
export function beginCategoryDeletion(pending: Set<string>, categoryId: string): boolean {
  if (pending.has(categoryId)) return false;
  pending.add(categoryId);
  return true;
}

export function finishCategoryDeletion(pending: Set<string>, categoryId: string): void {
  pending.delete(categoryId);
}

/** Verify the additional data required to reconcile a confirmed deletion. */
export function isCompletedCategoryDeletion(
  response: CategoryDeleteApiResponse
): response is CompletedCategoryDeletion {
  return response.data !== undefined && Array.isArray(response.events) && Array.isArray(response.tasks);
}
