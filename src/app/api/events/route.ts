import { db } from "@/db";
import { events } from "@/db/schema/events";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { eq } from "drizzle-orm";
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
  title: string;
  start_at: string;
  end_at: string;
  color?: string;
  category_id?: string | null;
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

    const body: CreateEventBody = await request.json();

    if (!body.title || !body.start_at || !body.end_at) {
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

    const [newEvent] = await db
      .insert(events)
      .values({
        title: body.title,
        start_at: startAt,
        end_at: endAt,
        user_id: user.id,
        color: body.color,
        category_id: body.category_id ?? null,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: newEvent },
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
