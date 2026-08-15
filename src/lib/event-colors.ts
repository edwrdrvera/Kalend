// Shared color palette for events (and tasks, which reuse this same enum —
// see TASK_COLOR_CLASSES below), used by the month/week/day grids (rendering
// event pills and task chips) and the event modal (color picker). Kept in
// one place so they never drift out of sync.
export const EVENT_COLORS = [
  "blue",
  "green",
  "purple",
  "orange",
  "red",
  "indigo",
  "pink",
  "yellow",
  "teal",
] as const;

export type EventColor = (typeof EVENT_COLORS)[number];

// Matches the `color` column's DB default on events/tasks/categories, and
// what a fresh create form (event, task, or category) starts on before the
// user picks a color of their own.
export const DEFAULT_EVENT_COLOR: EventColor = "blue";

export function isEventColor(color: string | null | undefined): color is EventColor {
  return !!color && (EVENT_COLORS as readonly string[]).includes(color);
}

// Tailwind can't see class names built with string interpolation (e.g.
// `bg-${color}-500`) — its scanner only picks up whole class strings that
// appear literally in source, so color-coding driven by the event's
// freeform `color` string needs an explicit lookup table like this instead.
//
// A solid `border-l` bar carries the color, with only a faint tint behind
// it — a bar reads as a distinct color at a glance even on small month-grid
// chips, where a fully-tinted fill on a tiny pill tends to blur together.
export const EVENT_COLOR_CLASSES: Record<EventColor, string> = {
  blue: "border-l-2 border-blue-500 bg-blue-500/15 text-blue-300",
  green: "border-l-2 border-green-500 bg-green-500/15 text-green-300",
  purple: "border-l-2 border-purple-500 bg-purple-500/15 text-purple-300",
  orange: "border-l-2 border-orange-500 bg-orange-500/15 text-orange-300",
  red: "border-l-2 border-red-500 bg-red-500/15 text-red-300",
  indigo: "border-l-2 border-indigo-500 bg-indigo-500/15 text-indigo-300",
  pink: "border-l-2 border-pink-500 bg-pink-500/15 text-pink-300",
  yellow: "border-l-2 border-yellow-500 bg-yellow-500/15 text-yellow-300",
  teal: "border-l-2 border-teal-500 bg-teal-500/15 text-teal-300",
};

export const DEFAULT_EVENT_COLOR_CLASSES =
  "border-l-2 border-neutral-500 bg-neutral-700/40 text-neutral-300";

export function getEventColorClasses(color: string | null): string {
  if (!color || !isEventColor(color)) return DEFAULT_EVENT_COLOR_CLASSES;
  return EVENT_COLOR_CLASSES[color];
}

// Solid swatch classes for the color-picker UI itself, distinct from the
// translucent pill styling used on the calendar grid.
export const EVENT_COLOR_SWATCH_CLASSES: Record<EventColor, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
  pink: "bg-pink-500",
  yellow: "bg-yellow-500",
  teal: "bg-teal-500",
};

// Outlined, not filled, so a task chip on the calendar grid never reads as
// an event pill at a glance.
export const TASK_COLOR_CLASSES: Record<EventColor, string> = {
  blue: "border-blue-500/60 text-blue-300",
  green: "border-green-500/60 text-green-300",
  purple: "border-purple-500/60 text-purple-300",
  orange: "border-orange-500/60 text-orange-300",
  red: "border-red-500/60 text-red-300",
  indigo: "border-indigo-500/60 text-indigo-300",
  pink: "border-pink-500/60 text-pink-300",
  yellow: "border-yellow-500/60 text-yellow-300",
  teal: "border-teal-500/60 text-teal-300",
};

export const DEFAULT_TASK_COLOR_CLASSES = "border-neutral-600 text-neutral-300";

export function getTaskColorClasses(color: string | null): string {
  if (!color || !isEventColor(color)) return DEFAULT_TASK_COLOR_CLASSES;
  return TASK_COLOR_CLASSES[color];
}

// Shared by events and tasks: when linked to a category, the color shown on
// the calendar is looked up live from that category (so recoloring a
// category updates everything under it immediately) instead of the item's
// own `color` field. Falls back to `ownColor` when there's no category_id,
// or the linked category no longer exists (e.g. stale client state right
// after a delete elsewhere).
export function resolveDisplayColor(
  ownColor: string | null,
  categoryId: string | null | undefined,
  categories: readonly { id: string; color: string | null }[]
): string | null {
  if (categoryId) {
    const category = categories.find((c) => c.id === categoryId);
    if (category) return category.color;
  }
  return ownColor;
}
