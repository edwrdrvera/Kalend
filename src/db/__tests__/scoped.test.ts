import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";

// Proves the per-request helper stores the caller id on the transaction and
// drops it when that transaction ends, even on the same pooled connection.
// Skips without DATABASE_URL, same as the policy tests. The helper is imported
// inside the suite so a run with no database never opens a pool.
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("per-request caller id", () => {
  let db: Awaited<typeof import("@/db")>["db"];
  let asUser: Awaited<typeof import("@/db/scoped")>["asUser"];

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    ({ asUser } = await import("@/db/scoped"));
  });

  afterAll(async () => {
    await db.$client.end();
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

    let sawSameBackend = false;
    for (let attempt = 0; attempt < 30 && !sawSameBackend; attempt++) {
      const [row] = await db.execute(
        sql`select pg_backend_pid() as pid, current_setting('app.user_id', true) as caller`,
      );
      if (Number(row.pid) !== backend) continue;
      sawSameBackend = true;
      expect(row.caller ?? "").toBe("");
    }
    expect(sawSameBackend).toBe(true);
  });
});
