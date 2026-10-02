---
name: security-review
description: Review a Kalend branch or PR for security holes, with emphasis on one user reaching another user's data. Traces how far each hole reaches and proves the key safety fact with a test against the real handler. Runs in a fresh subagent that never sees the author's reasoning. Use for /security-review, high-tier branches, or anything touching auth, API routes, the database, or the proxy.
---

# Kalend security review

Kalend's worst failure is one signed-in user reading or changing another user's events, tasks, or Spaces. The app's database client bypasses RLS (`src/db/CLAUDE.md`), so each API handler is the only thing between users. Start there.

This skill applies `pstack:blast-radius` to security: find the one fact that keeps users apart, prove it by running the real handler, and trace how far a hole would reach.

## 1. Gather inputs

Collect the same inputs as the `code-review` skill, step 1: the tier, the diff, the ticket or PR text, and the "Not verified" list. Don't collect the author's explanation.

In fresh-session mode (see the `code-review` skill), the prompt's acceptance criteria are the intent, and step 6 fixes nothing: report each hole with its proposed fix and leave proof tests as files.

## 2. Run it in a fresh subagent

Spawn one `general-purpose` subagent. Give it the inputs above, this file's steps 3 to 5 copied in full, and the repo path. Tell it not to edit, commit, or push anything. Tell it to read `src/app/api/CLAUDE.md`, `src/db/CLAUDE.md`, `src/lib/CLAUDE.md`, and `guides/agent-rules.md` rules 14 to 17 first.

## 3. Check each boundary the diff touches

For every changed route, parser, query, auth file, or config, answer each question with a `file:line`.

**Authentication**

- Does every handler go through `withUser` in `src/lib/api/route-handler.ts`? A route that calls `getAuthenticatedUser` itself, or skips it, is a finding.
- Does `src/proxy.ts` still send signed-out users away from `/app`? Did the matcher change?

**Ownership**

- Does every select, update, and delete on events, tasks, or categories filter on `eq(<table>.user_id, user.id)`, with `user` from `withUser`? The `access-control/scoped-query` lint rule catches most misses. Check what it can't see: raw SQL, a helper that builds the query elsewhere, and a join to a second user-owned table.
- When a request names another row by id (`category_id`, `space_id`, a parent task), does the handler check that the named row also belongs to the caller? Linking your task to someone else's Space is a leak even when the task itself is scoped.
- Does an insert take `user_id` from `user.id`, never from the request body?

**Input**

- Does every new body field go through a parser in `src/lib/api/`, with `parse-fields.ts` rejecting unknown fields?
- Are ids, dates, colors, and lengths bounded? A string with no length cap is a finding on a write route.

**Client side**

- Does browser code use the Supabase client in `src/lib/supabase/client.ts` for anything besides sign-in? Lint blocks table access. Check storage, RPC, and realtime calls too.
- Is any server secret (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) reachable from browser code or from an env var named `NEXT_PUBLIC_*`?

**Output and errors**

- Does a response return fields the caller doesn't own or doesn't need, such as another user's id?
- Does an error message leak SQL, stack traces, or whether a row exists for another user? A 404 for "not yours" and a 404 for "missing" must look the same.

## 4. Prove the ownership fact

Pick the one fact that keeps users apart in this diff, for example "PATCH /api/tasks/[id] only updates a row whose `user_id` equals the caller".

Prove it with a test in the route's `__tests__/` folder that uses `src/test-utils/mock-db.ts`:

1. Seed a row owned by user A.
2. Call the handler as user B.
3. Expect a 404, and expect user A's row to stay unchanged.

Run it and paste the command and output. Return the test as a file path if it's new. The parent session commits it in step 6, so the proof keeps running in CI. If you can't write it, mark the fact "unproven" and say why.

Rate each other safety claim on the `code-review` ladder (steps 1 to 5) and give the step number.

## 5. Trace the reach

For each confirmed hole, state:

- **Who can exploit it:** any visitor, any signed-in user, or only the owner.
- **What they reach:** one row, all of one user's data, or every user's data.
- **How to close it:** the fix, and whether a lint rule or test can stop the pattern from coming back. Prefer adding the check (`guides/agent-rules.md` rule 7).

## 6. Merge and act

Check each finding yourself by reading the cited line. Then:

- **Fix now:** confirmed holes with a clear fix. Add the regression test with the fix.
- **Ask the user:** anything that changes who can see what, or needs a product call.
- **Cleared:** what you checked and why it's safe.

## 7. Report

Write it with `pstack:unslop` rules:

- **The ownership fact**, its ladder step, and the test that proves it.
- **Holes**, each with who, what, `file:line`, and the fix commit.
- **Judgment calls**, each with what to do, why, and why not the other options.
- **Cleared.**

Format each hole and judgment call as a bold name with short labeled sub-bullets, the same way as the `code-review` report layout. Never write an item as a paragraph.

Never paste secrets, tokens, or real user data into the report.
