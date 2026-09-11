import { db } from "@/db";
import { events } from "@/db/schema/events";
import { categories } from "@/db/schema/categories";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { isEventColor } from "@/lib/event-colors";
import { retryTransaction } from "@/lib/transaction-retry";
import { isUuid } from "@/lib/uuid";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEvents = await db
      .select()
      .from(events)
      .where(eq(events.user_id, user.id));

    return NextResponse.json({ success: true, data: userEvents });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

interface CreateEventBody {
  title?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  color?: unknown;
  color_overridden?: unknown;
  category_id?: unknown;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { success: false, error: "Request body must be valid JSON" },
          { status: 400 }
        );
      }
      throw error;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ success: false, error: "Request body must be an object" }, { status: 400 });
    }
    const body = parsed as CreateEventBody;

    if (typeof body.title !== "string" || !body.title.trim() || typeof body.start_at !== "string" || typeof body.end_at !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "title, start_at, and end_at are required",
        },
        { status: 400 }
      );
    }

    const startAt = new Date(body.start_at);
    const endAt = new Date(body.end_at);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "start_at and end_at must be valid dates" },
        { status: 400 }
      );
    }

    if (startAt >= endAt) {
      return NextResponse.json(
        { success: false, error: "start_at must be before end_at" },
        { status: 400 }
      );
    }

    if (body.color !== undefined && (typeof body.color !== "string" || !isEventColor(body.color))) {
      return NextResponse.json(
        { success: false, error: "color must be a supported color" },
        { status: 400 }
      );
    }

    if (body.color_overridden !== undefined && typeof body.color_overridden !== "boolean") {
      return NextResponse.json({ success: false, error: "color_overridden must be a boolean" }, { status: 400 });
    }
    if (body.category_id !== undefined && body.category_id !== null && (typeof body.category_id !== "string" || !isUuid(body.category_id))) {
      return NextResponse.json({ success: false, error: "Space must be a valid identifier" }, { status: 400 });
    }

    const result = await retryTransaction(() => db.transaction(async (tx) => {
      let category = null;
      if (body.category_id) {
        [category] = await tx
          .select()
          .from(categories)
          .where(and(eq(categories.id, body.category_id as string), eq(categories.user_id, user.id)))
          .for("update");
        if (!category) return null;
      }

      const [newEvent] = await tx
        .insert(events)
        .values({
          title: (body.title as string).trim(),
          start_at: startAt,
          end_at: endAt,
          user_id: user.id,
          color: body.color as string | undefined,
          color_overridden: body.color_overridden as boolean | undefined ?? false,
          category_id: (body.category_id as string | null | undefined) ?? null,
        })
        .returning();
      return newEvent;
    }));
    if (!result) {
      return NextResponse.json(
        { success: false, error: "The selected Space is unavailable" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
