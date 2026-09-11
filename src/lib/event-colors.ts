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
  blue: "border-blue-300 bg-blue-100/90 text-blue-700 dark:border-blue-500/35 dark:bg-blue-500/15 dark:text-blue-300",
  green: "border-green-300 bg-green-100/90 text-green-700 dark:border-green-500/35 dark:bg-green-500/15 dark:text-green-300",
  purple: "border-purple-300 bg-purple-100/90 text-purple-700 dark:border-purple-500/35 dark:bg-purple-500/15 dark:text-purple-300",
  orange: "border-orange-300 bg-orange-100/90 text-orange-700 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-300",
  red: "border-red-300 bg-red-100/90 text-red-700 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-300",
  indigo: "border-indigo-300 bg-indigo-100/90 text-indigo-700 dark:border-indigo-500/35 dark:bg-indigo-500/15 dark:text-indigo-300",
  pink: "border-pink-300 bg-pink-100/90 text-pink-700 dark:border-pink-500/35 dark:bg-pink-500/15 dark:text-pink-300",
  yellow: "border-yellow-300 bg-yellow-100/90 text-yellow-700 dark:border-yellow-500/35 dark:bg-yellow-500/15 dark:text-yellow-300",
  teal: "border-teal-300 bg-teal-100/90 text-teal-700 dark:border-teal-500/35 dark:bg-teal-500/15 dark:text-teal-300",
};

export const DEFAULT_EVENT_COLOR_CLASSES = "bg-muted text-muted-foreground";

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
// an event pill at a glance. Text colors are darker in light mode so they
// remain legible on the warm off-white background.
export const TASK_COLOR_CLASSES: Record<EventColor, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/45 dark:bg-blue-500/10 dark:text-blue-300",
  green: "border-green-200 bg-green-50 text-green-700 dark:border-green-500/45 dark:bg-green-500/10 dark:text-green-300",
  purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/45 dark:bg-purple-500/10 dark:text-purple-300",
  orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/45 dark:bg-orange-500/10 dark:text-orange-300",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/45 dark:bg-red-500/10 dark:text-red-300",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/45 dark:bg-indigo-500/10 dark:text-indigo-300",
  pink: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/45 dark:bg-pink-500/10 dark:text-pink-300",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/45 dark:bg-yellow-500/10 dark:text-yellow-300",
  teal: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/45 dark:bg-teal-500/10 dark:text-teal-300",
};

export const DEFAULT_TASK_COLOR_CLASSES = "border-border text-muted-foreground";

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
  colorOverridden: boolean,
  categories: readonly { id: string; color: string | null }[]
): string | null {
  if (categoryId && !colorOverridden) {
    const category = categories.find((c) => c.id === categoryId);
    if (category) return category.color;
  }
  return ownColor;
}
