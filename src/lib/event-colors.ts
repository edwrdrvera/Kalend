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
// Full-tinted rounded chip: pastel background in light mode (matches the
// landing-page mockup palette), dark translucent tint in dark mode. The
// `dark:` prefix works because globals.css registers the custom variant
// `@custom-variant dark (&:is(.dark *))`.
export const EVENT_COLOR_CLASSES: Record<EventColor, string> = {
  blue:   "bg-blue-100   text-blue-700   dark:bg-blue-500/15   dark:text-blue-300",
  green:  "bg-green-100  text-green-700  dark:bg-green-500/15  dark:text-green-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  red:    "bg-red-100    text-red-700    dark:bg-red-500/15    dark:text-red-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  pink:   "bg-pink-100   text-pink-700   dark:bg-pink-500/15   dark:text-pink-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  teal:   "bg-teal-100   text-teal-700   dark:bg-teal-500/15   dark:text-teal-300",
};

export const DEFAULT_EVENT_COLOR_CLASSES =
  "bg-neutral-100 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300";

export function getEventColorClasses(color: string | null): string {
  if (!color || !isEventColor(color)) return DEFAULT_EVENT_COLOR_CLASSES;
  return EVENT_COLOR_CLASSES[color];
}

// Solid swatch classes for the color-picker UI itself, distinct from the
// translucent pill styling used on the calendar grid.
export const EVENT_COLOR_SWATCH_CLASSES: Record<EventColor, string> = {
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red:    "bg-red-500",
  indigo: "bg-indigo-500",
  pink:   "bg-pink-500",
  yellow: "bg-yellow-500",
  teal:   "bg-teal-500",
};

// Outlined, not filled, so a task chip on the calendar grid never reads as
// an event pill at a glance. Text colors are darker in light mode so they
// remain legible on the warm off-white background.
export const TASK_COLOR_CLASSES: Record<EventColor, string> = {
  blue:   "border-blue-400   text-blue-600   dark:border-blue-500/60   dark:text-blue-300",
  green:  "border-green-400  text-green-600  dark:border-green-500/60  dark:text-green-300",
  purple: "border-purple-400 text-purple-600 dark:border-purple-500/60 dark:text-purple-300",
  orange: "border-orange-400 text-orange-600 dark:border-orange-500/60 dark:text-orange-300",
  red:    "border-red-400    text-red-600    dark:border-red-500/60    dark:text-red-300",
  indigo: "border-indigo-400 text-indigo-600 dark:border-indigo-500/60 dark:text-indigo-300",
  pink:   "border-pink-400   text-pink-600   dark:border-pink-500/60   dark:text-pink-300",
  yellow: "border-yellow-400 text-yellow-600 dark:border-yellow-500/60 dark:text-yellow-300",
  teal:   "border-teal-400   text-teal-600   dark:border-teal-500/60   dark:text-teal-300",
};

export const DEFAULT_TASK_COLOR_CLASSES =
  "border-neutral-400 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300";

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
