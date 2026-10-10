import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { parseCategoryCreate } from "@/lib/api/category-body";
import { eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.user_id, user.id));

  return ok(userCategories);
});

export const POST = withUser(async (request, _context, user) => {
  const parsed = parseCategoryCreate(await request.json());
  if (!parsed.ok) return fail(parsed.error, 400);
  const { name, color, description } = parsed.value;

  const [newCategory] = await db
    .insert(categories)
    .values({
      name,
      user_id: user.id,
      color,
      description: description ?? null,
    })
    .returning();

  return ok(newCategory, { status: 201 });
});
