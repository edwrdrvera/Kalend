---
name: verify
description: Drive the Kalend web app (Next.js calendar + task manager) in the built-in browser pane, signed in as the demo account, and capture proof that a user-visible change works. Use after any change to pages, components, hooks, or API routes, before calling the task done.
---

# Verify Kalend

Kalend's user surface is a web UI: `/` (landing + waitlist), `/login`, `/app` (calendar, agenda, tasks, Spaces). The JSON API under `/api/*` is secondary; check it for side effects, never as a substitute for the UI path.

Harness: the desktop app's built-in browser tools (`mcp__Claude_Browser__*`). There are no Playwright/Cypress specs in this repo.

## Launch

0. If `lsof -tiTCP:3000 -sTCP:LISTEN` shows a server and the doctor passes for it, drive that one and skip teardown (you didn't start it).
   Unattended runs (scheduled tasks) can't call `preview_start`. Use `scripts/server.sh start` instead (see Unattended launch below), then open the pane with `navigate` to `http://localhost:3000/app`.
1. `preview_start {name: "dev"}` (config in `.claude/launch.json`: `bun run dev`, port 3000, `autoPort: true`, so the real port may differ; read it from the result). Keep the returned `serverId` and `tabId`.
2. Ready when `preview_logs {serverId, search: "Ready"}` shows Next's `Ready in …` line, and `curl -s localhost:<port>/api/ping` returns `{"message":"pong"}`.
3. Teardown: `preview_stop {serverId}`. Only stop the server you started.

Never start the server with a raw `bun run dev` in Bash; use `preview_start`, or `scripts/server.sh` when `preview_start` is refused. Never run a second `bun run dev` from the same checkout: Next locks `.next/`. A worktree is a separate checkout and may run its own instance on another port.

### Unattended launch

```bash
.claude/skills/verify/scripts/server.sh start [port]   # default 3000
.claude/skills/verify/scripts/server.sh stop [port]
```

`start` prints one status line. `STARTED`: it launched a server in the background (pid in `output/verify/server-<port>.pid`, log in `server-<port>.log`), and you own the teardown. `REUSING`: someone else's server already answers, so don't stop it. `ALREADY RUNNING`: an earlier `start` owns it. `BUSY` exits non-zero: another program holds the port, so pass a different port. `EXITED` or `TIMEOUT` exit non-zero with the log tail; run `stop` before retrying. `stop` kills only the process tree `start` recorded and waits until it is gone. Run the doctor after `start`, same as for `preview_start`.

## Doctor

```bash
.claude/skills/verify/scripts/doctor.sh <port>
```

Read-only. Checks `.env.local` has the three vars the server needs (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; a new worktree has no `.env.local` until you copy one in), that the port's listener runs from *this* checkout (not another worktree), `/api/ping` answers, and an unauthenticated `/api/tasks` is redirected (307 to `/login` by the middleware; a 503 means Supabase config is broken). Ends with `DOCTOR: OK` or `DOCTOR: PROBLEMS`. Run it first, and again whenever something looks off.

## Sign in (needed for everything under `/app`)

The agent never types the demo password. Two ways in:

1. `navigate` to `http://localhost:<port>/app`. If you land on `/app` and `find "Main navigation"` hits the icon rail (right after `navigate` it can miss while the page hydrates; retry once), the pane already has a session (cookies persist across runs); skip ahead.
2. Otherwise `navigate` to `http://localhost:<port>/api/dev/sign-in`. It signs the pane in as the demo account on the server and redirects to `/app`; nobody types anything. It needs `KALEND_DEV_SIGN_IN=1`, `SUPABASE_SERVICE_ROLE_KEY`, and `DEMO_USER_EMAIL` in `.env.local` (the doctor reports which are missing), and it only works under `bun run dev`. A 404 JSON body means the flag is off; a 500 body names what's missing or what Supabase rejected.
3. If that route isn't available, ask the user to sign in with the demo account in the browser pane and wait. Never read, echo, or paste `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` values anywhere: chat, screenshots, commits, PRs, evidence files. In an unattended run nobody can sign in: mark every `/app` feature `verified-unreachable` (prerequisite: no session and no dev sign-in) and still verify the signed-out checks.

Signing out (e.g. to check the landing page in the pane) is fine now: `/api/dev/sign-in` gets you back.

Failure modes: an inline error on the login card (wrong password; run `bun run db:seed:demo` only if the user OKs it); protected APIs return 503 when Supabase is unreachable.

## Drive

Set the viewport first: `resize_window {width: 1440, height: 900}`. The pane's own size can be narrower than the desktop layout, and the right panel only pins beside the grid at 1200px and up. Reset it in Cleanup.

In an unattended run the pane may be hidden, and the first `computer` input can fail with "not on screen and has not drawn yet". Take a `screenshot` and retry; `find`, `read_page`, and `javascript_tool` work regardless.

Prefer handles in this order: `aria-label`, visible text, placeholder. Every one below exists in `src/components/`. Per-feature recipes live in `features/` (index: `features/README.md`). Read the feature file for what you are verifying and cover every entry point it lists.

Reading state after an action: `find`/`read_page` for the UI, then for side effects run in the page (the session cookie rides along):

```js
await fetch('/api/tasks').then(r => r.json())   // also /api/events, /api/categories
```

This is a GET through the real auth path, so it counts as proof of persistence. Task, event, and Space mutations update the UI optimistically and the dev server can take a few seconds to write, so wait ~3s before the GET. Screenshots can also lag an action by one frame; re-take before judging the UI. Do not create or change data via `fetch` POST/PATCH as the "action" under test; do the action in the UI.

## Data safety

There is one shared Supabase database and one demo account, and there is no isolated test DB. Everything you create is real and visible to the user.

- Name anything you create with the prefix `verify-` plus a timestamp, e.g. `verify-task-1727000000`.
- Delete what you created before finishing, through the UI when the feature has a delete path, otherwise `fetch('/api/tasks/<id>', {method:'DELETE'})` on the ids you created. Never delete rows you didn't create.
- Don't run the seed scripts without asking: `db:seed` reloads events for the user.

## Evidence

Proof = the action, the resulting UI state, and the persisted side effect.

- Screenshot (`computer {action:"screenshot"}`) before and after the action; it's returned into the conversation and is what you show the user.
- Save text evidence to `output/verify/<YYYYMMDD-HHMMSS>-<feature>/` (repo root; `output/` is gitignored and cleanup never touches it): `api-after.json` (the GET result, filtered to your `verify-` rows), `notes.md` (steps taken, port, branch, commit). Write them with the Write tool.
- Check `read_console_messages {onlyErrors: true}` and `preview_logs {level: "error"}`; include any errors in `notes.md`.
- Standards: drive the real user path (clicks, typing, Enter), not internal setters or test-only endpoints. Mocks are not acceptable here; the app has none at runtime.

## Cleanup

1. Delete your `verify-` data (see Data safety). Confirm with a GET that none remain.
2. `preview_stop {serverId}` for the server you started, or `scripts/server.sh stop` if `server.sh start` printed `STARTED`. Don't kill by process name.
3. Reset any viewport change: `resize_window {preset: "desktop"}`.
4. Leave `output/verify/…` in place. Confirm it still exists after teardown.

## Helpers

- `scripts/doctor.sh [port]`: the read-only health check above. Exit 0 = OK.
- `scripts/server.sh start|stop [port]`: background dev server for runs that can't call `preview_start`. See Unattended launch.
