# src/lib

Framework-free helpers. Anything shared by more than one component or route belongs here rather than being duplicated, and anything here should be testable without rendering (`__tests__/` uses `bun:test`).

## Supabase (`supabase/`)

- `config.ts` — central presence validation for the public Supabase URL and
  anon key. Browser, server, and middleware clients all use this helper so a
  missing deployment variable produces a stable app-owned error.
- `client.ts` — `createClient()` via `createBrowserClient`, for Client Components.
- `server.ts` — `async createClient()` via `createServerClient`, for Server Components and Route Handlers. Reads/writes cookies through `next/headers`.
- `auth-user.ts` — `getAuthenticatedUser()`, returns the verified `User` or `null`. `withUser` in `api/route-handler.ts` calls it for every API route, so routes never call it directly. Don't re-implement the check.
- `middleware.ts` — `updateSession()`, called from `src/proxy.ts`. Refreshes the session and enforces redirects (unauthenticated → `/login`, authenticated on `/` or `/login` → `/app`). Use `getUser()`, never `getSession()`: only `getUser()` validates the JWT against Supabase Auth.

Env: copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DATABASE_URL`.
Restart the development server after changing public environment variables. In
Vercel, configure both Production and Preview environments and redeploy the
affected builds.

## Other helpers

- `calendar-types.ts` — wire-shape interfaces (`CalendarEvent`, `CalendarTask`, `CalendarCategory`) and their API response wrappers, plus request bodies (`TaskCreateRequest`/`TaskPatchRequest`; the server's task parser rules must match their keys, checked by tsc). Import these instead of the Drizzle DB types when working with data that arrived over the network.
- `api.ts` — `mutateResource`, a generic fetch-then-check wrapper for create/edit/delete/move operations, plus the `MutationResponse` interface.
- `event-colors.ts` — the `EVENT_COLORS` palette, `DEFAULT_EVENT_COLOR` (matches the DB default), the `isEventColor` guard, and the static class lookup tables. Single source of truth for event/task/category color; extend it here rather than adding a one-off palette.
- `time-grid-layout.ts` — overlap and percentage-position math for the week/day time grid, plus `isMultiDayEvent` (multi-day events render in the all-day row instead).
- `auth-validation.ts` — `validateAuthForm()`, the login form's email/password checks. No password-strength rule: there's no signup in this MVP (see `src/app/CLAUDE.md`), just a demo account whose password is already set.
- `utils.ts` — `cn()` (clsx + tailwind-merge).
