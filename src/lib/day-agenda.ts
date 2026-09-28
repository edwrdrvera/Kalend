import { isSameDay } from "date-fns";
import type { CalendarTask } from "@/lib/calendar-types";

/** Tasks whose due date falls on `day` in local time: open tasks first, then by due time. */
export function tasksDueOn(tasks: readonly CalendarTask[], day: Date): CalendarTask[] {
  return tasks
    .filter((t) => t.due_at !== null && isSameDay(new Date(t.due_at), day))
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime()
    );
}

export function dueSectionLabel(day: Date, now: Date): string {
  return isSameDay(day, now) ? "Due today" : "Due this day";
}
