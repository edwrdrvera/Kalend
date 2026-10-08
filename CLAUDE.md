# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Keep it short. Detail belongs in the linked docs and in the per-directory `CLAUDE.md` files, which load only when work actually touches that directory.

## Project

Kalend is a student productivity web app centered on an integrated calendar and task manager. Next.js App Router, Drizzle ORM over self-hosted Postgres, Better Auth, Tailwind, shadcn, and daisyUI. Full product plan: `docs/project_overview.md` (local-only, may be missing).

## Commands

This project uses Bun, not npm, yarn, or pnpm.

- `bunx tsc --noEmit`: fast type check. Use it to verify each change.
- `bun test`: unit tests (`bun:test`, colocated in `__tests__/`)
- `bun run dev`: dev server
- `bun run build`: full production build (run only before merging PRs)
- `bun run review:tier`: prints the branch's review tier (low, medium, or high) and each changed file's tier

Seeding is three layered scripts, not three versions of one. To build the demo account from scratch on an empty database, apply the migrations with `bunx --bun drizzle-kit migrate`, then run them in this order:

1. `bun run db:seed:demo`: creates the demo login (or resets its password). Needs `DEMO_USER_PASSWORD`.
2. `bun run db:seed`: loads the sample events from `src/db/data/data.csv`. Picks the only user automatically, or takes `SEED_USER_ID`.
3. `bun run db:seed:spaces`: creates the Spaces and links that user's events and tasks to them. Picks the only user automatically, or takes `SEED_USER_ID`.

All three are safe to re-run.

## Always applies

- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`). Don't add `useMemo` or `useCallback` by hand. Write plain component code and let the compiler optimize it.
- **Every API route is the access-control boundary.** The database has no row-level security, so each handler scopes user data with an explicit `user_id` filter. Details in `src/app/api/CLAUDE.md` and `src/db/CLAUDE.md`.
- Type-check before you commit. Commit in small conventional-commit steps, and open a PR into `develop`.
- Batch small fixes: put related small changes on one branch and open one PR, not one PR per fix.
- Before opening a PR, run `git fetch origin develop`, then `bun run review:tier`. It compares against `origin/develop`. A file's tier (low, medium, or high) comes from its folder, and the PR takes its riskiest file's tier, adjusted for size: under 40 changed lines with no high-tier file is trivial, and a low diff over 150 lines counts as medium. The tier decides how much of this flow runs:

  | Step | Trivial | Low | Medium | High |
  | --- | --- | --- | --- | --- |
  | 1. Confidence report | One `Verified:` line in the PR body | Short form | Full | Full, with a real Rollback (a reverse migration for schema changes) |
  | 2. Open PR with `Closes #<issue>`, then `pstack:make-pr-easy-to-review` | Open PR only | Open PR only | Both | Both |
  | 3. Post the report as the first PR comment | No | Yes | Yes | Yes |
  | 4. `bun run review:pr <number> --post` | Skip | Skip | Ask me first | Ask me first |
  | 5. Fix, then log each finding with `bun run review:log add` | n/a | n/a | If reviewed | If reviewed |
  | 6. `pstack:babysit` | No, CI must pass | Only if CI fails | Yes | Yes |

  For medium and high, tell me the tier and what the PR touches, and ask whether to run the review. Don't run it until I say yes. `review:pr` skips trivial and low PRs unless given `--force`. On medium it runs `/code-review`; on high it adds `/security-review`.

  The report forms are in `guides/github-writing.md`, and the PR description follows it too. `review:pr` starts a new Claude process that sees only the PR and the linked issue's acceptance criteria, and posts a report without changing anything. Don't run those reviews in the session that wrote the code. A PR gets at most 2 reviews (one first review, one re-run after fixes), and the script refuses a third. Don't re-run just to confirm small fixes. Fix what the report confirms within the task's scope, apply its judgment calls, and update the confidence report. List a restructuring that goes beyond the task in the final summary instead of doing it. babysit fixes high-confidence findings with new commits, re-runs CI, and brings ambiguous decisions back to me instead of guessing.
- Log every finding a review reports, with its outcome (`real-fixed`, `real-deferred`, `false-positive`, `ignored`). When a bug turns up later in code a review passed, log it against that PR as `missed`. `bun run review:log stats` compares reviewer versions, so check it before changing the review prompt or skills.
- Rewriting history or force-pushing needs my OK first.
- When orchestrating or delegating, copy these "Always applies" gates and the Definition of done into every worker brief. A `PreToolUse` hook (`scripts/guard-bash.ts`) sends force-pushes, history rewrites, and `review:pr` to a permission prompt.
- For audits across many files, split the work across subagents and have each one cite file:line evidence. Check anything they report before acting on it.

## Codebase health (agent rules)

Rules adapted from Lauren Tan's talk and notes on trusting agents live in `guides/agent-rules.md`, with what enforces each. Read it before your first change in a session. Rules 1 to 3 (verify, don't guess), 7 (turn repeats into checks), 11 and 12 (comments, one paved path), 14 (folder boundaries), and 17 (user scoping) apply to almost every task.

## When to keep going vs. ask

When a step doesn't need my input, keep going. Put status notes in the same message as your next action.

Stop and ask only when you can't continue without me, or before anything destructive: deleting data, force-pushing, or changing anything outside this repository.

## Definition of done

A task is done when `bunx tsc --noEmit` is clean, `bun test` passes, the change is committed, a PR into `develop` is open, and its confidence report is posted (for a trivial PR, the `Verified:` line in its body). If the change is visible in the app, also check it in the browser. Say so if you couldn't.

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
- `src/lib/`: Better Auth setup, shared helpers, pure calendar and drag math

No `CLAUDE.md` of their own:

- `scripts/`: repo tooling run by CI and agents (`review-tier.ts`, `review-pr.ts`). Changes here are medium tier.
- `src/hooks/`: client data hooks (`useCalendarEvents`, `useTasks`, `useCategories`) and the TimeGrid drag gestures (`useCreateDrag`, `useMoveDrag`, `useResizeDrag`)
- `src/test-utils/`: `mock-db.ts` (an in-memory Drizzle mock for API route tests that fails the test if a handler skips its `user_id` filter) and `render-hook.ts` (happy-dom `renderHook` for hook tests)
