import { asc } from "drizzle-orm";
import { db } from "./index";
import { user } from "./schema/auth";

/**
 * The account a seed script writes to: SEED_USER_ID when set, otherwise the
 * only user in the database. Errors on zero or several users so a seed never
 * guesses whose data to change.
 */
export async function resolveSeedUserId(): Promise<string> {
  const fromEnv = process.env.SEED_USER_ID;
  if (fromEnv) return fromEnv;

  const rows = await db.select({ id: user.id }).from(user).orderBy(asc(user.createdAt));

  if (rows.length === 0) {
    throw new Error("No users found. Run `bun run db:seed:demo` first, or pass SEED_USER_ID=<uuid>.");
  }
  if (rows.length > 1) {
    throw new Error(`Found ${rows.length} users; pass SEED_USER_ID=<uuid> to pick one.`);
  }
  return rows[0].id;
}
