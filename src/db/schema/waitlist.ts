import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Public, unauthenticated signups from the landing page's waitlist form.
// Not user-owned (no user_id) since there's no account behind it yet.
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
});

// Drizzle inferred types (server-side). For component props, use the
// wire types from Calendar.tsx.
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
