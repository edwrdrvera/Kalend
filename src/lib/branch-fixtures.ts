import type { Branch } from "./branch-types";

/**
 * Sample branches for design review, previews, and unit tests ONLY.
 *
 * These are NOT shipped to users. The live app derives branches through
 * `branch-stub.ts`.
 */

export const FIXTURE_BRANCH_FULL: Branch = {
  id: "fixture-cs340",
  spaceId: "fixture-school",
  spaceName: "School",
  name: "CS 340",
  color: "blue",
  description: "Databases & Information Systems. Wolfe 214.",
};

/** A branch with only a heading. */
export const FIXTURE_BRANCH_SPARSE: Branch = {
  id: "fixture-social",
  spaceId: "fixture-personal",
  spaceName: "Personal",
  name: "Weekend plans",
  color: "green",
  description: null,
};
