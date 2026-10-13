import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { MAX_PUSH_ENDPOINT_LENGTH, MAX_PUSH_KEY_LENGTH } from "../../lib/push-limits";

// One browser (or other push device) that asked to receive alerts while
// Kalend is closed. The endpoint is unique because a device has one
// subscription, and a later sign-in on that device replaces the previous one.
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("push_subscriptions_endpoint_key").on(table.endpoint),
    check(
      "push_subscriptions_endpoint_https",
      sql`left(${table.endpoint}, 8) = 'https://' and char_length(${table.endpoint}) between 9 and ${sql.raw(String(MAX_PUSH_ENDPOINT_LENGTH))} and position(' ' in ${table.endpoint}) = 0`
    ),
    check(
      "push_subscriptions_keys_bounded",
      sql`char_length(${table.p256dh}) between 1 and ${sql.raw(String(MAX_PUSH_KEY_LENGTH))} and char_length(${table.auth}) between 1 and ${sql.raw(String(MAX_PUSH_KEY_LENGTH))}`
    ),
    index("push_subscriptions_user_idx").on(table.user_id),
  ]
).enableRLS();

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
