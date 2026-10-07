import { describe, expect, it } from "bun:test";
import {
  membershipOf,
  reconcileMembership,
  touchesMembership,
  UNASSIGNED,
  type Membership,
  type MembershipPatch,
} from "../membership";

const SCHOOL = "space-school";
const WORK = "space-work";
const BIO = { id: "group-bio", category_id: SCHOOL };
const inGroup: Membership = { category_id: SCHOOL, group_id: BIO.id };
const inSpace: Membership = { category_id: SCHOOL, group_id: null };

describe("membershipOf", () => {
  it("narrows the three allowed states", () => {
    expect(membershipOf({ category_id: null, group_id: null })).toEqual(UNASSIGNED);
    expect(membershipOf({ category_id: SCHOOL, group_id: null })).toEqual(inSpace);
    expect(membershipOf({ category_id: SCHOOL, group_id: BIO.id })).toEqual(inGroup);
  });

  it("refuses a Group without a Space", () => {
    expect(() => membershipOf({ category_id: null, group_id: BIO.id })).toThrow();
  });
});

describe("reconcileMembership", () => {
  const cases: {
    name: string;
    current: Membership;
    patch: MembershipPatch;
    group?: { id: string; category_id: string } | null;
    expected: Membership | "group_unavailable" | "space_group_conflict";
  }[] = [
    { name: "nothing sent keeps a Group", current: inGroup, patch: {}, expected: inGroup },
    { name: "nothing sent keeps unassigned", current: UNASSIGNED, patch: {}, expected: UNASSIGNED },
    { name: "joining a Group derives its Space", current: UNASSIGNED, patch: { group_id: BIO.id }, group: BIO, expected: inGroup },
    { name: "joining a Group moves the item out of its old Space", current: { category_id: WORK, group_id: null }, patch: { group_id: BIO.id }, group: BIO, expected: inGroup },
    { name: "a matching category_id beside the Group is accepted", current: UNASSIGNED, patch: { group_id: BIO.id, category_id: SCHOOL }, group: BIO, expected: inGroup },
    { name: "a different category_id beside the Group conflicts", current: UNASSIGNED, patch: { group_id: BIO.id, category_id: WORK }, group: BIO, expected: "space_group_conflict" },
    { name: "category_id null beside a Group conflicts", current: inGroup, patch: { group_id: BIO.id, category_id: null }, group: BIO, expected: "space_group_conflict" },
    { name: "a Group that was not found is unavailable", current: UNASSIGNED, patch: { group_id: BIO.id }, group: null, expected: "group_unavailable" },
    { name: "a looked-up Group with another id is unavailable", current: UNASSIGNED, patch: { group_id: "group-other" }, group: BIO, expected: "group_unavailable" },
    { name: "group_id null leaves the Group and stays in the Space", current: inGroup, patch: { group_id: null }, expected: inSpace },
    { name: "group_id null on a Space-only item changes nothing", current: inSpace, patch: { group_id: null }, expected: inSpace },
    { name: "group_id null with a new Space moves to that Space", current: inGroup, patch: { group_id: null, category_id: WORK }, expected: { category_id: WORK, group_id: null } },
    { name: "group_id null with category_id null unassigns", current: inGroup, patch: { group_id: null, category_id: null }, expected: UNASSIGNED },
    { name: "another Space clears the Group", current: inGroup, patch: { category_id: WORK }, expected: { category_id: WORK, group_id: null } },
    { name: "the same Space keeps the Group", current: inGroup, patch: { category_id: SCHOOL }, expected: inGroup },
    { name: "category_id null clears Space and Group", current: inGroup, patch: { category_id: null }, expected: UNASSIGNED },
    { name: "an unassigned item moves into a Space", current: UNASSIGNED, patch: { category_id: WORK }, expected: { category_id: WORK, group_id: null } },
  ];

  for (const { name, current, patch, group = null, expected } of cases) {
    it(name, () => {
      const result = reconcileMembership(current, patch, group);
      if (typeof expected === "string") expect(result).toEqual({ ok: false, error: expected });
      else expect(result).toEqual({ ok: true, membership: expected });
    });
  }
});

describe("touchesMembership", () => {
  it("is true only when a membership field is named", () => {
    expect(touchesMembership({})).toBe(false);
    expect(touchesMembership({ group_id: null })).toBe(true);
    expect(touchesMembership({ category_id: null })).toBe(true);
  });
});
