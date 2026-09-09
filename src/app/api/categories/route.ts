import { db } from "@/db";
import { categories } from "@/db/schema/categories";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { isEventColor } from "@/lib/event-colors";
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

    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, user.id));

    return NextResponse.json({ success: true, data: userCategories });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

interface CreateCategoryBody {
  name?: unknown;
  color?: unknown;
}

const badRequest = (error: string) =>
  NextResponse.json({ success: false, error }, { status: 400 });

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
        return badRequest("Request body must be valid JSON");
      }
      throw error;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return badRequest("Request body must be an object");
    }
    const body = parsed as CreateCategoryBody;

    if (body.name === undefined) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }
    if (typeof body.name !== "string") {
      return badRequest("name must be a string");
    }
    if (!body.name.trim()) {
      return badRequest("name is required");
    }
    if (body.color !== undefined && (typeof body.color !== "string" || !isEventColor(body.color))) {
      return NextResponse.json({ success: false, error: "color must be a supported color" }, { status: 400 });
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name: body.name.trim(),
        user_id: user.id,
        color: body.color as string | undefined,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: newCategory },
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
