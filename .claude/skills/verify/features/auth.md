# Demo sign-in and route guard

Single demo account; no signup or password reset. Middleware in `src/lib/supabase/middleware.ts` enforces redirects.

## Sub-features
- Sign in via `/login` form.
- Signed-out visit to `/app` redirects to `/login`.
- Signed-in visit to `/` or `/login` redirects to `/app`.
- Log out from the account menu (`SettingsMenu.tsx`): icon rail `Account` button → `Log out` (`Logging out...` while pending) → `/login`.
- Unauthenticated `/api/*` (except `ping`, `waitlist`) is redirected 307 to `/login` by the middleware (the handler-level 401 is only reachable if the middleware is bypassed).

## How to get to it (user POV)
Landing page → "Log in" link in the nav, or go straight to `/login`.

## Driving it with the browser pane
- Dev sign-in: `navigate` to `/api/dev/sign-in` → lands on `/app` signed in. With the flag unset it returns 404 JSON.
- Form (user signs in; the agent never types the password): fields labeled `Email` / `Password`, button text `Sign in` (shows `Signing in...` while pending).
- Success: URL `/app`, `find "Main navigation"` hits the icon rail.
- Signed-in redirect: `navigate` to `/login`; `location.pathname` becomes `/app`.
- Log out: `find "Account"` → click the first hit → `find "Log out"`. Clicking it ends the pane's session; sign back in with `/api/dev/sign-in` (see the skill's Sign in section). Without the dev sign-in, stop at finding the button in an unattended run.
- Guard: `curl -s -o /dev/null -w '%{http_code}' localhost:<port>/api/tasks` → `307` without cookies.

## Gotchas
- Credentials are secret and entered by the user only; never put them in evidence.
- The browser pane keeps cookies across runs, so `/login` may immediately redirect to `/app`.
