import { afterAll, describe, expect, it } from "bun:test";
import postgres from "postgres";

// Catalog checks use the owner connection (DATABASE_URL). A second block
// connects as the app role when APP_DATABASE_URL is set, which CI does.
// Both skip outside a database, same as the policy tests.
const ownerUrl = process.env.DATABASE_URL;
const appUrl = process.env.APP_DATABASE_URL;

const OWNED = ["events", "tasks", "categories", "groups", "alerts", "push_subscriptions"] as const;
const WRITE = ["SELECT", "INSERT", "UPDATE", "DELETE"] as const;

// Public tables the app role must not be granted. A new table fails this
// check until it is granted, or added here because it must stay owner-only.
const UNGRANTED: readonly string[] = [];

describe.skipIf(!ownerUrl)("kalend_app role", () => {
  const sql = postgres(ownerUrl!, { prepare: false });

  afterAll(async () => {
    await sql.end();
  });

  it("can log in and cannot skip row policies", async () => {
    const [role] = await sql`
      select rolcanlogin, rolbypassrls, rolinherit
      from pg_roles
      where rolname = 'kalend_app'
    `;
    expect(role).toBeDefined();
    expect(role.rolcanlogin).toBe(true);
    expect(role.rolbypassrls).toBe(false);
    expect(role.rolinherit).toBe(false);
  });

  it("can read and write owned tables, and only insert into the waitlist", async () => {
    const grants = await sql`
      select table_name, privilege_type
      from information_schema.role_table_grants
      where grantee = 'kalend_app' and table_schema = 'public'
    `;
    const byTable = new Map<string, Set<string>>();
    for (const grant of grants) {
      const name = String(grant.table_name);
      const privileges = byTable.get(name) ?? new Set<string>();
      privileges.add(String(grant.privilege_type));
      byTable.set(name, privileges);
    }

    const expected = new Map<string, Set<string>>(
      OWNED.map((table) => [table, new Set<string>(WRITE)]),
    );
    expected.set("waitlist", new Set(["INSERT"]));

    const tables = await sql`
      select tablename from pg_tables where schemaname = 'public'
    `;
    const publicTables = tables.map((table) => String(table.tablename));
    expect(publicTables.length).toBeGreaterThan(0);

    for (const name of publicTables) {
      if (UNGRANTED.includes(name)) {
        expect(byTable.has(name)).toBe(false);
        continue;
      }
      expect(expected.has(name), `${name} has no grant and is not excluded`).toBe(true);
      expect(byTable.get(name)).toEqual(expected.get(name));
    }
    for (const name of byTable.keys()) {
      expect(publicTables).toContain(name);
    }
  });

  it("can use the public schema and call the caller id function", async () => {
    const [row] = await sql`
      select
        has_schema_privilege('kalend_app', 'public', 'usage') as usage,
        has_function_privilege('kalend_app', 'public.app_user_id()', 'execute') as execute,
        (
          select p.proacl::text
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'app_user_id'
        ) as acl
    `;
    expect(row.usage).toBe(true);
    expect(row.execute).toBe(true);
    expect(String(row.acl ?? "")).not.toContain("kalend_app");
  });
});

describe.skipIf(!appUrl || !ownerUrl)("kalend_app connection", () => {
  const sql = postgres(appUrl!, { prepare: false });

  afterAll(async () => {
    await sql.end();
  });

  it("connects as the app role and still cannot skip row policies", async () => {
    const [role] = await sql`
      select current_user as name, rolbypassrls
      from pg_roles
      where rolname = current_user
    `;
    expect(role.name).toBe("kalend_app");
    expect(role.rolbypassrls).toBe(false);
  });

  it("cannot see a row the owner inserted when the caller id is unset", async () => {
    const owner = postgres(ownerUrl!, { prepare: false });
    const userId = crypto.randomUUID();
    const [created] = await owner`
      insert into events (user_id, title, start_at, end_at)
      values (${userId}, 'role probe', now(), now() + interval '1 hour')
      returning id
    `;
    try {
      const rows = await sql`select id from events where id = ${created.id}`;
      expect(rows).toHaveLength(0);
    } finally {
      await owner`delete from events where id = ${created.id}`;
      await owner.end();
    }
  });
});
