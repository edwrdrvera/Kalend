import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

// The in-memory route tests fake the identity conflict. This file runs the
// import twice against the scratch database CI migrates, which is the only
// place the unique index is real. It skips without SCHEMA_TEST_DATABASE_URL,
// the same way the groups schema tests do.
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

function countsFrom(value: unknown): { imported: number; unchanged: number } {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) {
    throw new Error("import response was not a success");
  }
  const imported = value.data.imported;
  const unchanged = value.data.unchanged;
  if (typeof imported !== "number" || typeof unchanged !== "number") {
    throw new Error("import response is missing counts");
  }
  return { imported, unchanged };
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
    expect(first.imported + second.imported).toBe(rows.length);
    expect(first.imported + first.unchanged).toBe(rows.length);
    expect(second.imported + second.unchanged).toBe(rows.length);
    expect(first.imported + first.unchanged + second.imported + second.unchanged).toBe(rows.length * 2);

    const [secret] = await sql<{ title: string }[]>`select title from events where user_id = ${OTHER}`;
    const [typed] = await sql<{ title: string; import_uid: string | null }[]>`
      select title, import_uid from events where user_id = ${USER} and import_uid is null
    `;
    expect(secret?.title).toBe("Secret");
    expect(typed).toMatchObject({ title: "Typed by hand", import_uid: null });
  }, 15_000);
});
