import { afterAll, describe, expect, it } from "bun:test";
import postgres from "postgres";

// These tests connect to the real database (DATABASE_URL) instead of mocking
// it, because Row Level Security is a database-level setting, not app code
// there is nothing in src/ to unit-test against. They skip themselves when
// DATABASE_URL isn't set (e.g. a clone with no .env.local yet) instead of
// failing, so they only run where a database is actually reachable.
//
// Bun does not load .env.local for `bun test` by default, so run this file
// with: bun test --env-file=.env.local src/db/__tests__/rls.test.ts
// (plain `bun test` will just skip it, same as having no DATABASE_URL at all)
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("Row Level Security on events and tasks", () => {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  afterAll(async () => {
    await sql.end();
  });

  it("is enabled and forced on both tables", async () => {
    const rows = await sql`
      select relname, relrowsecurity as enabled, relforcerowsecurity as forced
      from pg_class
      where relname in ('events', 'tasks')
    `;

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.enabled).toBe(true);
      expect(row.forced).toBe(true);
    }
  });

  it("has a select/insert/update/delete policy on both tables", async () => {
    const policies = await sql`
      select tablename, cmd
      from pg_policies
      where tablename in ('events', 'tasks')
    `;

    for (const table of ["events", "tasks"]) {
      const commands = policies
        .filter((policy) => policy.tablename === table)
        .map((policy) => policy.cmd);

      for (const cmd of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        expect(commands).toContain(cmd);
      }
    }
  });
});
