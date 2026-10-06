import { and, eq } from "drizzle-orm";
import { categories, type Category } from "@/db/schema/categories";
import { groups } from "@/db/schema/groups";
import type { Tx } from "@/lib/api/alert-sync";
import { reconcileMembership, type Membership, type MembershipPatch, type ReconcileError } from "@/lib/membership";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";

export type MembershipError = ReconcileError | "space_unavailable";

export type ResolvedMembership =
  | { ok: true; membership: Membership; category: Category | null }
  | { ok: false; error: MembershipError };

const MESSAGES: Record<MembershipError, string> = {
  group_unavailable: "The selected Group is unavailable",
  space_group_conflict: "The selected Group belongs to a different Space",
  space_unavailable: "The selected Space is unavailable",
};

export const membershipErrorMessage = (error: MembershipError): string => MESSAGES[error];

/**
 * Inside the caller's transaction: finds the Group the patch names (scoped to
 * the caller), reconciles it with the item's current membership, locks the
 * resulting Space (also scoped to the caller), then the Group, and returns the
 * Space row for the route's color bookkeeping. A Group or Space that is missing or someone
 * else's gives the same answer, so a guessed id reveals nothing.
 */
export async function resolveItemMembership(
  tx: Tx,
  user: AuthenticatedUser,
  current: Membership,
  patch: MembershipPatch
): Promise<ResolvedMembership> {
  let group: { id: string; category_id: string } | null = null;
  if (typeof patch.group_id === "string") {
    [group = null] = await tx
      .select()
      .from(groups)
      .where(and(eq(groups.id, patch.group_id), eq(groups.user_id, user.id)));
  }

  const reconciled = reconcileMembership(current, patch, group);
  if (!reconciled.ok) return reconciled;

  const spaceId = reconciled.membership.category_id;
  if (spaceId === null) return { ok: true, membership: reconciled.membership, category: null };

  const [category] = await tx
    .select()
    .from(categories)
    .where(and(eq(categories.id, spaceId), eq(categories.user_id, user.id)))
    .for("update");
  if (!category) return { ok: false, error: "space_unavailable" };

  if (group) {
    // Taken after the Space lock, the order a Group delete uses, so the two cannot deadlock.
    // The shared lock keeps a concurrent Group delete from finishing before this item is written.
    const [still] = await tx
      .select()
      .from(groups)
      .where(and(eq(groups.id, group.id), eq(groups.user_id, user.id)))
      .for("share");
    if (!still) return { ok: false, error: "group_unavailable" };
  }
  return { ok: true, membership: reconciled.membership, category };
}
