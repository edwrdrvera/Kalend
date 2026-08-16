import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  start_at: timestamp("start_at", { withTimezone: true }).notNull(),
  end_at: timestamp("end_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  color: text("color").default("blue"),
  category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null" })
});

// Drizzle inferred types (server-side, dates are Date objects). For
// component props, use the wire types from Calendar.tsx (ISO strings).
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
