import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  start_at: timestamp("start_at", { withTimezone: true }).notNull(),
  end_at: timestamp("end_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  color: text("color").default("blue")
});

// Types for your Frontend
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
