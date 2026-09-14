import { describe, expect, it } from "bun:test";
import { branchesForSpace, branchesForSpaces, findBranch } from "../branch-stub";
import type { CalendarCategory } from "../calendar-types";

const school: CalendarCategory = { id: "cat-school", name: "School", color: "blue" };
const personal: CalendarCategory = { id: "cat-personal", name: "Personal", color: "invalid-color" };
const noColor: CalendarCategory = { id: "cat-none", name: "Errands", color: null };

describe("branchesForSpace", () => {
  it("maps a Space onto exactly one Branch with mirrored fields", () => {
    const branches = branchesForSpace(school);
    expect(branches).toHaveLength(1);
    expect(branches[0]).toEqual({
      id: "cat-school:default",
      spaceId: "cat-school",
      spaceName: "School",
      name: "School",
      color: "blue",
      description: null,
      meets: [],
      people: [],
      links: [],
    });
  });

  it("derives a deterministic id, stable across calls", () => {
    const first = branchesForSpace(school)[0].id;
    const second = branchesForSpace(school)[0].id;
    expect(first).toBe(second);
    expect(first).toBe("cat-school:default");
  });

  it("falls back to the default event color when the Space color is not a valid EventColor", () => {
    expect(branchesForSpace(personal)[0].color).toBe("blue");
    expect(branchesForSpace(noColor)[0].color).toBe("blue");
  });
});

describe("branchesForSpaces", () => {
  it("flat maps branches across multiple Spaces", () => {
    const branches = branchesForSpaces([school, personal, noColor]);
    expect(branches).toHaveLength(3);
    expect(branches.map((b) => b.id)).toEqual([
      "cat-school:default",
      "cat-personal:default",
      "cat-none:default",
    ]);
  });

  it("returns an empty array for an empty Space list", () => {
    expect(branchesForSpaces([])).toEqual([]);
  });
});

describe("findBranch", () => {
  const categories = [school, personal, noColor];

  it("finds a branch by id across Spaces", () => {
    const found = findBranch(categories, "cat-personal:default");
    expect(found).not.toBeNull();
    expect(found?.spaceId).toBe("cat-personal");
    expect(found?.name).toBe("Personal");
  });

  it("returns null when no branch matches", () => {
    expect(findBranch(categories, "does-not-exist")).toBeNull();
  });

  it("returns null for an empty Space list", () => {
    expect(findBranch([], "cat-school:default")).toBeNull();
  });
});
