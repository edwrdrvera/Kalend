import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { categories } from "@/db/schema/categories";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { isEventColor } from "@/lib/event-colors";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateTaskBody {
  title?: string;
  due_at?: string | null;
  completed?: boolean;
  color?: string;
  color_overridden?: boolean;
  // string sets the link, null clears it (falls back to `color`), omitted
  // leaves it untouched — same convention as `due_at` above.
  category_id?: string | null;
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
    const body: UpdateTaskBody = await request.json();

    if (body.color !== undefined && !isEventColor(body.color)) {
      return NextResponse.json(
        { success: false, error: "color must be a supported color" },
        { status: 400 }
      );
    }

    // Validate category ownership when setting (not clearing) a category.
    if (body.category_id) {
      const [cat] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, body.category_id), eq(categories.user_id, user.id)));
      if (!cat) {
        return NextResponse.json(
          { success: false, error: "category_id does not exist or does not belong to you" },
          { status: 400 }
        );
      }
    }

    const updates: Partial<typeof tasks.$inferInsert> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json(
          { success: false, error: "title is required" },
          { status: 400 }
        );
      }
      updates.title = body.title;
    }

    if (body.completed !== undefined) updates.completed = body.completed;
    if (body.color !== undefined) updates.color = body.color;
    if (body.color_overridden !== undefined) updates.color_overridden = body.color_overridden;
    if (body.category_id !== undefined) updates.category_id = body.category_id;

    // due_at: null explicitly clears the due date (moves the task back to
    // the undated inbox); omitted leaves it untouched.
    if (body.due_at !== undefined) {
      if (body.due_at === null) {
        updates.due_at = null;
      } else {
        const dueAt = new Date(body.due_at);
        if (Number.isNaN(dueAt.getTime())) {
          return NextResponse.json(
            { success: false, error: "due_at must be a valid date" },
            { status: 400 }
          );
        }
        updates.due_at = dueAt;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
      .returning();

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedTask });
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

    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
      .returning();

    if (!deletedTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deletedTask });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
