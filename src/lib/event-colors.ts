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

// Solid fill + border for a Space tile in the icon rail. The colored fill with
// white text reads on the rail in both light and dark themes.
export const RAIL_SPACE_CLASSES: Record<EventColor, string> = {
  blue: "bg-[var(--evt-blue-deep)] border-[var(--evt-blue-deep)] text-white",
  green: "bg-[var(--evt-green-deep)] border-[var(--evt-green-deep)] text-white",
  purple: "bg-[var(--evt-purple-deep)] border-[var(--evt-purple-deep)] text-white",
  orange: "bg-[var(--evt-orange-deep)] border-[var(--evt-orange-deep)] text-white",
  red: "bg-[var(--evt-red-deep)] border-[var(--evt-red-deep)] text-white",
  indigo: "bg-[var(--evt-indigo-deep)] border-[var(--evt-indigo-deep)] text-white",
  pink: "bg-[var(--evt-pink-deep)] border-[var(--evt-pink-deep)] text-white",
  yellow: "bg-[var(--evt-yellow-deep)] border-[var(--evt-yellow-deep)] text-white",
  teal: "bg-[var(--evt-teal-deep)] border-[var(--evt-teal-deep)] text-white",
};

// Rail tile used by the app's icon rail. Light mode inverts the solid tile: a
// pale tint with the deep hue as border and text. Dark mode keeps the solid fill.
export const RAIL_TILE_CLASSES: Record<EventColor, string> = {
  blue: "bg-[var(--evt-blue-bg)] border-[var(--evt-blue-deep)] text-[var(--evt-blue-deep)] dark:bg-[var(--evt-blue-deep)] dark:text-white",
  green: "bg-[var(--evt-green-bg)] border-[var(--evt-green-deep)] text-[var(--evt-green-deep)] dark:bg-[var(--evt-green-deep)] dark:text-white",
  purple: "bg-[var(--evt-purple-bg)] border-[var(--evt-purple-deep)] text-[var(--evt-purple-deep)] dark:bg-[var(--evt-purple-deep)] dark:text-white",
  orange: "bg-[var(--evt-orange-bg)] border-[var(--evt-orange-deep)] text-[var(--evt-orange-deep)] dark:bg-[var(--evt-orange-deep)] dark:text-white",
  red: "bg-[var(--evt-red-bg)] border-[var(--evt-red-deep)] text-[var(--evt-red-deep)] dark:bg-[var(--evt-red-deep)] dark:text-white",
  indigo: "bg-[var(--evt-indigo-bg)] border-[var(--evt-indigo-deep)] text-[var(--evt-indigo-deep)] dark:bg-[var(--evt-indigo-deep)] dark:text-white",
  pink: "bg-[var(--evt-pink-bg)] border-[var(--evt-pink-deep)] text-[var(--evt-pink-deep)] dark:bg-[var(--evt-pink-deep)] dark:text-white",
  yellow: "bg-[var(--evt-yellow-bg)] border-[var(--evt-yellow-deep)] text-[var(--evt-yellow-deep)] dark:bg-[var(--evt-yellow-deep)] dark:text-white",
  teal: "bg-[var(--evt-teal-bg)] border-[var(--evt-teal-deep)] text-[var(--evt-teal-deep)] dark:bg-[var(--evt-teal-deep)] dark:text-white",
};

// The pressed Group chip in a Space panel takes the Space's event-pill tint.
export const GROUP_CHIP_PRESSED_CLASSES: Record<EventColor, string> = {
  blue: "aria-pressed:border-[var(--evt-blue-bd)] aria-pressed:bg-[var(--evt-blue-bg)] aria-pressed:text-[var(--evt-blue-fg)] aria-pressed:hover:bg-[var(--evt-blue-bg)] aria-pressed:hover:text-[var(--evt-blue-fg)]",
  green: "aria-pressed:border-[var(--evt-green-bd)] aria-pressed:bg-[var(--evt-green-bg)] aria-pressed:text-[var(--evt-green-fg)] aria-pressed:hover:bg-[var(--evt-green-bg)] aria-pressed:hover:text-[var(--evt-green-fg)]",
  purple: "aria-pressed:border-[var(--evt-purple-bd)] aria-pressed:bg-[var(--evt-purple-bg)] aria-pressed:text-[var(--evt-purple-fg)] aria-pressed:hover:bg-[var(--evt-purple-bg)] aria-pressed:hover:text-[var(--evt-purple-fg)]",
  orange: "aria-pressed:border-[var(--evt-orange-bd)] aria-pressed:bg-[var(--evt-orange-bg)] aria-pressed:text-[var(--evt-orange-fg)] aria-pressed:hover:bg-[var(--evt-orange-bg)] aria-pressed:hover:text-[var(--evt-orange-fg)]",
  red: "aria-pressed:border-[var(--evt-red-bd)] aria-pressed:bg-[var(--evt-red-bg)] aria-pressed:text-[var(--evt-red-fg)] aria-pressed:hover:bg-[var(--evt-red-bg)] aria-pressed:hover:text-[var(--evt-red-fg)]",
  indigo: "aria-pressed:border-[var(--evt-indigo-bd)] aria-pressed:bg-[var(--evt-indigo-bg)] aria-pressed:text-[var(--evt-indigo-fg)] aria-pressed:hover:bg-[var(--evt-indigo-bg)] aria-pressed:hover:text-[var(--evt-indigo-fg)]",
  pink: "aria-pressed:border-[var(--evt-pink-bd)] aria-pressed:bg-[var(--evt-pink-bg)] aria-pressed:text-[var(--evt-pink-fg)] aria-pressed:hover:bg-[var(--evt-pink-bg)] aria-pressed:hover:text-[var(--evt-pink-fg)]",
  yellow: "aria-pressed:border-[var(--evt-yellow-bd)] aria-pressed:bg-[var(--evt-yellow-bg)] aria-pressed:text-[var(--evt-yellow-fg)] aria-pressed:hover:bg-[var(--evt-yellow-bg)] aria-pressed:hover:text-[var(--evt-yellow-fg)]",
  teal: "aria-pressed:border-[var(--evt-teal-bd)] aria-pressed:bg-[var(--evt-teal-bg)] aria-pressed:text-[var(--evt-teal-fg)] aria-pressed:hover:bg-[var(--evt-teal-bg)] aria-pressed:hover:text-[var(--evt-teal-fg)]",
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

// kalend-ui SpaceTile: unpressed tiles are muted; the open Space fills solid.
export const RAIL_TILE_PRESSED_CLASSES: Record<EventColor, string> = {
  blue: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-blue-deep)] aria-pressed:bg-[var(--evt-blue-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-blue-deep)] aria-pressed:hover:text-white",
  green: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-green-deep)] aria-pressed:bg-[var(--evt-green-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-green-deep)] aria-pressed:hover:text-white",
  purple: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-purple-deep)] aria-pressed:bg-[var(--evt-purple-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-purple-deep)] aria-pressed:hover:text-white",
  orange: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-orange-deep)] aria-pressed:bg-[var(--evt-orange-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-orange-deep)] aria-pressed:hover:text-white",
  red: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-red-deep)] aria-pressed:bg-[var(--evt-red-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-red-deep)] aria-pressed:hover:text-white",
  indigo: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-indigo-deep)] aria-pressed:bg-[var(--evt-indigo-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-indigo-deep)] aria-pressed:hover:text-white",
  pink: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-pink-deep)] aria-pressed:bg-[var(--evt-pink-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-pink-deep)] aria-pressed:hover:text-white",
  yellow: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-yellow-deep)] aria-pressed:bg-[var(--evt-yellow-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-yellow-deep)] aria-pressed:hover:text-white",
  teal: "aria-pressed:border-[1.5px] aria-pressed:border-[var(--evt-teal-deep)] aria-pressed:bg-[var(--evt-teal-deep)] aria-pressed:text-white aria-pressed:hover:bg-[var(--evt-teal-deep)] aria-pressed:hover:text-white",
}
