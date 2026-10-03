import type { EventColor } from "./event-colors";
import type { CalendarTask } from "./calendar-types";

/**
 * Space Panel data contract (stubbed data model, v1).
 *
 * The panel opens for a *branch* under a Space (e.g. "School › CS 340"). The
 * app does not yet have a branch entity in the database; every field below is
 * currently fed from a stub source (`branch-stub.ts` / `branch-fixtures.ts`),
 * EXCEPT the panel's Open tasks, which resolve live from real task state
 * filtered by the branch's `spaceId`.
 *
 * When a real branch entity ships later, only the stub adapter changes; this
 * contract and every component bound to it stay the same.
 */

/**
 * A branch: the unit the Space Panel is bound to. Belongs to exactly one Space.
 * `spaceId` is the existing category UUID (see the Category-to-Space
 * compatibility contract in docs/adaptive-spaces-plan.md).
 */
export interface Branch {
  id: string;
  /** The category UUID this branch belongs to. */
  spaceId: string;
  /** Parent Space display name, shown as the small header label ("School"). */
  spaceName: string;
  /** Branch display heading ("CS 340"). */
  name: string;
  /** Inherited from the Space; drives the header color mark only. */
  color: EventColor;
  /** The Space's description. The panel shows no description section while it is empty. */
  description?: string | null;
}

/**
 * Resolve the branch's Open tasks from live task state. v1: tasks link to a
 * Space (category_id), not a branch, so a branch's Open tasks are the
 * incomplete tasks belonging to the branch's Space. When branch-level task
 * linkage ships, this is the single place that changes.
 */
export function resolveBranchTasks(
  branch: Branch,
  allTasks: CalendarTask[]
): CalendarTask[] {
  return allTasks.filter(
    (t) => t.category_id === branch.spaceId && !t.completed
  );
}
