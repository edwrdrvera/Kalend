# Kalend app-fixes hand-off

Date: 2026-09-06
Branch: `codex/fix-app-interactions` (based on `origin/develop`)
Status: implementation paused at the user's request; Playwright regression coverage has **not** been started.

## Confirmed design tree / shared specification

### Landing-page waitlist

- Restore a first-party, inline email-only form backed by the existing `POST /api/waitlist` endpoint and `waitlist` table.
- No confirmation email, third-party provider, extra profile fields, privacy/terms pages, or email verification in this repair.
- Add an accessible honeypot. Filled honeypots receive the same generic success response but do not insert a row.
- Configure Vercel WAF for `POST /api/waitlist`, counted by IP: fixed 10-minute window, 10 attempts, block the 11th. Configure Production and Preview; this is a manual Vercel-dashboard step, not an in-process limiter.
- Use consent copy: “We’ll use your email only to send Kalend launch and access updates.”
- Use success copy: “You’re on the list. We’ll be in touch with Kalend launch and access updates.”
- Duplicate addresses show the same generic success.
- Preserve the email on validation/network/server/429 errors; announce status accessibly; disable repeated submits while loading.
- Landing CTAs scroll to and focus the email field. Success replaces the form.

### Calendar headings

- Month and week headings use `Sun Mon Tue Wed Thu Fri Sat`.
- Sunday remains the first day.
- Remove forced uppercase styling.

### Supabase configuration/login

- Validate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` centrally for browser, server, and middleware clients.
- Public landing, login, and waitlist remain available when configuration is absent.
- Protected pages redirect to `/login?error=configuration`.
- Protected API requests return JSON HTTP 503, not login HTML.
- Login immediately shows an app-owned unavailable message and disables submit; never expose the raw Supabase vendor error.
- Keep `/api/ping` unchanged; do not add a health endpoint.
- Document Vercel Production + Preview variables and redeploy, plus local dev-server restart after `.env.local` changes.

### Event/task category colors

- Add a `color_overridden` boolean to events and tasks; false means category inheritance, true means the stored item color wins.
- Items inherit category color until explicitly overridden. Explicit overrides survive category changes.
- Provide “Use category color” to clear an override.
- Clearing a category preserves the visible color as an independent color.
- Apply the same semantics to events and tasks.
- Existing categorized rows are treated as inherited.
- Existing uncategorized colors are treated as defaults; assigning a category later changes them to the category color (the user selected this behavior).
- Validate palette values and authenticated category ownership in event/task create and update APIs.

### Event editor behavior

- Convert quick-create to the project’s Base UI popover interaction model.
- Color, category, start-date, and end-date pickers stay open within the editor after selection.
- Nested Escape closes the child picker first; outside click and Cancel close the outer editor without saving.
- Successful creation closes the editor.
- Validation/server errors keep it open and preserve values.
- Add accessible dialog, day-cell, and date-control names.

### Regression coverage (explicitly deferred)

Do not start this phase until the user explicitly confirms:

- Add Playwright with desktop Chromium only.
- Use a dedicated Supabase test account via `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`; mock app APIs after authentication.
- Add CI coverage that fails clearly until those GitHub secrets exist.
- Cover event nested pickers, Escape/outside/Cancel/error/success behavior, event color inheritance/override/reset, focused task color behavior, and title-case headings.
- No mobile, Firefox, or Safari coverage in this work.

## Work completed in the shared tree

### Supabase slice (agent completed; not committed)

- Added `src/lib/supabase/config.ts` with presence validation, `SupabaseConfigurationError`, and stable app-owned message.
- Updated `src/lib/supabase/client.ts`, `server.ts`, and `middleware.ts`.
- Updated `src/components/AuthCard.tsx` for proactive unavailable state and safe error handling.
- Added/updated `src/lib/__tests__/supabase-config.test.ts` and `src/lib/__tests__/middleware.test.ts`.
- Updated `README.md` and `src/lib/CLAUDE.md` with Vercel/local configuration guidance.
- Focused TDD result reported by agent: 14 passing tests, 26 assertions; lint and diff-check passed.

### Waitlist slice (agent completed; not committed)

- Updated `src/components/landing/WaitlistForm.tsx`, `LandingButton.tsx`, and `LandingBottomCTA.tsx`.
- Updated `src/app/api/waitlist/route.ts` and its tests for honeypot behavior.
- Added `docs/vercel-deployment.md`; README also contains the WAF paragraph.
- Focused TDD result reported by agent: 7 passing tests, 18 assertions; lint and diff-check passed.
- No fake/in-memory rate limiter was added; WAF is the intended throttle.

### Color/API/schema slice (partially completed by primary agent)

- Added `color_overridden` to `src/db/schema/events.ts`, `src/db/schema/tasks.ts`, and wire types.
- Generated `drizzle/0007_new_newton_destine.sql` and `drizzle/meta/0007_snapshot.json`; migration has not been applied to a database.
- Updated `resolveDisplayColor` and its tests to honor the override flag.
- Added supported-color validation and `color_overridden` handling to event/task create and update routes.
- Added passing invalid-color API tests for events and tasks.

### Calendar UI slice (agent was paused after user deferred regression coverage)

- Shared tree currently contains changes in `EventCreatePopover.tsx`, `DateField.tsx`, `MonthGrid.tsx`, and related landing files. These changes need review/type-checking before relying on them.
- Playwright package/config/tests/CI were explicitly not added.

## Remaining implementation work

1. Finish/review the calendar Base UI quick-create conversion and heading/accessibility changes.
2. Update every `resolveDisplayColor` caller to pass `color_overridden` and update fixtures/mocks/wire payloads.
3. Complete category ownership validation in event/task routes and corresponding route tests.
4. Finish event/task form state: preserve explicit overrides, category inheritance, “Use category color,” and clearing-category behavior.
5. Update task creation payload/UI as needed for the shared color semantics.
6. Run `bunx tsc --noEmit`, focused Bun tests, then the full `bun test`; the current known type errors are stale call sites/fixtures missing the new override argument.
7. Run `git diff --check`, review the combined diff, and commit logical slices using conventional commits.
8. Do **not** add or run Playwright regression coverage until the user says to start it.
9. Before production use, apply migration 0007 and configure the Vercel WAF rule and Supabase variables for Production/Preview.

## Important current verification caveat

The shared worktree has not been type-checked after all concurrent edits. The last reported `bunx tsc --noEmit` failures were in calendar/color call sites and fixtures, not the completed Supabase or waitlist slices. No commits have been made for this repair branch.
