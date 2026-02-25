import { db } from "@/db";
import { events } from "@/db/schema/events";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const allEvents = await db.select().from(events);

    // FIX: Remove the brackets around allEvents
    return NextResponse.json({ success: true, data: allEvents });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
