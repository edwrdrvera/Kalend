import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { groups } from "@/db/schema/groups";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseGroupCreate } from "@/lib/api/group-body";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userGroups = await db.select().from(groups).where(eq(groups.user_id, user.id));
  return ok(userGroups);
});

export const POST = withUser(async (request, _context, user) => {
  const parsed = parseGroupCreate(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const body = parsed.value;

  // The Space stays locked until the insert commits, so a Space delete cannot
  // slip in between the ownership check and the new Group.
  const created = await retryTransaction(() => db.transaction(async (tx) => {
    const [space] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.id, body.category_id), eq(categories.user_id, user.id)))
      .for("update");
    if (!space) return null;
    const [group] = await tx
      .insert(groups)
      .values({ user_id: user.id, category_id: space.id, name: body.name })
      .returning();
    return group;
  }));
  if (!created) return fail("The selected Space is unavailable", 400);

  return ok(created, { status: 201 });
});
