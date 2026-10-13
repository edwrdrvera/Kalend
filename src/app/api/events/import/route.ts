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
import { and, eq, inArray, sql } from "drizzle-orm";

export const POST = withUser(async (request, _context, user) => {
  const body = await readBoundedCalendar(request);
  if ("error" in body) return fail(body.error, 413);
  const text = body.text;

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

    let updated = 0;
    let unchanged = 0;
    const fresh: ImportedEvent[] = [];
    for (const event of parsed.events) {
      const key = `${event.importUid}\0${event.importOccurrence}`;
      const row = byKey.get(key);
      if (!row) {
        fresh.push(event);
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

    let imported = 0;
    if (fresh.length > 0) {
      // One statement for the new rows. A second import of the same new event
      // can commit between the read above and this insert. The identity index
      // then updates that row instead of raising a unique violation. xmax is 0
      // only for a row this statement created, so the racing one counts as an update.
      const saved = await tx
        .insert(events)
        .values(fresh.map((event) => ({
          title: event.title,
          start_at: event.startAt,
          end_at: event.endAt,
          color: DEFAULT_EVENT_COLOR,
          color_overridden: false,
          category_id: null,
          group_id: null,
          location: event.location,
          description: event.description,
          import_uid: event.importUid,
          import_occurrence: event.importOccurrence,
          user_id: user.id,
        })))
        .onConflictDoUpdate({
          target: [events.user_id, events.import_uid, events.import_occurrence],
          targetWhere: sql`${events.import_uid} is not null`,
          setWhere: sql`(${events.title}, ${events.start_at}, ${events.end_at}, ${events.location}, ${events.description}) is distinct from (excluded.title, excluded.start_at, excluded.end_at, excluded.location, excluded.description)`,
          set: {
            title: sql`excluded.title`,
            start_at: sql`excluded.start_at`,
            end_at: sql`excluded.end_at`,
            location: sql`excluded.location`,
            description: sql`excluded.description`,
          },
        })
        .returning({
          id: events.id,
          start_at: events.start_at,
          import_uid: events.import_uid,
          import_occurrence: events.import_occurrence,
          inserted: sql<boolean>`(xmax = 0)`.as("inserted"),
        });
      const freshByKey = new Map(fresh.map((event) => [`${event.importUid}\0${event.importOccurrence}`, event]));
      for (const row of saved) {
        if (row.inserted) {
          imported += 1;
          continue;
        }
        updated += 1;
        const event = freshByKey.get(`${row.import_uid ?? ""}\0${row.import_occurrence ?? ""}`);
        if (!event) continue;
        await rescheduleAlerts(tx, user, { kind: "event", id: row.id }, event.startAt, new Date());
      }
      unchanged += fresh.length - saved.length;
    }
    return { imported, updated, unchanged, skipped: parsed.skipped };
  }));

  return ok(counts);
});

// request.text() buffers a chunked upload before any check, so a body with no
// Content-Length could pass the 2 MB cap. Stop reading once the cap is crossed.
async function readBoundedCalendar(request: Request): Promise<{ text: string } | { error: string }> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_ICS_BYTES) return { error: ICS_TOO_LARGE_MESSAGE };

  const reader = request.body?.getReader();
  if (!reader) return { text: "" };

  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return { text: text + decoder.decode() };
    received += value.byteLength;
    if (received > MAX_ICS_BYTES) {
      await reader.cancel();
      return { error: ICS_TOO_LARGE_MESSAGE };
    }
    text += decoder.decode(value, { stream: true });
  }
}

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
