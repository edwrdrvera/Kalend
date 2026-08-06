// Shared color palette for events, used by both the month grid (rendering
// event pills) and the event modal (color picker). Kept in one place so the
// two never drift out of sync.
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

export function isEventColor(color: string | null | undefined): color is EventColor {
  return !!color && (EVENT_COLORS as readonly string[]).includes(color);
}

// Tailwind can't see class names built with string interpolation (e.g.
// `bg-${color}-500`) — its scanner only picks up whole class strings that
// appear literally in source, so color-coding driven by the event's
// freeform `color` string needs an explicit lookup table like this instead.
export const EVENT_COLOR_CLASSES: Record<EventColor, string> = {
  blue: "bg-blue-500/20 text-blue-300",
  green: "bg-green-500/20 text-green-300",
  purple: "bg-purple-500/20 text-purple-300",
  orange: "bg-orange-500/20 text-orange-300",
  red: "bg-red-500/20 text-red-300",
  indigo: "bg-indigo-500/20 text-indigo-300",
  pink: "bg-pink-500/20 text-pink-300",
  yellow: "bg-yellow-500/20 text-yellow-300",
  teal: "bg-teal-500/20 text-teal-300",
};

export const DEFAULT_EVENT_COLOR_CLASSES = "bg-neutral-700/40 text-neutral-300";

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
