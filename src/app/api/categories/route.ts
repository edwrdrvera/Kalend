import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { isEventColor } from "@/lib/event-colors";
import { eq } from "drizzle-orm";

export const GET = withUser(async (_request, _context, user) => {
  const userCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.user_id, user.id));

  return ok(userCategories);
});

interface CreateCategoryBody {
  name?: unknown;
  color?: unknown;
}

export const POST = withUser(async (request, _context, user) => {
  const parsed: unknown = await request.json();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("Request body must be an object", 400);
  }
  const body = parsed as CreateCategoryBody;

  if (body.name === undefined) {
    return fail("name is required", 400);
  }
  if (typeof body.name !== "string") {
    return fail("name must be a string", 400);
  }
  if (!body.name.trim()) {
    return fail("name is required", 400);
  }
  if (body.color !== undefined && (typeof body.color !== "string" || !isEventColor(body.color))) {
    return fail("color must be a supported color", 400);
  }

  const [newCategory] = await db
    .insert(categories)
    .values({
      name: body.name.trim(),
      user_id: user.id,
      color: body.color as string | undefined,
    })
    .returning();

  return ok(newCategory, { status: 201 });
});
