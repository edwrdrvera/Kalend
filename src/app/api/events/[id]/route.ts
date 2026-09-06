import { db } from "@/db";
import { events } from "@/db/schema/events";
import { categories } from "@/db/schema/categories";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { isEventColor } from "@/lib/event-colors";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateEventBody {
  title?: string;
  start_at?: string;
  end_at?: string;
  color?: string;
  color_overridden?: boolean;
  // string sets the link, null clears it (falls back to `color`), omitted
  // leaves it untouched — same convention as `due_at` on tasks.
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
    const body: UpdateEventBody = await request.json();

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

    const updates: Partial<typeof events.$inferInsert> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.color !== undefined) updates.color = body.color;
    if (body.color_overridden !== undefined) updates.color_overridden = body.color_overridden;
    if (body.category_id !== undefined) updates.category_id = body.category_id;

    if (body.start_at !== undefined) {
      const startAt = new Date(body.start_at);
      if (Number.isNaN(startAt.getTime())) {
        return NextResponse.json(
          { success: false, error: "start_at must be a valid date" },
          { status: 400 }
        );
      }
      updates.start_at = startAt;
    }

    if (body.end_at !== undefined) {
      const endAt = new Date(body.end_at);
      if (Number.isNaN(endAt.getTime())) {
        return NextResponse.json(
          { success: false, error: "end_at must be a valid date" },
          { status: 400 }
        );
      }
      updates.end_at = endAt;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    // Only enforced when both are present in the same request, matching how
    // every caller (create/edit modal, drag-move, drag-resize) sends them
    // together. A partial patch touching just one side can't be validated
    // here without an extra read of the existing row.
    if (
      updates.start_at !== undefined &&
      updates.end_at !== undefined &&
      updates.start_at >= updates.end_at
    ) {
      return NextResponse.json(
        { success: false, error: "start_at must be before end_at" },
        { status: 400 }
      );
    }

    const [updatedEvent] = await db
      .update(events)
      .set(updates)
      .where(and(eq(events.id, id), eq(events.user_id, user.id)))
      .returning();

    if (!updatedEvent) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedEvent });
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

    const [deletedEvent] = await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.user_id, user.id)))
      .returning();

    if (!deletedEvent) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deletedEvent });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
