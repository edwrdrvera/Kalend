import { db } from "@/db";
import { alerts } from "@/db/schema/alerts";
import { withUser, ok, fail } from "@/lib/api/route-handler";
import { isUuid } from "@/lib/uuid";
import { and, eq } from "drizzle-orm";

interface RouteContext { params: Promise<{ id: string }>; }

export const DELETE = withUser(async (_request, { params }: RouteContext, user) => {
  const { id } = await params;
  if (!isUuid(id)) return fail("Alert not found", 404);

  const [deleted] = await db
    .delete(alerts)
    .where(and(eq(alerts.id, id), eq(alerts.user_id, user.id)))
    .returning();
  if (!deleted) return fail("Alert not found", 404);

  return ok(deleted);
});
