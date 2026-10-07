import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("blue"),
    description: text("description"),
    created_at: timestamp("created_at").defaultNow()
  },
  (table) => [
    // The target of a Group's owner-checked link to its Space.
    unique("categories_id_user_key").on(table.id, table.user_id)
  ]
).enableRLS();

// Drizzle inferred types (server-side). For component props, use the
// wire types from Calendar.tsx.
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
