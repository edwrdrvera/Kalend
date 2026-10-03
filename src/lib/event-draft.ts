import { format, isSameDay } from "date-fns";
import type { AlertOffset } from "./alerts";
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
  /** The one alert the inspector offers. Null means none. */
  alertOffset: AlertOffset | null;
}

/** What the inspector's draft is compared against: the event and its stored alert. */
export interface SavedEvent {
  event: CalendarEvent;
  alertOffset: AlertOffset | null;
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

export function draftFromEvent({ event, alertOffset }: SavedEvent): EventDraft {
  return {
    title: event.title,
    icon: event.icon ?? "",
    location: event.location ?? "",
    startAt: toDateTimeLocal(new Date(event.start_at)),
    endAt: toDateTimeLocal(new Date(event.end_at)),
    colorState: initialEventColor(event),
    alertOffset,
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

/** True when the draft differs from the saved event in a field the event save sends. */
export function isEventFieldsDirty(event: CalendarEvent, draft: EventDraft): boolean {
  const saved = draftFromEvent({ event, alertOffset: draft.alertOffset });
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

/** True when a save has anything to send: an event field or the alert. */
export function isEventDraftDirty(saved: SavedEvent, draft: EventDraft): boolean {
  return isEventFieldsDirty(saved.event, draft) || draft.alertOffset !== saved.alertOffset;
}

/** Moves the fields the user hasn't edited onto the newly saved event and keeps the edited ones. */
export function rebaseEventDraft(
  draft: EventDraft,
  previous: SavedEvent,
  next: SavedEvent
): EventDraft {
  const was = draftFromEvent(previous);
  const now = draftFromEvent(next);
  const sameColor =
    draft.colorState.color === was.colorState.color &&
    draft.colorState.colorOverridden === was.colorState.colorOverridden &&
    draft.colorState.categoryId === was.colorState.categoryId;
  return {
    title: draft.title.trim() === was.title ? now.title : draft.title,
    icon: draft.icon.trim() === was.icon ? now.icon : draft.icon,
    location: draft.location.trim() === was.location ? now.location : draft.location,
    startAt: draft.startAt === was.startAt ? now.startAt : draft.startAt,
    endAt: draft.endAt === was.endAt ? now.endAt : draft.endAt,
    colorState: sameColor ? now.colorState : draft.colorState,
    alertOffset: draft.alertOffset === was.alertOffset ? now.alertOffset : draft.alertOffset,
  };
}
