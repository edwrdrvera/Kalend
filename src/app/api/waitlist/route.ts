import { db } from "@/db";
import { waitlist } from "@/db/schema/waitlist";
import { NextResponse } from "next/server";

// Public endpoint: no auth. Anyone can join the waitlist from the landing
// page, so there's no user_id to scope by here (see api/CLAUDE.md's
// access-control rule, which applies to user-owned data, not this table).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface JoinWaitlistBody {
  email: string;
}

export async function POST(request: Request) {
  try {
    const body: JoinWaitlistBody = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    try {
      await db.insert(waitlist).values({ email });
    } catch (error) {
      // Unique violation (already on the list): treat as success rather
      // than leaking whether an email is already signed up.
      const code = (error as { code?: string })?.code;
      if (code !== "23505") {
        throw error;
      }
    }

    return NextResponse.json({ success: true, data: { email } }, { status: 201 });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
