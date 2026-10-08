# src/lib

Framework-free helpers. Anything shared by more than one component or route belongs here rather than being duplicated, and anything here should be testable without rendering (`__tests__/` uses `bun:test`).

## Auth (`auth/`)

Better Auth, storing users and sessions in the app's own database through the Drizzle adapter.

- `server.ts`: the `auth` instance. Email and password only, signup off, rate limiting on in every environment, uuid ids. Server-only.
- `client.ts`: `authClient` from `better-auth/react`, for Client Components. It only signs in and out; data goes through `/api` routes.
- `auth-user.ts`: `getAuthenticatedUser()`, returns the branded `AuthenticatedUser` (`{ id }`) or `null`. `withUser` in `api/route-handler.ts` calls it for every API route, so routes never call it directly. Don't re-implement the check.
- `middleware.ts`: `updateSession()`, called from `src/proxy.ts`. Looks the session cookie up in the database, enforces redirects (unauthenticated → `/login`, authenticated on `/` or `/login` → `/app`), passes refreshed session cookies through, and forwards the user id as `x-kalend-user-id` after stripping any inbound copy.

Env: copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.

## Other helpers

- `calendar-types.ts` — wire-shape interfaces (`CalendarEvent`, `CalendarTask`, `CalendarCategory`) and their API response wrappers, plus request bodies (`TaskCreateRequest`/`TaskPatchRequest`; the server's task parser rules must match their keys, checked by tsc). Import these instead of the Drizzle DB types when working with data that arrived over the network.
- `alerts.ts` — everything that defines an alert: the allowed offsets (`ALERT_OFFSETS`), `fireAtFor`, the message text (`alertMessage`), and the missed cutoff (`MISSED_AFTER_MS`). The table's check constraint, the request parser, the claim route, and the client all read it. Add an offset here, never in a second place. `alert-tray.ts` holds the client-side reducer and message text for delivery. `alert-diff.ts` turns the stored alerts and the one the user wants into create and delete steps (create first), and maps item ids to their alert. `alert-permission.ts` decides whether to ask for browser notification permission after a save. The inspectors' drafts (`event-draft.ts`, `task-draft.ts`) carry the alert next to the item's own fields, so dirty checks and rebasing cover it.
- `api.ts` — `mutateResource`, a generic fetch-then-check wrapper for create/edit/delete/move operations, plus the `MutationResponse` interface.
- `event-colors.ts` — the `EVENT_COLORS` palette, `DEFAULT_EVENT_COLOR` (matches the DB default), the `isEventColor` guard, and the static class lookup tables. Single source of truth for event/task/category color; extend it here rather than adding a one-off palette.
- `time-grid-layout.ts` — overlap and percentage-position math for the week/day time grid, plus `isMultiDayEvent` (multi-day events render in the all-day row instead).
- `auth-validation.ts` — `validateAuthForm()`, the login form's email/password checks. No password-strength rule: there's no signup in this MVP (see `src/app/CLAUDE.md`), just a demo account whose password is already set.
- `utils.ts` — `cn()` (clsx + tailwind-merge).
