import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";

// Proves the per-request helper stores the caller id on the transaction and
// drops it when that transaction ends. The stand-in client has one connection,
// so the read after commit is the same session. A non-local setting would
// still be there. The stand-in is installed before the helper loads, so the
// helper has no test-only argument. Skips without DATABASE_URL, same as the
// policy tests.
const hasDb = Boolean(process.env.DATABASE_URL);
const client = hasDb ? postgres(process.env.DATABASE_URL!, { max: 1, prepare: false }) : undefined;
const database = client ? drizzle(client) : undefined;

if (database) {
  mock.module("@/db", () => ({ db: database }));
}

describe.skipIf(!hasDb)("per-request caller id", () => {
  let asUser: Awaited<typeof import("@/db/scoped")>["asUser"];

  beforeAll(async () => {
    ({ asUser } = await import("@/db/scoped"));
  });

  afterAll(async () => {
    await client?.end();
  });

  it("keeps the caller id inside the transaction and clears it after", async () => {
    const user = { id: crypto.randomUUID() } as AuthenticatedUser;
    let backend = 0;

    await asUser(user, async (tx) => {
      const [row] = await tx.execute(
        sql`select pg_backend_pid() as pid, current_setting('app.user_id', true) as caller`,
      );
      backend = Number(row.pid);
      expect(row.caller).toBe(user.id);
    });

    const [after] = await database!.execute(
      sql`select pg_backend_pid() as pid, current_setting('app.user_id', true) as caller`,
    );
    expect(Number(after.pid)).toBe(backend);
    expect(after.caller ?? "").toBe("");
  });
});
