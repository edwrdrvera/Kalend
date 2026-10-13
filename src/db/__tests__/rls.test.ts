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

const OWNED_TABLES = ["events", "tasks", "categories", "groups", "alerts"] as const;
const ALL_TABLES = [...OWNED_TABLES, "waitlist"] as const;

const roleList = (roles: unknown): string[] => {
  if (Array.isArray(roles)) return roles.map(String);
  return String(roles)
    .replace(/[{}]/g, "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
};

describe.skipIf(!hasDb)("Row Level Security policies", () => {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  afterAll(async () => {
    await sql.end();
  });

  it("is enabled and forced on every app table", async () => {
    const rows = await sql`
      select relname, relrowsecurity as enabled, relforcerowsecurity as forced
      from pg_class
      where relname in ${sql(ALL_TABLES)}
    `;

    expect(rows).toHaveLength(ALL_TABLES.length);
    for (const row of rows) {
      expect(row.enabled).toBe(true);
      expect(row.forced).toBe(true);
    }
  });

  it("gives each owned table one policy that checks app_user_id", async () => {
    const policies = await sql`
      select tablename, policyname, cmd, roles, qual, with_check
      from pg_policies
      where schemaname = 'public' and tablename in ${sql(OWNED_TABLES)}
    `;

    for (const table of OWNED_TABLES) {
      const tablePolicies = policies.filter((policy) => policy.tablename === table);
      expect(tablePolicies).toHaveLength(1);
      const [policy] = tablePolicies;
      expect(policy.policyname).toBe(`${table}_owner`);
      expect(policy.cmd).toBe("ALL");
      expect(roleList(policy.roles)).toContain("kalend_app");
      expect(String(policy.qual)).toContain("app_user_id");
      expect(String(policy.with_check)).toContain("app_user_id");
      expect(String(policy.qual)).not.toContain("auth.uid");
    }
  });

  it("keeps the waitlist policy insert-only for the app role", async () => {
    const policies = await sql`
      select policyname, cmd, roles, qual, with_check
      from pg_policies
      where schemaname = 'public' and tablename = 'waitlist'
    `;

    expect(policies).toHaveLength(1);
    expect(policies[0].policyname).toBe("waitlist_public_insert");
    expect(policies[0].cmd).toBe("INSERT");
    expect(roleList(policies[0].roles)).toContain("kalend_app");
    expect(policies[0].qual).toBeNull();
    expect(String(policies[0].with_check)).toBe("true");
  });

  it("reads the caller id from the app.user_id setting", async () => {
    const [fn] = await sql`
      select pg_get_functiondef('public.app_user_id()'::regprocedure) as definition
    `;
    expect(fn.definition).toContain("app.user_id");
    expect(fn.definition).toContain("current_setting");
    expect(fn.definition).toContain("invalid_text_representation");
  });

  it("returns null when the caller setting is empty or not a uuid", async () => {
    const callerId = async (value: string) => {
      const [row] = await sql`
        select public.app_user_id() as id
        from (select set_config('app.user_id', ${value}, true)) as configured
      `;
      return row.id;
    };

    expect(await callerId("")).toBeNull();
    expect(await callerId("not-a-uuid")).toBeNull();
    const id = crypto.randomUUID();
    expect(await callerId(id)).toBe(id);
  });
});
