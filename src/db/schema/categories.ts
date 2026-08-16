import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("blue"),
  created_at: timestamp("created_at").defaultNow()
});

// Drizzle inferred types (server-side). For component props, use the
// wire types from Calendar.tsx.
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
