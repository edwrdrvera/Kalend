import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { MAX_GROUP_NAME_LENGTH } from "../../lib/group-name";
import { categories } from "./categories";

// An optional grouping of related events and tasks inside one Space. One level
// only. Items keep their Space in category_id and point here with group_id.
export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    category_id: uuid("category_id").notNull(),
    name: text("name").notNull(),
    created_at: timestamp("created_at").defaultNow()
  },
  (table) => [
    // Postgres needs a unique constraint on exactly the columns an item's
    // composite foreign key references, even though id alone is unique.
    unique("groups_membership_key").on(table.id, table.category_id, table.user_id),
    // A Group's owner must be its Space's owner.
    foreignKey({
      name: "groups_space_owner_fk",
      columns: [table.category_id, table.user_id],
      foreignColumns: [categories.id, categories.user_id]
    }).onDelete("cascade"),
    check(
      "groups_name_not_blank",
      sql`btrim(${table.name}) <> '' and char_length(${table.name}) <= ${sql.raw(String(MAX_GROUP_NAME_LENGTH))}`
    ),
    index("groups_user_space_idx").on(table.user_id, table.category_id)
  ]
).enableRLS();

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
