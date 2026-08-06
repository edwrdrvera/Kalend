# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Kalend is a student productivity web app centered on an integrated calendar and task manager (see `docs/project_overview.md` for the full product plan). The project is early-stage: the App Router currently only has API routes (`src/app/api/`), no UI pages exist yet.

Planned/target stack per `docs/project_overview.md` (not all implemented yet): Next.js + React + TypeScript, TailwindCSS, shadcn/ui for components, Supabase Auth for authentication, Supabase Postgres as the database.

## Commands

This project uses **Bun**, not npm/yarn/pnpm.

- `bun install` — install dependencies
- `bun dev` — run the dev server (`bun --bun next dev`)
- `bunx tsc --noEmit` — **fast type-check (use this to verify incremental changes)**
- `bunx next lint` or `bunx eslint .` — linting
- `bun run build` — full production build (run only before merging PRs)
- `bun run start` — run the production build

There is no test runner configured in this repo yet.

### Database (Drizzle + Supabase Postgres)

- Schema lives in `src/db/schema/` (`events.ts` re-exported via `index.ts`).
- `drizzle.config.ts` reads schema from `src/db/schema/index.ts`, outputs migrations to `./drizzle`, and requires a `DATABASE_URL` env var (dialect: `postgresql`).
- `src/db/index.ts` creates the shared `db` client via `drizzle-orm/postgres-js`, using `postgres(process.env.DATABASE_URL!, { prepare: false })` — `prepare: false` is required for Supabase's connection pooler (transaction mode / PgBouncer).
- `src/db/data/data.csv` is sample event data (not currently wired to a seed script).

**Migration workflow** — this is a codebase-first (schema.ts is the source of truth) Drizzle setup, migrations are checked into `./drizzle/` and committed:

1. Edit table definitions in `src/db/schema/`.
2. `bunx drizzle-kit generate` — diffs the schema against `drizzle/meta/_journal.json` and writes a new numbered `drizzle/NNNN_*.sql` file + snapshot. This is a pure diff against the previous snapshot; it does **not** need `DATABASE_URL` or a live DB connection.
3. `bunx drizzle-kit migrate` — applies pending `./drizzle` migrations to the DB at `DATABASE_URL`. Requires `DATABASE_URL` to be set.
4. Commit the generated `drizzle/` files alongside the schema change in the same PR.

Other drizzle-kit commands: `bunx drizzle-kit push` (skip migration files, push schema straight to the DB — dev-only, don't use for changes that need to reach `develop`), `bunx drizzle-kit studio` (browse the DB).

## Architecture

- **Next.js App Router**, TypeScript, path alias `@/*` → `src/*` (see `tsconfig.json`).
- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`) — avoid manual `useMemo`/`useCallback` micro-optimizations that fight the compiler; write plain component code.
- **API routes** live under `src/app/api/<name>/route.ts` using the standard Next.js Route Handler exports (`GET`, `POST`, etc.) and `NextResponse.json(...)`:
  - `api/events` — real handler backed by Drizzle (`db.select().from(events)`), returns `{ success, data }` or `{ success: false, error }` with a 500 on failure.
  - `api/ping` — trivial health check.
  - `api/test` — mock/scratch endpoint (hardcoded data, echoes POST body); treat as a template for wiring new endpoints, not production logic.
- **DB schema convention**: tables defined with `drizzle-orm/pg-core` (`pgTable`), snake_case column names, `uuid` primary keys via `defaultRandom()`. Each schema file exports inferred `Select`/`Insert` types (e.g. `Event`, `NewEvent`) for use on the frontend — follow this pattern when adding new tables.
- Supabase is used for both Postgres hosting and (per the project plan) auth. Client factories live in `src/lib/supabase/`: `client.ts` (`createClient()` via `createBrowserClient`, for Client Components) and `server.ts` (`async createClient()` via `createServerClient`, for Server Components/Route Handlers — reads/writes cookies through `next/headers`). Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`. No login/signup routes or middleware session refresh exist yet — see `feature/auth-login-signup-pages` and `feature/auth-middleware-protected-routes` in `TASKS.md`.

## Git & Workflow Strategy
- **Base Branch:** `develop` (all feature work targets or branches off `develop`).
- **Feature Branches:** Create off `develop` using `feature/<feature-name>`.
- **Primary Branch:** Do not commit directly to `main`.

## Commit & Workflow Rules
- **Incremental Commits Required:** Break all task implementations down into small, atomic commits instead of bundling an entire feature branch into one commit.
- **Commit After Logical Steps:** Make a commit immediately after each distinct sub-task (e.g., state hooks, UI components, API routes, type fixes).
- **Conventional Commits:** Format commit messages as `<type>(<scope>): <summary>` in imperative lowercase (e.g., `feat(calendar): add event fetching state`, `fix(types): resolve type errors`, `chore(db): update schema`).

### Example Micro-Commit Workflow
When implementing a feature branch like `feature/render-events-on-grid`:
1. Add event fetch hooks and state management to `src/components/Calendar.tsx` 
   → Commit: `feat(calendar): add event fetching state`
2. Update calendar day cells to render event titles with dynamic color coding 
   → Commit: `feat(calendar): render color-coded events in day cells`
3. Verify type safety with `bunx tsc --noEmit` and resolve issues 
   → Commit: `fix(types): resolve type safety errors`