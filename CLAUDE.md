# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Keep it short. Detail belongs in the linked docs and in the per-directory `CLAUDE.md` files, which load only when work actually touches that directory.

## Project

Kalend is a student productivity web app centered on an integrated calendar and task manager. Next.js App Router, Drizzle ORM over Supabase Postgres, Tailwind, shadcn, and daisyUI. Full product plan: `docs/project_overview.md` (local-only, may be missing).

## Commands

This project uses Bun, not npm, yarn, or pnpm.

- `bunx tsc --noEmit`: fast type check. Use it to verify each change.
- `bun test`: unit tests (`bun:test`, colocated in `__tests__/`)
- `bun run dev`: dev server
- `bun run build`: full production build (run only before merging PRs)
- `bun run review:tier`: prints the branch's review tier (low, medium, or high) and each changed file's tier

Seeding is three layered scripts, not three versions of one. To build the demo account from scratch, run them in this order:

1. `bun run db:seed:demo`: creates the demo login (or resets its password). Needs `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_USER_PASSWORD`.
2. `bun run db:seed`: loads the sample events from `src/db/data/data.csv`. Needs `SEED_USER_ID=<demo user's uuid>`.
3. `bun run db:seed:spaces`: creates the Spaces and links that user's events and tasks to them. Picks the only user automatically, or takes `SEED_USER_ID`.

All three are safe to re-run.

## Always applies

- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`). Don't add `useMemo` or `useCallback` by hand. Write plain component code and let the compiler optimize it.
- **Every API route is the access-control boundary.** The app's database client bypasses RLS, so each handler scopes user data with an explicit `user_id` filter. Details in `src/app/api/CLAUDE.md` and `src/db/CLAUDE.md`.
- Type-check before you commit. Commit in small conventional-commit steps, and open a PR into `develop`.
- Before opening a PR, run `git fetch origin develop`, then `bun run review:tier`. It compares against `origin/develop`. The tier (low, medium, or high) is the riskiest tier of any changed file, and it decides how much review the branch gets. Then, in this order:
  1. Draft the confidence report from `guides/github-writing.md`. The review reads its "Not verified" list.
  2. High only: check that the confidence report's Rollback line names a real way back (a reverse migration for schema changes).
  3. Open the PR with `Closes #<issue>` in its body, then run `pstack:make-pr-easy-to-review` on it. Its PR description must still follow `guides/github-writing.md`.
  4. Post the confidence report as the first PR comment.
  5. Run `bun run review:pr <number> --post`. It starts a new Claude process that sees only the PR and the linked issue's acceptance criteria, runs `/code-review` (plus `/security-review` on high tier) with `develop`'s skills, and posts a report without changing anything. Don't run those reviews in the session that wrote the code.
  6. Fix what the report confirms within the task's scope, and update the confidence report. A PR gets at most 2 reviews, one first review and one re-run after fixes, and the script refuses a third. Don't re-run just to confirm small fixes. List a restructuring that goes beyond the task in the final summary instead of doing it.
  7. Run `pstack:babysit` on the PR until CI is green and review comments are handled. It fixes high-confidence findings with new commits, re-runs CI, and updates the confidence report. It brings ambiguous decisions back to me instead of guessing.
- Rewriting history or force-pushing needs my OK first.
- For audits across many files, split the work across subagents and have each one cite file:line evidence. Check anything they report before acting on it.

## Codebase health (agent rules)

Rules adapted from Lauren Tan's talk and notes on trusting agents live in `guides/agent-rules.md`, with what enforces each. Read it before your first change in a session. Rules 1 to 3 (verify, don't guess), 7 (turn repeats into checks), 11 and 12 (comments, one paved path), 14 (folder boundaries), and 17 (user scoping) apply to almost every task.

## When to keep going vs. ask

When a step doesn't need my input, keep going. Put status notes in the same message as your next action.

Stop and ask only when you can't continue without me, or before anything destructive: deleting data, force-pushing, or changing anything outside this repository.

## Definition of done

A task is done when `bunx tsc --noEmit` is clean, `bun test` passes, the change is committed, a PR into `develop` is open, and its confidence report is posted. If the change is visible in the app, also check it in the browser. Say so if you couldn't.

## Final summaries

Start with what you need from me (decisions, logins, anything blocked), then what changed. List anything you could not verify, such as a signed-in click-through or a claim from docs you didn't test, instead of presenting it as done.

## Read when relevant

| Doing this | Read |
| --- | --- |
| Writing any code | `guides/code-style.md` |
| Adding a pattern, fixing a repeated mistake, or reviewing code health | `guides/agent-rules.md` |
| Branching, committing, PR flow, resume notes | `guides/git-workflow.md` |
| Writing a PR body or GitHub issue | `guides/github-writing.md` |
| Editing the schema or running migrations | the `db-migrate` skill |

## Starting a new session

Read in this order before doing anything else:

1. `HANDOFF.md` (repo root, local-only, may be missing): your handoff from the last session
2. `CLAUDE.md` (this file)
3. `docs/project_overview.md` (local-only, may be missing): product plan
4. Your agent's memory index, if it keeps one: cross-session notes

Then run `git log --oneline -10`. When a person is in the session, confirm your understanding with them and don't start work until they confirm you have it right. When you run unattended (a cloud, background, or scheduled agent), skip the confirmation and work from the task you were given.

Keep `HANDOFF.md` updated at every meaningful checkpoint: task done, decision made, work interrupted, or anything the next session will need to know. Before your context window fills, write a fresh snapshot there. Keep it current state only, not a history log: overwrite stale sections instead of appending.

---

## Agent skills

### Issue tracker

GitHub Issues on this repo. See `guides/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary. See `guides/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `guides/agents/domain.md`.

---

## Directory context

These have their own `CLAUDE.md` with the conventions for that area. Read it before changing code there.

- `src/app/`: routing, auth middleware (`src/proxy.ts`), global styles
- `src/app/api/`: Route Handler shape, auth check, response envelope
- `src/components/`: calendar state flow, wire types, color and geometry helpers
- `src/db/`: Drizzle client caveats, schema conventions, seed scripts
- `src/lib/`: Supabase clients, shared helpers, pure calendar and drag math

No `CLAUDE.md` of their own:

- `scripts/`: repo tooling run by CI and agents (`review-tier.ts`, `review-pr.ts`). Changes here are high tier.
- `src/hooks/`: client data hooks (`useCalendarEvents`, `useTasks`, `useCategories`) and the TimeGrid drag gestures (`useCreateDrag`, `useMoveDrag`, `useResizeDrag`)
- `src/test-utils/`: `mock-db.ts` (an in-memory Drizzle mock for API route tests that fails the test if a handler skips its `user_id` filter) and `render-hook.ts` (happy-dom `renderHook` for hook tests)
