import { db } from "@/db";
import { events } from "@/db/schema/events";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
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

    const updates: Partial<typeof events.$inferInsert> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.color !== undefined) updates.color = body.color;
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
