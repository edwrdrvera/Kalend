/** The only three states an item can be in. A Group without a Space is unrepresentable. */
export type Membership =
  | { category_id: null; group_id: null }
  | { category_id: string; group_id: null }
  | { category_id: string; group_id: string };

export const UNASSIGNED: Membership = { category_id: null, group_id: null };

/** Narrows a wire or stored item. The database CHECK forbids a Group without a Space. */
export function membershipOf(item: { category_id: string | null; group_id: string | null }): Membership {
  if (item.category_id === null) {
    if (item.group_id !== null) throw new Error("An item cannot be in a Group without a Space");
    return UNASSIGNED;
  }
  return item.group_id === null
    ? { category_id: item.category_id, group_id: null }
    : { category_id: item.category_id, group_id: item.group_id };
}

/** What a client may send. An absent key leaves the field alone and null clears it. */
export interface MembershipPatch {
  category_id?: string | null;
  group_id?: string | null;
}

export type ReconcileError = "group_unavailable" | "space_group_conflict";

export type Reconciled = { ok: true; membership: Membership } | { ok: false; error: ReconcileError };

/**
 * The single rule for what membership a patch produces.
 *   group_id is a string: the Space is derived from the Group, and a category_id
 *     sent alongside it must agree.
 *   group_id is null: leave the Group and stay in category_id (patched or current).
 *   group_id is absent and category_id names another Space: the Group is cleared,
 *     because it belonged to the old Space.
 *   group_id is absent and category_id is the current Space: nothing changes.
 *   neither is sent: the current membership.
 * `patchedGroup` is the row for patch.group_id, which only the server can look up.
 */
export function reconcileMembership(
  current: Membership,
  patch: MembershipPatch,
  patchedGroup: { id: string; category_id: string } | null
): Reconciled {
  if (typeof patch.group_id === "string") {
    if (!patchedGroup || patchedGroup.id !== patch.group_id) return { ok: false, error: "group_unavailable" };
    if (patch.category_id !== undefined && patch.category_id !== patchedGroup.category_id) {
      return { ok: false, error: "space_group_conflict" };
    }
    return { ok: true, membership: { category_id: patchedGroup.category_id, group_id: patchedGroup.id } };
  }

  const category_id = patch.category_id === undefined ? current.category_id : patch.category_id;
  if (category_id === null) return { ok: true, membership: UNASSIGNED };
  if (patch.group_id === null) return { ok: true, membership: { category_id, group_id: null } };
  const stays = category_id === current.category_id;
  return {
    ok: true,
    membership: stays && current.group_id !== null
      ? { category_id, group_id: current.group_id }
      : { category_id, group_id: null },
  };
}

/** True when the patch names a membership field, so the server must resolve it. */
export const touchesMembership = (patch: MembershipPatch): boolean =>
  patch.category_id !== undefined || patch.group_id !== undefined;
