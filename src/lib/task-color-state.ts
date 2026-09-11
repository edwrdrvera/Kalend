import type { CalendarTask } from "./calendar-types";

// Merge only the fields changed by Space deletion; concurrent task edits
// must not be replaced by the deletion response's older snapshot.
export function reconcileDetachedTasks(
  current: CalendarTask[],
  detached: CalendarTask[],
  categoryId: string
): CalendarTask[] {
  const byId = new Map(detached.map((task) => [task.id, task]));
  return current.map((task) => {
    const saved = byId.get(task.id);
    return saved && task.category_id === categoryId ? {
      ...task,
      color: saved.color,
      color_overridden: saved.color_overridden,
      category_id: saved.category_id,
    } : task;
  });
}
