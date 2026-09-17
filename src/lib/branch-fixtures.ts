import type { Branch } from "./branch-types";

/**
 * Sample branches for design review, previews, and unit tests ONLY.
 *
 * These are NOT shipped to users. The live app derives branches through
 * `branch-stub.ts` (which returns empty Meets/People/Links until those fields
 * exist in the data model, so those sections are omitted). Fixtures exist so
 * section components and the panel shell can be built and tested at full
 * fidelity now.
 */

export const FIXTURE_BRANCH_FULL: Branch = {
  id: "fixture-cs340",
  spaceId: "fixture-school",
  spaceName: "School",
  name: "CS 340",
  color: "blue",
  description: "Databases & Information Systems. Wolfe 214.",
  meets: [
    { label: "Lecture", pattern: "Tue, Thu · 10:00" },
    { label: "Lab", pattern: "Fri · 14:00" },
  ],
  people: [
    { id: "p1", name: "Dr. Wolfe", role: "Instructor" },
    { id: "p2", name: "Priya Nair", role: "TA" },
  ],
  links: [
    { id: "l1", label: "Course syllabus", href: "https://example.edu/cs340" },
    { id: "l2", label: "Assignment portal", href: "https://example.edu/portal" },
  ],
};

/** A branch with only a heading + tasks (every optional section empty). */
export const FIXTURE_BRANCH_SPARSE: Branch = {
  id: "fixture-social",
  spaceId: "fixture-personal",
  spaceName: "Personal",
  name: "Weekend plans",
  color: "green",
  description: null,
  meets: [],
  people: [],
  links: [],
};
