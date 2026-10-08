---
name: db-migrate
description: Workflow for editing the Drizzle schema and generating/applying migrations against the app's Postgres database in this repo. Use when changing table definitions in src/db/schema/ or running drizzle-kit.
---

This is a codebase-first (schema.ts is the source of truth) Drizzle setup. Migrations are checked into `./drizzle/` and committed.

1. Edit table definitions in `src/db/schema/`.
2. `bunx drizzle-kit generate` — diffs the schema against `drizzle/meta/_journal.json` and writes a new numbered `drizzle/NNNN_*.sql` file + snapshot. This is a pure diff against the previous snapshot; it does **not** need `DATABASE_URL` or a live DB connection.
3. `bunx --bun drizzle-kit migrate` applies pending `./drizzle` migrations to the DB at `DATABASE_URL`. `--bun` runs drizzle-kit under Bun, which loads `DATABASE_URL` from `.env.local`; plain `bunx drizzle-kit migrate` only sees an exported variable.
4. Commit the generated `drizzle/` files alongside the schema change in the same PR.

Other drizzle-kit commands: `bunx drizzle-kit push` (skip migration files, push schema straight to the DB — dev-only, don't use for changes that need to reach `develop`), `bunx drizzle-kit studio` (browse the DB).
