import { format, isSameDay } from "date-fns";
import type { CalendarEvent } from "./calendar-types";
import { initialEventColor, type EventColorState } from "./event-color-state";
import type { EventFormValues } from "./event-form";

/** The editable fields of an event, as the create popover and the inspector hold them. */
export interface EventDraft {
  title: string;
  icon: string;
  location: string;
  /** Local "yyyy-MM-ddTHH:mm". */
  startAt: string;
  /** Local "yyyy-MM-ddTHH:mm". */
  endAt: string;
  colorState: EventColorState;
}

export function toDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function splitDateTimeLocal(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

export function joinDateTimeLocal(date: string, time: string): string {
  return `${date}T${time || "00:00"}`;
}

export function formatTimeRangeSummary(startValue: string, endValue: string): string {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  if (isSameDay(start, end)) {
    return `${format(start, "EEEE, MMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
  }
  return `${format(start, "EEE, MMM d, h:mm a")} – ${format(end, "EEE, MMM d, h:mm a")}`;
}

export function draftFromEvent(event: CalendarEvent): EventDraft {
  return {
    title: event.title,
    icon: event.icon ?? "",
    location: event.location ?? "",
    startAt: toDateTimeLocal(new Date(event.start_at)),
    endAt: toDateTimeLocal(new Date(event.end_at)),
    colorState: initialEventColor(event),
  };
}

/** The values to save, or why the draft can't be saved yet. */
export function eventDraftValues(
  draft: EventDraft
): { values: EventFormValues; error: null } | { values: null; error: string } {
  const title = draft.title.trim();
  if (!title) return { values: null, error: "Add a title before saving." };
  const start = new Date(draft.startAt);
  const end = new Date(draft.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { values: null, error: "Invalid date." };
  }
  if (start >= end) return { values: null, error: "Start must be before end." };
  const { color, colorOverridden, categoryId } = draft.colorState;
  return {
    values: {
      title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      color,
      colorOverridden,
      categoryId,
      location: draft.location.trim() || null,
      icon: draft.icon.trim() || null,
    },
    error: null,
  };
}

/** True when the draft differs from the saved event in anything a save would send. */
export function isEventDraftDirty(event: CalendarEvent, draft: EventDraft): boolean {
  const saved = draftFromEvent(event);
  return (
    draft.title.trim() !== saved.title ||
    draft.icon.trim() !== saved.icon ||
    draft.location.trim() !== saved.location ||
    draft.startAt !== saved.startAt ||
    draft.endAt !== saved.endAt ||
    draft.colorState.color !== saved.colorState.color ||
    draft.colorState.colorOverridden !== saved.colorState.colorOverridden ||
    draft.colorState.categoryId !== saved.colorState.categoryId
  );
}
