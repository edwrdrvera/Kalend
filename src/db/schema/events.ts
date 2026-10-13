import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { groups } from "./groups";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    title: text("title").notNull(),
    start_at: timestamp("start_at", { withTimezone: true }).notNull(),
    end_at: timestamp("end_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at").defaultNow(),
    color: text("color").default("blue"),
    color_overridden: boolean("color_overridden").notNull().default(false),
    category_id: uuid("category_id"),
    group_id: uuid("group_id"),
    location: text("location"),
    icon: text("icon"),
    description: text("description")
  },
  (table) => [
    // The Space must belong to the item's owner. drizzle-kit emits a plain SET NULL,
    // which would also clear the NOT NULL user_id and fail every Space delete, so the
    // migration is hand-edited to SET NULL (category_id). See src/db/CLAUDE.md.
    foreignKey({
      name: "events_space_owner_fk",
      columns: [table.category_id, table.user_id],
      foreignColumns: [categories.id, categories.user_id]
    }).onDelete("set null"),
    // MATCH SIMPLE skips this key while group_id is null, so Space-only and unassigned
    // items pass. drizzle-kit emits a plain SET NULL; the migration is hand-edited to
    // SET NULL (group_id) so deleting a Group does not also clear category_id.
    // src/db/__tests__/groups-schema.test.ts pins the column list.
    foreignKey({
      name: "events_group_membership_fk",
      columns: [table.group_id, table.category_id, table.user_id],
      foreignColumns: [groups.id, groups.category_id, groups.user_id]
    }).onDelete("set null"),
    // The key above is not checked while category_id is null, so a Group without a Space needs its own rule.
    check("events_group_needs_space", sql`${table.group_id} is null or ${table.category_id} is not null`),
    index("events_group_idx")
      .on(table.group_id)
      .where(sql`${table.group_id} is not null`)
  ]
).enableRLS();

// Drizzle inferred types (server-side, dates are Date objects). For
// component props, use the wire types from Calendar.tsx (ISO strings).
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
