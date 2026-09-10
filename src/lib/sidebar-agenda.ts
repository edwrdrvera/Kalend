import { compareAsc, endOfDay, format, isSameDay, startOfDay } from "date-fns";
import type { CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import { isMultiDayEvent } from "@/lib/time-grid-layout";

export type SidebarAgendaItem =
  | { kind: "event"; event: CalendarEvent; allDay: boolean }
  | { kind: "task"; task: CalendarTask };

export interface SidebarAgendaSection {
  key: string;
  date: Date | null;
  heading: string;
  items: SidebarAgendaItem[];
}

function compareItems(a: SidebarAgendaItem, b: SidebarAgendaItem): number {
  if (a.kind === "event" && b.kind === "event") {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return (
      compareAsc(new Date(a.event.start_at), new Date(b.event.start_at)) ||
      a.event.title.localeCompare(b.event.title) ||
      a.event.id.localeCompare(b.event.id)
    );
  }

  if (a.kind !== b.kind) return a.kind === "event" ? -1 : 1;

  if (a.kind === "task" && b.kind === "task") {
    if (a.task.completed !== b.task.completed) return a.task.completed ? 1 : -1;
    return a.task.title.localeCompare(b.task.title) || a.task.id.localeCompare(b.task.id);
  }

  return 0;
}

export function buildSidebarAgenda(
  events: readonly CalendarEvent[],
  tasks: readonly CalendarTask[],
  selectedDate: Date
): SidebarAgendaSection[] {
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);
  const items: SidebarAgendaItem[] = [];

  for (const event of events) {
    const eventStart = new Date(event.start_at);
    const eventEnd = new Date(event.end_at);
    if (eventStart > dayEnd || eventEnd < dayStart) continue;

    items.push({
      kind: "event",
      event,
      allDay: isMultiDayEvent(event),
    });
  }

  for (const task of tasks) {
    if (!task.due_at || isSameDay(new Date(task.due_at), dayStart)) {
      items.push({ kind: "task", task });
    }
  }

  return [{
    key: format(dayStart, "yyyy-MM-dd"),
    date: dayStart,
    heading: format(dayStart, "EEEE, MMMM d"),
    items: items.sort(compareItems),
  }];
}

export function taskDueLabel(task: CalendarTask, now = new Date()): string {
  if (!task.due_at) return "No due date";

  const dueAt = new Date(task.due_at);
  if (!task.completed && dueAt < now && !isSameDay(dueAt, now)) return "Overdue";
  if (isSameDay(dueAt, now)) return "Due today";
  return "Due";
}
