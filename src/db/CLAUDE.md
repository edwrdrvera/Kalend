# src/db

Drizzle ORM over Supabase Postgres. Migration workflow (schema edit → `drizzle-kit generate` → `migrate`) lives in the `db-migrate` skill. Generated SQL lands in `drizzle/` at the repo root.

## Client (`index.ts`)

- `prepare: false` on the Postgres client is required for Supabase's connection pooler (transaction mode / PgBouncer). Don't remove it.
- This client connects as the `postgres` role, which has `BYPASSRLS`, so **RLS policies do not protect these queries**. Access control is the `eq(<table>.user_id, user.id)` filter written into every API route, enforced by the `access-control/scoped-query` lint rule over `src/app/api` (see `src/app/api/CLAUDE.md`). Read the comment at the top of `index.ts` before reasoning about security here.

## Schema conventions (`schema/`)

One file per table, all re-exported from `schema/index.ts`. When adding a table, follow the existing pattern:

- `pgTable` from `drizzle-orm/pg-core`, snake_case column names.
- `uuid("id").primaryKey().defaultRandom()`.
- `user_id: uuid("user_id").notNull()` on anything user-owned. Every query filters on it.
- Timestamps that cross a timezone boundary use `{ withTimezone: true }` (see `events.start_at`); bookkeeping columns like `created_at` don't.
- Cross-table links use `.references(() => other.id, { onDelete: ... })`. Category links use `"set null"` so deleting a category doesn't delete the user's events or tasks.
- Export the inferred pair at the bottom for frontend use:
  ```ts
  export type Event = typeof events.$inferSelect;
  export type NewEvent = typeof events.$inferInsert;
  ```

## Other

- `seed.ts` runs via `bun run db:seed`.
- `data/data.csv` is sample event data loaded by `seed.ts`. It has no color column: each event takes its Space's color once `seed-spaces.ts` links it.
- `__tests__/rls.test.ts` covers the policies, not the app client's queries.
- `waitlist` (`schema/waitlist.ts`) is the exception to the `user_id`-scoping rule above: it's public, unauthenticated signups from the landing page (`POST /api/waitlist`, no auth check by design), not owned by any user.

## Demo account (no signup in this MVP)

There's no public signup (see `src/app/CLAUDE.md`) — `/login` is one hardcoded Supabase Auth user. Create or reset it with `seed-demo-user.ts`:

```bash
SUPABASE_SERVICE_ROLE_KEY=<key> DEMO_USER_PASSWORD=<password> bun run db:seed:demo
```

Needs `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API — bypasses Auth, never commit it or expose it to the browser). Defaults `DEMO_USER_EMAIL` to `demo@kalend.app`; pass it to override. Safe to re-run: an existing user with that email gets its password updated instead of erroring.
