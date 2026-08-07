import { db } from "@/db";
import { events } from "@/db/schema/events";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const allEvents = await db.select().from(events);

    return NextResponse.json({ success: true, data: allEvents });
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
  // TODO: derive from the authenticated session instead of trusting the
  // request body once feature/auth-middleware-protected-routes lands.
  user_id: string;
  color?: string;
}

export async function POST(request: Request) {
  try {
    const body: CreateEventBody = await request.json();

    if (!body.title || !body.start_at || !body.end_at || !body.user_id) {
      return NextResponse.json(
        {
          success: false,
          error: "title, start_at, end_at, and user_id are required",
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

    const [newEvent] = await db
      .insert(events)
      .values({
        title: body.title,
        start_at: startAt,
        end_at: endAt,
        user_id: body.user_id,
        color: body.color,
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
