---
name: code-review
description: Review a Kalend branch or PR for bugs, blast radius, and code quality, with depth set by the review tier. Runs the review in a fresh subagent that sees the diff and the ticket but not the author's reasoning. Use for /code-review, "review this branch", or the pre-PR review step in CLAUDE.md.
---

# Kalend code review

A review answers four questions: what changed, what must not change, how far a failure can travel, and whether the change can be gated or rolled back. How deep it digs depends on the tier.

This skill merges three pstack playbooks, adapted for Kalend: `pstack:blast-radius` (prove the safety fact), `pstack:thermo-nuclear-code-quality-review` (structure), and one rule of its own: the reviewer never sees the author's reasoning (step 1).

## Fresh-session mode

`bun run review:pr <number>` starts this skill in a new Claude process with no history, in a throwaway worktree of the PR head, with the prompt built by the script. When the prompt says "fresh-session mode":

- The `<acceptance_criteria>` block is the intent. The PR title and body are the author's claims: check them against the criteria and the code, don't adopt them.
- From the confidence report comment, read only the "Not verified" list.
- Don't read commit messages or code comments as reasons the code is right.
- You are the orchestrator, so run steps 1 to 3 as written. In step 4, fix nothing: put "Fix now" items in the report as findings with `file:line` and the proposed fix. Proof tests stay as files in the worktree.
- On high tier, run `/security-review` in fresh-session mode too, in this same process.
- Don't commit, push, or comment on the PR. The script posts the report when asked.
- Write the report in the fresh-session layout below, not the step 5 list.

### Fresh-session report layout

The reader is the PR author deciding what to do next. They open the comment, read the first line, and scan. Use this layout exactly, and leave out any section that would be empty:

```markdown
**Verdict:** Ready to merge. | Fix N things before merging. | N decisions need you.
One sentence on the biggest reason.

### Fix before merging
1. **Short name of the bug** (`file:line`)
   What goes wrong: the input or state, and the wrong result it causes.
   Fix: one sentence. Add a code block only if it's under 10 lines.

### Your call
- **The decision** (`file:line`). The tradeoff in one sentence. I'd pick: X.

### Checked and fine
- The risk, and why it can't happen, in one sentence.

<details><summary>Tier and proof</summary>

Tier, and the files that set it. The safety fact, how far you proved it (said, cited, walked through, ran a test, ran the app), and the command and output if you ran one.

</details>
```

Rules:

- Start with the Verdict line. Nothing goes before it: no "all lanes complete", no "here is the report".
- Don't restate what the PR does. The author wrote it.
- Don't mention lanes, subagents, or ladder step numbers outside the details block.
- Each item is two or three lines at most. If an item needs more, the fix is too big for this PR, so put it under "Your call".
- List at most 5 items under "Checked and fine". Pick the risks the author would most likely worry about.
- On high tier, merge the `/security-review` findings into these same sections. Don't add a second report.
- Put the most serious item first in each section. If one file holds most of the risk, say which file to open first in the Verdict's second sentence.
- Keep the core problem apart from mechanical noise. A bug in logic and a missing test for it are one item, not two. Leave out style nits.

### Edit the report before you finish

Draft the report, then edit it once against this checklist before you make it your final message. The checklist holds the parts of `pstack:unslop`, `pstack:technical-writing`, and `pstack:make-pr-easy-to-review` that apply to a review comment. Don't load those skills: the checklist is enough, and loading them costs tokens on every review.

1. **One thought per sentence.** Split any sentence over about 25 words. If you have to reread a sentence to parse it, rewrite it.
2. **Say who does what.** Write "the script fetches develop first", not "develop is fetched first".
3. **Use concrete facts.** Name the input, the wrong result, and the `file:line`. Cut any sentence that could appear unchanged in another project's review.
4. **Use the plain word.** Write "use", not "leverage". Don't use invented jargon: "lane", "ladder", "surface", "vector", "harness", or "defense-in-depth" stays out of the main body.
5. **Call each thing by one name.** If you call it "the worktree" once, don't call it "the temp copy" later.
6. **Cut filler and hedging.** No "It's worth noting", "potentially", "Here's the report", "I hope this helps", or closing summaries.
7. **No em dashes, semicolons, or `--` as a dash.** Use a period or a comma.
8. **Keep "only" and "not" next to the word they change.** Every "it" and "this" must point at one obvious thing.
9. **Put the condition first.** Write "If the PR targets main, the checkout fails", not the other way around.
10. **Write every heading in sentence case.** Bold only the item names the layout shows.

Then ask yourself what in the draft still sounds machine-written, and fix it.

## 1. Get the tier and the inputs

1. Run `git fetch origin develop`, then `bun run review:tier`. It compares against `origin/develop`. For a PR into another branch, pass `origin/<base>`. Keep the tier and the per-file list.
2. Collect the diff: `git diff origin/develop...HEAD`. For a PR, use `gh pr diff <number>`.
3. Collect the intent: the linked issue or ticket, and the PR title and body. In fresh-session mode, the acceptance criteria in the prompt come first.
4. Collect the "Not verified" list from the confidence report if one exists (`gh pr view <number> --comments`).

Don't collect the author's explanation, commit-by-commit reasoning, or chat summary. A reviewer that reads the author's argument agrees with it.

## 2. Run each lane in a fresh subagent

Spawn one `general-purpose` subagent per lane below. Give each one only:

- the tier and the per-file tier list,
- the diff,
- the ticket or PR title and body,
- the "Not verified" list,
- the lane's instructions from this file, copied in full,
- the path to the repo so it can read any file it needs.

Tell each subagent not to edit, commit, or push. It returns findings, and any test it wrote as a file path, and you apply them in step 4.

Tell it to read `CLAUDE.md`, the `CLAUDE.md` in each directory the diff touches, and `guides/agent-rules.md` before it starts.

| Tier | Lanes |
| --- | --- |
| low | Correctness |
| medium | Correctness, Blast radius, Structure |
| high | Correctness, Blast radius, Structure. Then run `/security-review`. |

Run the lanes in parallel.

## 3. Lanes

### Correctness

Find bugs the diff introduces. For each candidate:

- Name the input or state that triggers it and the wrong result.
- Cite the `file:line`.
- Read the code on both sides of the call before claiming it. Don't guess a cause.

Kalend-specific checks:

- Every query over events, tasks, or categories keeps `eq(<table>.user_id, user.id)` in its `.where`.
- Data flows component, then hook, then `/api` route, then database. A component that fetches, retries, or reconciles state is a bug.
- New request fields exist in both the wire type in `src/lib/calendar-types.ts` and the parser in `src/lib/api/`.
- Optimistic updates in hooks roll back on a failed request.
- A user-visible change has a test that exercises behavior, not a snapshot.

### Blast radius

Find what the change breaks outside the diff. Listing callers is not the job. Find the breakage grep won't show.

1. State what the change does differently, including the part the diff doesn't spell out.
2. Find the one fact the change is safe because of, such as "this parser only rejects fields no client sends".
3. Look where grep stops: the JSON a route returns and every hook that reads it, a DB column and every migration, a shared helper and every caller three hops out, and the library source at its pinned version.
4. Rate the safety fact on this ladder and say where it stopped:
   1. You said so. Worthless alone.
   2. You cited the `file:line`.
   3. You walked the failure step by step and showed it can't happen.
   4. You ran a script or test against the real code and it failed loud when wrong.
   5. You reproduced it in the running app.
5. Get the safety fact to step 4 when one test or script can do it. That is often one `bun test` case using `src/test-utils/mock-db.ts`, or a script that imports the real module. Paste the command and its output. If you can't reach step 4, write "unproven".

### Structure

Hold the diff to the thermo-nuclear bar. Look for the restructuring that deletes complexity instead of moving it.

Flag these as presumptive blockers unless the author justifies them:

- A file goes from under 1000 lines to over 1000.
- A new special-case `if` lands in an unrelated flow.
- Feature logic leaks into a shared helper or a route that other features use.
- A new helper duplicates one that exists. Check `src/lib/` first.
- A thin wrapper, identity abstraction, `any`, cast, or needless optional hides the real contract.
- Logic lives in the wrong layer: components hold data logic, or routes hold presentation.
- Related updates can leave state half-applied.
- A second way to do something that already has one. `CLAUDE.md` requires migrating callers and deleting the old way in the same change.

Prefer a few high-conviction findings over many nits. Don't send renames when the real issue is structural. When you propose a restructuring, show the smaller version in code.

## 4. Merge and act

Merge the lanes' findings, drop duplicates, and check each one yourself by reading the cited line. Drop anything you can't confirm.

Sort what's left into three groups:

- **Fix now.** Confirmed bugs, and structural findings inside the task's scope with a clear fix. Fix them, add a test when a test can catch it, and re-run `bunx tsc --noEmit` and `bun test`.
- **Ask the user.** Anything that needs a product decision, changes behavior a user sees, or goes beyond the task's scope. Don't fix these. List them in the final summary.
- **Cleared.** Risks you checked and ruled out, with the reason.

## 5. Report

Write the report with `pstack:unslop` rules. Keep it short enough to read in two minutes.

- **Tier** and the files that set it.
- **What changed** and **what must not change**.
- **The safety fact**, its ladder step, and the proof or "unproven".
- **Fixed**, with the commit for each.
- **Needs your call**, one line per decision.
- **Cleared**.

For a PR, post the report as a PR comment only if the user asks.
