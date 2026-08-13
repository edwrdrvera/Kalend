// Loads src/db/data/data.csv into the `events` table for local dev.
// Run with `bun run db:seed`.
//
// The CSV's user_id column is a placeholder (all zeros) left over from
// before any real account existed to attach sample data to — it's not
// used here. Seeded events are attached to whichever user id is passed via
// SEED_USER_ID instead, so they actually show up when you log into the app
// locally. Sign up in the app once, then find your user id in the Supabase
// dashboard under Authentication > Users (or run
// `select id, email from auth.users;` in the SQL editor).
//
// Safe to run more than once: a CSV row is only inserted if the target
// user doesn't already have an event with that exact title and start_at,
// so re-running after adding new rows to the CSV only inserts the new
// ones instead of duplicating everything.

import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { events } from "./schema/events";

const CSV_PATH = new URL("./data/data.csv", import.meta.url);

interface SeedRow {
  title: string;
  start_at: string;
  end_at: string;
  color: string;
}

/** Minimal CSV parser: handles quoted fields (embedded commas, escaped
 *  `""`) since a future event title might need one, even though today's
 *  sample data doesn't. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function toSeedRows(csvRows: string[][]): SeedRow[] {
  const [header, ...dataRows] = csvRows;
  const titleIdx = header.indexOf("title");
  const startIdx = header.indexOf("start_at");
  const endIdx = header.indexOf("end_at");
  const colorIdx = header.indexOf("color");

  return dataRows.map((r) => ({
    title: r[titleIdx],
    start_at: r[startIdx],
    end_at: r[endIdx],
    color: r[colorIdx],
  }));
}

async function main() {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    console.error(
      "SEED_USER_ID is required.\n\n" +
        "Sign up (or log in) to the app once, then find your user id in the\n" +
        "Supabase dashboard under Authentication > Users, and run:\n\n" +
        "  SEED_USER_ID=<your-uuid> bun run db:seed\n"
    );
    process.exit(1);
  }

  const csvText = await Bun.file(CSV_PATH).text();
  const rows = toSeedRows(parseCsv(csvText));

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const startAt = new Date(row.start_at);
    const endAt = new Date(row.end_at);

    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.user_id, userId),
          eq(events.title, row.title),
          eq(events.start_at, startAt)
        )
      );

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(events).values({
      title: row.title,
      start_at: startAt,
      end_at: endAt,
      color: row.color,
      user_id: userId,
    });
    inserted++;
  }

  console.log(`Seed complete: ${inserted} inserted, ${skipped} already present.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
