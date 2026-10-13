import { db } from "@/db";
import { events } from "@/db/schema/events";
import { rescheduleAlerts } from "@/lib/api/alert-sync";
import { parseIcs, type ImportedEvent } from "@/lib/api/ics-import";
import { fail, ok, withUser } from "@/lib/api/route-handler";
import { DEFAULT_EVENT_COLOR } from "@/lib/event-colors";
import {
  ICS_FILE_REQUIRED_MESSAGE,
  ICS_TOO_LARGE_MESSAGE,
  MAX_ICS_BYTES,
} from "@/lib/ics-limits";
import { retryTransaction } from "@/lib/transaction-retry";
import { and, eq, inArray } from "drizzle-orm";

export const POST = withUser(async (request, _context, user) => {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_ICS_BYTES) return fail(ICS_TOO_LARGE_MESSAGE, 413);

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_ICS_BYTES) return fail(ICS_TOO_LARGE_MESSAGE, 413);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("text/calendar")) return fail(ICS_FILE_REQUIRED_MESSAGE, 400);

  const tz = new URL(request.url).searchParams.get("tz") ?? "";
  const parsed = parseIcs(text, { now: new Date(), tz });
  if ("error" in parsed) return fail(parsed.error, 400);

  if (parsed.events.length === 0) {
    return ok({ imported: 0, updated: 0, unchanged: 0, skipped: parsed.skipped });
  }

  const counts = await retryTransaction(() => db.transaction(async (tx) => {
    const uids = [...new Set(parsed.events.map((event) => event.importUid))];
    const existing = await tx
      .select()
      .from(events)
      .where(and(eq(events.user_id, user.id), inArray(events.import_uid, uids)))
      .for("update");
    const byKey = new Map(existing.map((row) => [`${row.import_uid}\0${row.import_occurrence ?? ""}`, row]));

    let imported = 0;
    let updated = 0;
    let unchanged = 0;
    for (const event of parsed.events) {
      const key = `${event.importUid}\0${event.importOccurrence}`;
      const row = byKey.get(key);
      if (!row) {
        const [created] = await tx
          .insert(events)
          .values({
            title: event.title,
            start_at: event.startAt,
            end_at: event.endAt,
            user_id: user.id,
            color: DEFAULT_EVENT_COLOR,
            color_overridden: false,
            category_id: null,
            group_id: null,
            location: event.location,
            description: event.description,
            import_uid: event.importUid,
            import_occurrence: event.importOccurrence,
          })
          .returning();
        byKey.set(key, created);
        imported += 1;
        continue;
      }
      if (sameImportedFields(row, event)) {
        unchanged += 1;
        continue;
      }
      const startChanged = row.start_at.getTime() !== event.startAt.getTime();
      const [saved] = await tx
        .update(events)
        .set({
          title: event.title,
          start_at: event.startAt,
          end_at: event.endAt,
          location: event.location,
          description: event.description,
        })
        .where(and(eq(events.id, row.id), eq(events.user_id, user.id)))
        .returning();
      if (startChanged) await rescheduleAlerts(tx, user, { kind: "event", id: row.id }, event.startAt, new Date());
      if (saved) byKey.set(key, saved);
      updated += 1;
    }
    return { imported, updated, unchanged, skipped: parsed.skipped };
  }));

  return ok(counts);
});

function sameImportedFields(
  row: { title: string; start_at: Date; end_at: Date; location: string | null; description: string | null },
  event: ImportedEvent,
): boolean {
  return row.title === event.title
    && row.start_at.getTime() === event.startAt.getTime()
    && row.end_at.getTime() === event.endAt.getTime()
    && (row.location ?? null) === event.location
    && (row.description ?? null) === event.description;
}
