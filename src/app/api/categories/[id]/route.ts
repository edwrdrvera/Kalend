import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateCategoryBody {
  name?: string;
  color?: string;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body: UpdateCategoryBody = await request.json();

    const updates: Partial<typeof categories.$inferInsert> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { success: false, error: "name is required" },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    if (body.color !== undefined) updates.color = body.color;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const [updatedCategory] = await db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
      .returning();

    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedCategory });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // No manual cleanup of linked events/tasks needed here: their
    // category_id columns are FKs with ON DELETE SET NULL (see
    // drizzle/0004_natural_valkyrie.sql), so the database itself detaches
    // them the moment this row is gone.
    const [deletedCategory] = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
      .returning();

    if (!deletedCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deletedCategory });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
