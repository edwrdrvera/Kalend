import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { ALERT_OFFSETS, type AlertOffset } from "../../lib/alerts";
import { user } from "./auth";
import { events } from "./events";
import { tasks } from "./tasks";

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    event_id: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    task_id: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    offset_minutes: integer("offset_minutes").$type<AlertOffset>().notNull(),
    // The item's start or due time minus the offset. The server derives it, so
    // a change to the item must rewrite it (see src/lib/api/alert-sync.ts).
    fire_at: timestamp("fire_at", { withTimezone: true }).notNull(),
    fired_at: timestamp("fired_at", { withTimezone: true }),
    created_at: timestamp("created_at").defaultNow()
  },
  (table) => [
    check("alerts_exactly_one_item", sql`(${table.event_id} is null) <> (${table.task_id} is null)`),
    check("alerts_offset_allowed", sql`${table.offset_minutes} in (${sql.raw(ALERT_OFFSETS.join(", "))})`),
    unique("alerts_event_offset_key").on(table.event_id, table.offset_minutes),
    unique("alerts_task_offset_key").on(table.task_id, table.offset_minutes),
    // The claim query scans only alerts that have not fired yet.
    index("alerts_user_fire_at_unfired_idx")
      .on(table.user_id, table.fire_at)
      .where(sql`${table.fired_at} is null`)
  ]
);

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
