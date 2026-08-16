import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  due_at: timestamp("due_at", { withTimezone: true }),
  completed: boolean("completed").notNull().default(false),
  created_at: timestamp("created_at").defaultNow(),
  color: text("color").default("blue"),
  category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null" })
});

// Drizzle inferred types (server-side, dates are Date objects). For
// component props, use the wire types from Calendar.tsx (ISO strings).
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
