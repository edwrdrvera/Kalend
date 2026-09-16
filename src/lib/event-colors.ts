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
// Full-tinted rounded chip. Colors come from the per-color `--evt-*` design
// tokens in globals.css (the warm-ink harmonized set): a soft tint fill in
// light mode, a translucent tint in dark. Light/dark is handled by the token
// values themselves (the `.dark` block redefines them), so no `dark:` variants
// are needed here.
export const EVENT_COLOR_CLASSES: Record<EventColor, string> = {
  blue: "border-[var(--evt-blue-bd)] bg-[var(--evt-blue-bg)] text-[var(--evt-blue-fg)]",
  green: "border-[var(--evt-green-bd)] bg-[var(--evt-green-bg)] text-[var(--evt-green-fg)]",
  purple: "border-[var(--evt-purple-bd)] bg-[var(--evt-purple-bg)] text-[var(--evt-purple-fg)]",
  orange: "border-[var(--evt-orange-bd)] bg-[var(--evt-orange-bg)] text-[var(--evt-orange-fg)]",
  red: "border-[var(--evt-red-bd)] bg-[var(--evt-red-bg)] text-[var(--evt-red-fg)]",
  indigo: "border-[var(--evt-indigo-bd)] bg-[var(--evt-indigo-bg)] text-[var(--evt-indigo-fg)]",
  pink: "border-[var(--evt-pink-bd)] bg-[var(--evt-pink-bg)] text-[var(--evt-pink-fg)]",
  yellow: "border-[var(--evt-yellow-bd)] bg-[var(--evt-yellow-bg)] text-[var(--evt-yellow-fg)]",
  teal: "border-[var(--evt-teal-bd)] bg-[var(--evt-teal-bg)] text-[var(--evt-teal-fg)]",
};

export const DEFAULT_EVENT_COLOR_CLASSES = "bg-muted text-muted-foreground";

export function getEventColorClasses(color: string | null): string {
  if (!color || !isEventColor(color)) return DEFAULT_EVENT_COLOR_CLASSES;
  return EVENT_COLOR_CLASSES[color];
}

// Solid swatch classes for the color-picker UI itself, distinct from the
// translucent pill styling used on the calendar grid.
export const EVENT_COLOR_SWATCH_CLASSES: Record<EventColor, string> = {
  blue: "bg-[var(--evt-blue-solid)]",
  green: "bg-[var(--evt-green-solid)]",
  purple: "bg-[var(--evt-purple-solid)]",
  orange: "bg-[var(--evt-orange-solid)]",
  red: "bg-[var(--evt-red-solid)]",
  indigo: "bg-[var(--evt-indigo-solid)]",
  pink: "bg-[var(--evt-pink-solid)]",
  yellow: "bg-[var(--evt-yellow-solid)]",
  teal: "bg-[var(--evt-teal-solid)]",
};

// Outlined, not filled, so a task chip on the calendar grid never reads as
// an event pill at a glance. Text colors are darker in light mode so they
// remain legible on the warm off-white background.
export const TASK_COLOR_CLASSES: Record<EventColor, string> = {
  blue: "border-[var(--evt-blue-bd)] bg-[var(--evt-blue-soft)] text-[var(--evt-blue-fg)]",
  green: "border-[var(--evt-green-bd)] bg-[var(--evt-green-soft)] text-[var(--evt-green-fg)]",
  purple: "border-[var(--evt-purple-bd)] bg-[var(--evt-purple-soft)] text-[var(--evt-purple-fg)]",
  orange: "border-[var(--evt-orange-bd)] bg-[var(--evt-orange-soft)] text-[var(--evt-orange-fg)]",
  red: "border-[var(--evt-red-bd)] bg-[var(--evt-red-soft)] text-[var(--evt-red-fg)]",
  indigo: "border-[var(--evt-indigo-bd)] bg-[var(--evt-indigo-soft)] text-[var(--evt-indigo-fg)]",
  pink: "border-[var(--evt-pink-bd)] bg-[var(--evt-pink-soft)] text-[var(--evt-pink-fg)]",
  yellow: "border-[var(--evt-yellow-bd)] bg-[var(--evt-yellow-soft)] text-[var(--evt-yellow-fg)]",
  teal: "border-[var(--evt-teal-bd)] bg-[var(--evt-teal-soft)] text-[var(--evt-teal-fg)]",
};

export const DEFAULT_TASK_COLOR_CLASSES = "border-border text-muted-foreground";

export function getTaskColorClasses(color: string | null): string {
  if (!color || !isEventColor(color)) return DEFAULT_TASK_COLOR_CLASSES;
  return TASK_COLOR_CLASSES[color];
}

// Solid fill + lighter border for the active Space tile in the icon rail. The
// colored fill with white text reads on the rail in both light and dark themes.
export const RAIL_SPACE_ACTIVE_CLASSES: Record<EventColor, string> = {
  blue: "bg-[var(--evt-blue-solid)] border-[var(--evt-blue-solid)] text-white",
  green: "bg-[var(--evt-green-solid)] border-[var(--evt-green-solid)] text-white",
  purple: "bg-[var(--evt-purple-solid)] border-[var(--evt-purple-solid)] text-white",
  orange: "bg-[var(--evt-orange-solid)] border-[var(--evt-orange-solid)] text-white",
  red: "bg-[var(--evt-red-solid)] border-[var(--evt-red-solid)] text-white",
  indigo: "bg-[var(--evt-indigo-solid)] border-[var(--evt-indigo-solid)] text-white",
  pink: "bg-[var(--evt-pink-solid)] border-[var(--evt-pink-solid)] text-white",
  yellow: "bg-[var(--evt-yellow-solid)] border-[var(--evt-yellow-solid)] text-white",
  teal: "bg-[var(--evt-teal-solid)] border-[var(--evt-teal-solid)] text-white",
};

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
