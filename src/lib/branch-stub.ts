// Adapter: Space (CalendarCategory) -> Branch[].
//
// This is the single seam that changes when a real branch entity ships.
// Components bind to `Branch` (see branch-types.ts), never to this stub —
// swapping this file for a real data source (API call, DB query) later
// should require no changes anywhere else.
//
// v1 rule (stubbed data model): every Space has exactly one branch that
// mirrors the Space itself (same name, same color), with every optional
// section (meets/people/links) empty so those sections stay omitted in the
// panel UI.

import type { CalendarCategory } from "./calendar-types";
import { DEFAULT_EVENT_COLOR, isEventColor } from "./event-colors";
import type { Branch } from "./branch-types";

/** Deterministic, stable branch id for a Space's single v1 branch. */
function defaultBranchId(spaceId: string): string {
  return `${spaceId}:default`;
}

export function branchesForSpace(category: CalendarCategory): Branch[] {
  return [
    {
      id: defaultBranchId(category.id),
      spaceId: category.id,
      spaceName: category.name,
      name: category.name,
      color: isEventColor(category.color) ? category.color : DEFAULT_EVENT_COLOR,
      description: null,
      meets: [],
      people: [],
      links: [],
    },
  ];
}

export function branchesForSpaces(categories: CalendarCategory[]): Branch[] {
  return categories.flatMap(branchesForSpace);
}

export function findBranch(categories: CalendarCategory[], branchId: string): Branch | null {
  for (const category of categories) {
    const branch = branchesForSpace(category).find((b) => b.id === branchId);
    if (branch) return branch;
  }
  return null;
}
