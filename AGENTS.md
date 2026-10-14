# AGENTS.md

This repo's agent instructions live in `CLAUDE.md` files. Read the root `CLAUDE.md` first and follow it as if it were this file.

A directory with its own `CLAUDE.md` adds rules for that area. The root file's "Directory context" section lists them. Read the one for a directory before you change code there.

Longer guides sit in `guides/`. Project skills sit in `.claude/skills/`. The root `CLAUDE.md` says when to read each one.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Bun 1.3.14 is on `PATH` as `bun` and `bunx`. Use Bun for installs, tests, and the dev server.
- Postgres 17 listens on localhost with trust authentication, matching CI. On boot the environment starts Postgres, applies migrations, and writes `DATABASE_URL` and `SCHEMA_TEST_DATABASE_URL` into `.env.local` when those variables are unset. The URL is `postgres://postgres@localhost:5432/postgres`.
- The dev server is already running at http://localhost:3000. Open that hostname. `127.0.0.1` is a different host to the Next.js dev server, and the page's client script will not attach.
- `bunx tsc --noEmit`, `bunx eslint .`, and `bun test` are the checks. `bun test` reads `.env.local`, so the database tests run against local Postgres.
- Sign-in still needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from a Supabase project. Without them the landing page and waitlist work, and `/app` redirects to `/login`.

