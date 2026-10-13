import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

// The in-memory route tests fake the identity conflict. This file runs the
// import twice against the scratch database CI migrates, which is the only
// place the unique index and xmax are real. It skips without
// SCHEMA_TEST_DATABASE_URL, the same way the groups schema tests do.
const url = process.env.SCHEMA_TEST_DATABASE_URL;
const appUrl = process.env.DATABASE_URL;

// Route tests earlier in the same process replace @/db with an in-memory
// client, and that replacement stays in place. The import handler reads
// @/db, so this file has to put a real client back before it loads the route.
const appClient = url && appUrl ? postgres(appUrl, { prepare: false }) : undefined;
if (appClient) mock.module("@/db", () => ({ db: drizzle(appClient, { schema }) }));

const USER = "44444444-4444-4444-4444-444444444444";
const OTHER = "55555555-5555-5555-5555-555555555555";

mock.module("@/lib/supabase/auth-user", () => ({
  getAuthenticatedUser: async () => ({ id: USER }),
}));

const fixture = (name: string) =>
  readFileSync(join(import.meta.dir, "../../../../lib/__tests__/fixtures", name), "utf8");

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function countsFrom(value: unknown): { imported: number; updated: number; unchanged: number } {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) {
    throw new Error("import response was not a success");
  }
  const imported = value.data.imported;
  const updated = value.data.updated;
  const unchanged = value.data.unchanged;
  if (typeof imported !== "number" || typeof updated !== "number" || typeof unchanged !== "number") {
    throw new Error("import response is missing counts");
  }
  return { imported, updated, unchanged };
}

describe.skipIf(!url || !appClient)("calendar import on the real database", () => {
  const sql = postgres(url!, { prepare: false, onnotice: () => {} });
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import("../import/route"));
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS import_race_log (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
      CREATE OR REPLACE FUNCTION import_race_pause() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        INSERT INTO import_race_log DEFAULT VALUES;
        PERFORM pg_sleep(0.5);
        RETURN NULL;
      END;
      $fn$;
      CREATE OR REPLACE FUNCTION import_race_alert() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        INSERT INTO alerts (user_id, event_id, offset_minutes, fire_at, fired_at)
        VALUES (NEW.user_id, NEW.id, 15, NEW.start_at - interval '15 minutes', now());
        RETURN NEW;
      END;
      $fn$;
    `);
    await sql`delete from alerts where user_id in (${USER}, ${OTHER})`;
    await sql`delete from events where user_id in (${USER}, ${OTHER})`;
    await sql`
      insert into events (user_id, title, start_at, end_at, import_uid, import_occurrence)
      values (${OTHER}, 'Secret', now(), now() + interval '1 hour', 'studio@school', '')
    `;
    await sql`
      insert into events (user_id, title, start_at, end_at)
      values (${USER}, 'Typed by hand', now(), now() + interval '1 hour')
    `;
  });

  afterAll(async () => {
    await sql`drop trigger if exists import_race_pause on events`;
    await sql`drop trigger if exists import_race_alert on events`;
    await sql`drop function if exists import_race_pause()`;
    await sql`drop function if exists import_race_alert()`;
    await sql`drop table if exists import_race_log`;
    await sql`delete from alerts where user_id in (${USER}, ${OTHER})`;
    await sql`delete from events where user_id in (${USER}, ${OTHER})`;
    await sql.end();
    await appClient?.end({ timeout: 5 });
  });

  async function withRace<T>(body: () => Promise<T>): Promise<T> {
    await sql`delete from alerts where event_id in (select id from events where user_id = ${USER} and import_uid is not null)`;
    await sql`delete from events where user_id = ${USER} and import_uid is not null`;
    await sql`drop trigger if exists import_race_pause on events`;
    await sql`drop trigger if exists import_race_alert on events`;
    await sql`delete from import_race_log`;
    await sql`
      create trigger import_race_pause before insert on events
      for each statement execute function import_race_pause()
    `;
    await sql`
      create trigger import_race_alert after insert on events
      for each row when (NEW.import_uid is not null)
      execute function import_race_alert()
    `;
    try {
      return await body();
    } finally {
      await sql`drop trigger if exists import_race_pause on events`;
      await sql`drop trigger if exists import_race_alert on events`;
    }
  }

  function post(body: string) {
    return POST(new Request("http://localhost/api/events/import?tz=UTC", {
      method: "POST",
      headers: { "content-type": "text/calendar" },
      body,
    }));
  }

  async function responseCounts(response: Response) {
    expect(response.status).toBe(200);
    return countsFrom(await response.json());
  }

  it("keeps one row per occurrence when two imports of the same file run together", async () => {
    const text = fixture("weekly-exdate.ics");
    const [first, second, races] = await withRace(async () => {
      const responses = await Promise.all([post(text), post(text)]);
      const [left, right] = await Promise.all(responses.map(responseCounts));
      const [{ races }] = await sql<{ races: number }[]>`select count(*)::int as races from import_race_log`;
      return [left, right, Number(races)] as const;
    });

    const rows = await sql<{ import_uid: string; import_occurrence: string }[]>`
      select import_uid, import_occurrence from events
      where user_id = ${USER} and import_uid = 'studio@school'
    `;
    expect(rows.length).toBeGreaterThan(1);
    expect(new Set(rows.map((row) => row.import_occurrence)).size).toBe(rows.length);
    expect(races).toBe(2);
    expect(first.updated).toBe(0);
    expect(second.updated).toBe(0);
    expect(first.imported + second.imported).toBe(rows.length);
    expect(first.imported + first.updated + first.unchanged).toBe(rows.length);
    expect(second.imported + second.updated + second.unchanged).toBe(rows.length);
    expect(first.imported + first.updated + first.unchanged + second.imported + second.updated + second.unchanged).toBe(rows.length * 2);

    const [secret] = await sql<{ title: string }[]>`select title from events where user_id = ${OTHER}`;
    const [typed] = await sql<{ title: string; import_uid: string | null }[]>`
      select title, import_uid from events where user_id = ${USER} and import_uid is null
    `;
    expect(secret?.title).toBe("Secret");
    expect(typed).toMatchObject({ title: "Typed by hand", import_uid: null });
  }, 15_000);

  it("keeps the first copy when a racing import would change the title", async () => {
    const original = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20270601T150000Z
DTEND:20270601T160000Z
SUMMARY:Seminar
UID:seminar-race@school
END:VEVENT
END:VCALENDAR`;
    const renamed = original.replace("SUMMARY:Seminar", "SUMMARY:Seminar moved");

    const [first, second, races] = await withRace(async () => {
      const responses = await Promise.all([post(original), post(renamed)]);
      const [left, right] = await Promise.all(responses.map(responseCounts));
      const [{ races }] = await sql<{ races: number }[]>`select count(*)::int as races from import_race_log`;
      return [left, right, Number(races)] as const;
    });

    const rows = await sql<{ id: string; title: string }[]>`
      select id, title from events
      where user_id = ${USER} and import_uid = 'seminar-race@school'
    `;
    expect(rows).toHaveLength(1);
    expect(races).toBe(2);
    expect(first.updated).toBe(0);
    expect(second.updated).toBe(0);
    expect(first.imported + second.imported).toBe(1);
    expect(rows[0].title).toBe(first.imported === 1 ? "Seminar" : "Seminar moved");
    expect(first.imported + first.updated + first.unchanged).toBe(1);
    expect(second.imported + second.updated + second.unchanged).toBe(1);

    const alerts = await sql<{ fired_at: Date | null; fire_at: Date }[]>`
      select fired_at, fire_at from alerts where user_id = ${USER} and event_id = ${rows[0].id}
    `;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].fire_at.getTime()).toBeGreaterThan(Date.now());
    expect(alerts[0].fired_at).not.toBeNull();
  }, 15_000);
});
