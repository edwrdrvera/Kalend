import { db } from "@/db";
import { events } from "@/db/schema/events";
import { categories } from "@/db/schema/categories";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { isEventColor } from "@/lib/event-colors";
import { retryTransaction } from "@/lib/transaction-retry";
import { isUuid } from "@/lib/uuid";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface RouteContext { params: Promise<{ id: string }>; }
interface UpdateEventBody { title?: unknown; start_at?: unknown; end_at?: unknown; color?: unknown; color_overridden?: unknown; category_id?: unknown; }
const badRequest = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return badRequest("Request body must be an object");
    const body = parsed as UpdateEventBody;
    if (body.title !== undefined && typeof body.title !== "string") return badRequest("title must be a string");
    if (body.start_at !== undefined && typeof body.start_at !== "string") return badRequest("start_at must be a valid date");
    if (body.end_at !== undefined && typeof body.end_at !== "string") return badRequest("end_at must be a valid date");
    if (body.color !== undefined && (typeof body.color !== "string" || !isEventColor(body.color))) return badRequest("color must be a supported color");
    if (body.color_overridden !== undefined && typeof body.color_overridden !== "boolean") return badRequest("color_overridden must be a boolean");
    if (body.category_id !== undefined && body.category_id !== null && (typeof body.category_id !== "string" || !isUuid(body.category_id))) return badRequest("category_id must be a valid UUID");
    const startAt = body.start_at === undefined ? undefined : new Date(body.start_at);
    const endAt = body.end_at === undefined ? undefined : new Date(body.end_at);
    if (startAt && Number.isNaN(startAt.getTime())) return badRequest("start_at must be a valid date");
    if (endAt && Number.isNaN(endAt.getTime())) return badRequest("end_at must be a valid date");
    if (![body.title, body.start_at, body.end_at, body.color, body.color_overridden, body.category_id].some((v) => v !== undefined)) return badRequest("No updatable fields provided");

    const result = await retryTransaction(() => db.transaction(async (tx) => {
      const [existing] = await tx.select().from(events).where(and(eq(events.id, id), eq(events.user_id, user.id))).for("update");
      if (!existing) return null;
      const targetCategoryId = body.category_id === undefined ? existing.category_id : body.category_id;
      let targetCategory = null;
      if (targetCategoryId) {
        [targetCategory] = await tx.select().from(categories).where(and(eq(categories.id, targetCategoryId as string), eq(categories.user_id, user.id))).for("update");
        if (!targetCategory) return { categoryError: true } as const;
      }
      let visibleColor = existing.color;
      if (existing.category_id && !existing.color_overridden) {
        const [oldCategory] = await tx.select().from(categories).where(and(eq(categories.id, existing.category_id), eq(categories.user_id, user.id)));
        if (oldCategory) visibleColor = oldCategory.color ?? existing.color;
      }
      const updates: Partial<typeof events.$inferInsert> = {};
      if (body.title !== undefined) updates.title = body.title as string;
      if (startAt) updates.start_at = startAt;
      if (endAt) updates.end_at = endAt;
      if (body.category_id !== undefined) updates.category_id = body.category_id as string | null;
      if (body.color_overridden !== undefined) updates.color_overridden = body.color_overridden as boolean;
      if (body.color !== undefined) updates.color = body.color as string;
      else if (body.category_id === null || (body.color_overridden === false && !targetCategory)) updates.color = visibleColor;
      if ((startAt ?? existing.start_at) >= (endAt ?? existing.end_at)) return { timeError: true } as const;
      const [updated] = await tx.update(events).set(updates).where(and(eq(events.id, id), eq(events.user_id, user.id))).returning();
      return { updated } as const;
    }));
    if (!result) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    if ("categoryError" in result) return badRequest("The selected Space is unavailable");
    if ("timeError" in result) return badRequest("start_at must be before end_at");
    return NextResponse.json({ success: true, data: result.updated });
  } catch (error) {
    if (error instanceof SyntaxError) return badRequest("Request body must be valid JSON");
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const [deletedEvent] = await db.delete(events).where(and(eq(events.id, id), eq(events.user_id, user.id))).returning();
    if (!deletedEvent) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: deletedEvent });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
