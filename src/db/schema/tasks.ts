import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { groups } from "./groups";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    title: text("title").notNull(),
    due_at: timestamp("due_at", { withTimezone: true }),
    completed: boolean("completed").notNull().default(false),
    created_at: timestamp("created_at").defaultNow(),
    color: text("color").default("blue"),
    color_overridden: boolean("color_overridden").notNull().default(false),
    category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    group_id: uuid("group_id")
  },
  (table) => [
    // Same pair of rules as events: see events.ts.
    foreignKey({
      name: "tasks_group_membership_fk",
      columns: [table.group_id, table.category_id, table.user_id],
      foreignColumns: [groups.id, groups.category_id, groups.user_id]
    }).onDelete("set null"),
    check("tasks_group_needs_space", sql`${table.group_id} is null or ${table.category_id} is not null`),
    index("tasks_group_idx")
      .on(table.group_id)
      .where(sql`${table.group_id} is not null`)
  ]
).enableRLS();

// Drizzle inferred types (server-side, dates are Date objects). For
// component props, use the wire types from Calendar.tsx (ISO strings).
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
