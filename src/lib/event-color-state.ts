import type { CalendarCategory, CalendarEvent } from "./calendar-types";
import { DEFAULT_EVENT_COLOR, isEventColor, resolveDisplayColor, type EventColor } from "./event-colors";

export interface EventColorState {
  color: EventColor;
  categoryId: string | null;
  colorOverridden: boolean;
}

export function initialEventColor(event?: CalendarEvent | null): EventColorState {
  return {
    color: isEventColor(event?.color) ? event.color : DEFAULT_EVENT_COLOR,
    categoryId: event?.category_id ?? null,
    colorOverridden: event?.color_overridden ?? false,
  };
}

export type EventColorAction =
  | { type: "pick"; color: EventColor }
  | { type: "inherit" }
  | { type: "space"; categoryId: string | null; categories: readonly CalendarCategory[] };

// Store the personal color separately from the live Space color. Only
// detaching needs to snapshot the visible color before the link disappears.
export function eventColorReducer(state: EventColorState, action: EventColorAction): EventColorState {
  if (action.type === "pick") return { ...state, color: action.color, colorOverridden: true };
  if (action.type === "inherit") return { ...state, colorOverridden: false };
  const visible = resolveDisplayColor(state.color, state.categoryId, state.colorOverridden, action.categories);
  return {
    ...state,
    categoryId: action.categoryId,
    color: action.categoryId === null && isEventColor(visible) ? visible : state.color,
  };
}

// Merge only the fields changed by Space deletion; a concurrent title/time
// edit must not be replaced by the deletion response's older snapshot.
export function reconcileDetachedEvents(current: CalendarEvent[], detached: CalendarEvent[], categoryId: string): CalendarEvent[] {
  const byId = new Map(detached.map((event) => [event.id, event]));
  return current.map((event) => {
    const saved = byId.get(event.id);
    return saved && event.category_id === categoryId ? {
      ...event,
      color: saved.color,
      category_id: saved.category_id,
      color_overridden: saved.color_overridden,
    } : event;
  });
}
