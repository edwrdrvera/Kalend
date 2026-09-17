import { addDays, endOfMonth, isSameDay, startOfDay } from "date-fns";
import type { CalendarTask } from "@/lib/calendar-types";

// The five due-date buckets the agenda's Tasks list groups into, relative to
// "now" (the real current day, not the calendar's selected day). Tasks are a
// persistent to-do list, so they are anchored to today while the Schedule above
// stays day-specific.
export type TaskBucketKey = "overdue" | "today" | "week" | "month" | "unscheduled";

export interface TaskBucket {
  key: TaskBucketKey;
  label: string;
  /** Overdue is tinted to pull attention; the rest are quiet. */
  danger: boolean;
  /** Overdue has no "+" (you don't schedule something into the past). */
  canAdd: boolean;
  /** yyyy-MM-dd to seed a task added here, or null for no due date. */
  defaultDue: string | null;
  tasks: CalendarTask[];
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function byDueAsc(a: CalendarTask, b: CalendarTask): number {
  return new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime();
}

/**
 * Group tasks into the five due-date buckets, in display order. Rules relative
 * to `now`:
 *   - unscheduled: no due date
 *   - today: due on the current day (completed-today stays here, dimmed)
 *   - overdue: due before today AND not completed (completed past tasks are
 *     dropped so they don't nag)
 *   - week: due within the next 7 days
 *   - month: due after that (this month and later; the catch-all so no dated
 *     task is ever lost)
 * Empty buckets are still returned; the caller decides which to render.
 */
export function bucketTasks(tasks: CalendarTask[], now: Date): TaskBucket[] {
  const todayStart = startOfDay(now);
  const weekEndExclusive = addDays(todayStart, 7);

  const overdue: CalendarTask[] = [];
  const today: CalendarTask[] = [];
  const week: CalendarTask[] = [];
  const month: CalendarTask[] = [];
  const unscheduled: CalendarTask[] = [];

  for (const t of tasks) {
    if (!t.due_at) {
      unscheduled.push(t);
      continue;
    }
    const due = new Date(t.due_at);
    if (isSameDay(due, todayStart)) {
      today.push(t);
    } else if (due.getTime() < todayStart.getTime()) {
      if (!t.completed) overdue.push(t);
    } else if (due.getTime() < weekEndExclusive.getTime()) {
      week.push(t);
    } else {
      month.push(t);
    }
  }

  overdue.sort(byDueAsc);
  today.sort(byDueAsc);
  week.sort(byDueAsc);
  month.sort(byDueAsc);

  return [
    { key: "overdue", label: "Overdue", danger: true, canAdd: false, defaultDue: null, tasks: overdue },
    { key: "today", label: "Today", danger: false, canAdd: true, defaultDue: ymd(todayStart), tasks: today },
    { key: "week", label: "This week", danger: false, canAdd: true, defaultDue: ymd(addDays(todayStart, 6)), tasks: week },
    { key: "month", label: "This month", danger: false, canAdd: true, defaultDue: ymd(endOfMonth(now)), tasks: month },
    { key: "unscheduled", label: "Unscheduled", danger: false, canAdd: true, defaultDue: null, tasks: unscheduled },
  ];
}
