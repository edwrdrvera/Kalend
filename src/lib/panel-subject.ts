import { DEFAULT_EVENT_COLOR, isEventColor, type EventColor } from "./event-colors";
import type { CalendarCategory, CalendarGroup, CalendarTask } from "./calendar-types";
import type { Membership } from "./membership";

/**
 * What the Space panel is bound to: a whole Space, or one Group inside it.
 * A Group takes its color from its Space and has no description of its own.
 */
export type PanelSubject =
  | { kind: "space"; spaceId: string; name: string; color: EventColor; description: string | null }
  | { kind: "group"; groupId: string; name: string; spaceId: string; spaceName: string; color: EventColor };

export type SubjectSelection = { kind: "space"; spaceId: string } | { kind: "group"; groupId: string };

/** A Space's color, or the default when the stored value is not a known color. */
export const spaceColor = (space: CalendarCategory): EventColor =>
  isEventColor(space.color) ? space.color : DEFAULT_EVENT_COLOR;

/** Resolves a stored selection against live data. Null means it was deleted or is not the caller's, so the panel closes. */
export function resolveSubject(
  selection: SubjectSelection,
  spaces: readonly CalendarCategory[],
  groups: readonly CalendarGroup[]
): PanelSubject | null {
  if (selection.kind === "space") {
    const space = spaces.find((s) => s.id === selection.spaceId);
    return space
      ? { kind: "space", spaceId: space.id, name: space.name, color: spaceColor(space), description: space.description }
      : null;
  }
  const group = groups.find((g) => g.id === selection.groupId);
  const space = group ? spaces.find((s) => s.id === group.category_id) : undefined;
  return group && space
    ? {
        kind: "group",
        groupId: group.id,
        name: group.name,
        spaceId: space.id,
        spaceName: space.name,
        color: spaceColor(space),
      }
    : null;
}

/** A stable key for the subject, so the panel body resets when it swaps. */
export const subjectKey = (subject: PanelSubject): string =>
  subject.kind === "space" ? `space:${subject.spaceId}` : `group:${subject.groupId}`;

/** True when the item belongs to the subject. A Space includes its Groups' items, each once. */
export function inSubject(
  subject: PanelSubject,
  item: { category_id: string | null; group_id: string | null }
): boolean {
  return subject.kind === "group" ? item.group_id === subject.groupId : item.category_id === subject.spaceId;
}

/** The subject's open tasks. */
export function subjectTasks(subject: PanelSubject, tasks: readonly CalendarTask[]): CalendarTask[] {
  return tasks.filter((task) => !task.completed && inSubject(subject, task));
}

/** The membership a new item starts with when it is created from the subject's panel. */
export const membershipForSubject = (subject: PanelSubject): Membership =>
  subject.kind === "group"
    ? { category_id: subject.spaceId, group_id: subject.groupId }
    : { category_id: subject.spaceId, group_id: null };
