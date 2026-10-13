# src/db

Drizzle ORM over a plain, self-hosted Postgres 15+ database. Migration workflow (schema edit → `drizzle-kit generate` → `migrate`) lives in the `db-migrate` skill. Generated SQL lands in `drizzle/` at the repo root.

## Client (`index.ts`)

- One `postgres.js` client at `DATABASE_URL`, shared by the API routes and Better Auth.
- **The database has no row-level security.** Access control is the `eq(<table>.user_id, user.id)` filter written into every API route, enforced by the `access-control/scoped-query` lint rule over `src/app/api`, `src/lib/api`, and `src/db` (see `src/app/api/CLAUDE.md`).

## Schema conventions (`schema/`)

One file per table, all re-exported from `schema/index.ts`. When adding a table, follow the existing pattern:

- `pgTable` from `drizzle-orm/pg-core`, snake_case column names.
- `uuid("id").primaryKey().defaultRandom()`.
- `user_id: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" })` on anything user-owned. Every query filters on it.
- `auth.ts` holds Better Auth's `user`, `session`, `account`, and `verification` tables. Their property names are the camelCase field names Better Auth looks up, mapped to snake_case columns. Ids are uuids so `user_id` can reference `user.id`.
- Timestamps that cross a timezone boundary use `{ withTimezone: true }` (see `events.start_at`); bookkeeping columns like `created_at` don't.
- Cross-table links use `.references(() => other.id, { onDelete: ... })`. Links to another user-owned row use a composite `foreignKey` on `(<link>, user_id)` instead, so the database rejects a link to another user's row. Events and tasks reach their Space through `events_space_owner_fk` and `tasks_space_owner_fk`.
- drizzle-kit cannot write a column list after `SET NULL`. Four item keys need one: the Space keys use `SET NULL ("category_id")`, because a plain `SET NULL` would also clear the NOT NULL `user_id` and fail every Space delete, and the Group keys use `SET NULL ("group_id")`, so deleting a Group keeps the item in its Space. The schema files and snapshots say plain `"set null"`. Hand-edit the column list into each generated migration that creates or re-creates one of these keys. `__tests__/groups-schema.test.ts` fails on a database where a column list is missing. Don't write the column list into a snapshot: the next `drizzle-kit generate` would then re-create all four keys with a plain `SET NULL`.
- A Space with grouped items can be deleted only through `DELETE /api/categories/[id]`, which detaches the items and drops the Groups first. A raw `DELETE FROM categories` on such a Space fails `events_group_needs_space` and changes nothing, because Postgres clears the item's Space before the Group cascade clears its `group_id`.
- Export the inferred pair at the bottom for frontend use:
  ```ts
  export type Event = typeof events.$inferSelect;
  export type NewEvent = typeof events.$inferInsert;
  ```

## Other

- `seed.ts` runs via `bun run db:seed`. It and `seed-spaces.ts` write to `SEED_USER_ID`, or to the only row in `user` (`seed-user.ts`).
- `data/data.csv` is sample event data loaded by `seed.ts`. It has no color column: each event takes its Space's color once `seed-spaces.ts` links it.
- `drizzle/rollback/` holds hand-run reverse SQL for migrations that need one (`0012_flashy_mandroid.down.sql`, `0014_space_owner_key.down.sql`, `0015_better_auth.down.sql`). drizzle-kit never reads it. `0015_better_auth.down.sql` drops the Better Auth tables and owner keys and turns row level security back on, which returns the database to the Supabase schema. Point `DATABASE_URL` at the Supabase pooler again after it.
- `waitlist` (`schema/waitlist.ts`) is the exception to the `user_id`-scoping rule above: it's public, unauthenticated signups from the landing page (`POST /api/waitlist`, no auth check by design), not owned by any user.

## Demo account (no signup in this MVP)

There's no public signup (see `src/app/CLAUDE.md`), so `/login` is one demo account. Create or reset it with `seed-demo-user.ts`:

```bash
DEMO_USER_PASSWORD=<password> bun run db:seed:demo
```

Signup is turned off in Better Auth, so the script writes the user and its password account through `auth.$context`'s internal adapter. Defaults `DEMO_USER_EMAIL` to `demo@kalend.app`; pass it to override. Safe to re-run: an existing user with that email gets its password reset and its sessions signed out.
