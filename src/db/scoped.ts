import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { AuthenticatedUser } from "@/lib/supabase/auth-user";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AppDatabase = {
  transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
};

// set_config's third argument keeps the caller id on this transaction only. A
// pooled connection must not carry one user's id into the next request.
// `database` lets a test pin that check to a one-connection pool.
export function asUser<T>(
  user: AuthenticatedUser,
  work: (tx: Tx) => Promise<T>,
  database: AppDatabase = db,
): Promise<T> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${user.id}, true)`);
    return work(tx);
  });
}
