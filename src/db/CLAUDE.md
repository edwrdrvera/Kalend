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
- Cross-table links use `.references(() => other.id, { onDelete: ... })`. Category links use `"set null"` so deleting a category doesn't delete the user's events or tasks.
- Export the inferred pair at the bottom for frontend use:
  ```ts
  export type Event = typeof events.$inferSelect;
  export type NewEvent = typeof events.$inferInsert;
  ```

## Other

- `seed.ts` runs via `bun run db:seed`. It and `seed-spaces.ts` write to `SEED_USER_ID`, or to the only row in `user` (`seed-user.ts`).
- `data/data.csv` is sample event data loaded by `seed.ts`. It has no color column: each event takes its Space's color once `seed-spaces.ts` links it.
- `drizzle/0000_baseline.sql` is hand-edited in one place, noted at its top: the Group foreign keys on events and tasks use `SET NULL ("group_id")`. `__tests__/groups-schema.test.ts` proves it against a real database when `SCHEMA_TEST_DATABASE_URL` is set.
- `waitlist` (`schema/waitlist.ts`) is the exception to the `user_id`-scoping rule above: it's public, unauthenticated signups from the landing page (`POST /api/waitlist`, no auth check by design), not owned by any user.

## Demo account (no signup in this MVP)

There's no public signup (see `src/app/CLAUDE.md`), so `/login` is one demo account. Create or reset it with `seed-demo-user.ts`:

```bash
DEMO_USER_PASSWORD=<password> bun run db:seed:demo
```

Signup is turned off in Better Auth, so the script writes the user and its password account through `auth.$context`'s internal adapter. Defaults `DEMO_USER_EMAIL` to `demo@kalend.app`; pass it to override. Safe to re-run: an existing user with that email gets its password reset and its sessions signed out.
