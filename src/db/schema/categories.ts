import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("blue"),
  created_at: timestamp("created_at").defaultNow()
});

// Types for your Frontend
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
