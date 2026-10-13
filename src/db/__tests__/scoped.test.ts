import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";
import * as schema from "../schema";

// Proves the per-request helper stores the caller id on the transaction and
// drops it when that transaction ends. The pool has one connection, so the
// read after commit is the same session. A non-local setting would still be
// there. Skips without DATABASE_URL, same as the policy tests. The helper is
// imported inside the suite so a run with no database never opens a pool.
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("per-request caller id", () => {
  let shared: Awaited<typeof import("@/db")>["db"] | undefined;
  let asUser: Awaited<typeof import("@/db/scoped")>["asUser"];
  let client: ReturnType<typeof postgres> | undefined;

  beforeAll(async () => {
    ({ db: shared } = await import("@/db"));
    ({ asUser } = await import("@/db/scoped"));
    client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  });

  afterAll(async () => {
    await client?.end();
    await shared?.$client.end();
  });

  it("keeps the caller id inside the transaction and clears it after", async () => {
    const user = { id: crypto.randomUUID() } as AuthenticatedUser;
    const database = drizzle(client!, { schema });

    await asUser(
      user,
      async (tx) => {
        const [row] = await tx.execute(
          sql`select current_setting('app.user_id', true) as caller`,
        );
        expect(row.caller).toBe(user.id);
      },
      database,
    );

    const [after] = await database.execute(
      sql`select current_setting('app.user_id', true) as caller`,
    );
    expect(after.caller ?? "").toBe("");
  });
});
