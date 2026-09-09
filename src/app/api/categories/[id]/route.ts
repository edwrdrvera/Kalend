import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { events } from "@/db/schema/events";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { isEventColor } from "@/lib/event-colors";
import { retryTransaction } from "@/lib/transaction-retry";
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

    if (body.color !== undefined) {
      if (!isEventColor(body.color)) {
        return NextResponse.json({ success: false, error: "color must be a supported color" }, { status: 400 });
      }
      updates.color = body.color;
    }

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

    const result = await retryTransaction(() => db.transaction(async (tx) => {
      const [ownedCategory] = await tx
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
        .for("update");
      if (!ownedCategory) return null;

      // Locking the Space first prevents new links while its events are
      // snapshotted. Event PATCH uses bounded deadlock/serialization retry
      // for the inverse event-then-Space lock path.
      const linkedEvents = await tx
        .select()
        .from(events)
        .where(and(eq(events.category_id, id), eq(events.user_id, user.id)))
        .for("update");

      const detachedEvents = [];
      for (const event of linkedEvents) {
        const [detached] = await tx
          .update(events)
          .set({
            category_id: null,
            color: event.color_overridden ? event.color : (ownedCategory.color ?? event.color),
          })
          .where(and(eq(events.id, event.id), eq(events.user_id, user.id)))
          .returning();
        if (detached) detachedEvents.push(detached);
      }

      const [deletedCategory] = await tx
        .delete(categories)
        .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
        .returning();
      if (!deletedCategory) throw new Error("Category disappeared during deletion");
      return { deletedCategory, detachedEvents };
    }));

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.deletedCategory, events: result.detachedEvents });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
