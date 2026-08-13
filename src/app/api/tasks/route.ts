import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
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

    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.user_id, user.id));

    return NextResponse.json({ success: true, data: userTasks });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

interface CreateTaskBody {
  title: string;
  due_at?: string;
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

    const body: CreateTaskBody = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    let dueAt: Date | undefined;
    if (body.due_at !== undefined) {
      dueAt = new Date(body.due_at);
      if (Number.isNaN(dueAt.getTime())) {
        return NextResponse.json(
          { success: false, error: "due_at must be a valid date" },
          { status: 400 }
        );
      }
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        title: body.title,
        // Omit the key entirely when no due date was given, instead of
        // passing `due_at: undefined`, so the column gets a real `null`
        // rather than an explicit-but-empty insert value.
        ...(dueAt !== undefined ? { due_at: dueAt } : {}),
        user_id: user.id,
        color: body.color,
        category_id: body.category_id ?? null,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: newTask },
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
