---
name: code-review
description: Review a Kalend branch or PR for bugs, blast radius, and code quality, with depth set by the review tier. Runs the review in a fresh subagent that sees the diff and the ticket but not the author's reasoning. Use for /code-review, "review this branch", or the pre-PR review step in CLAUDE.md.
---

# Kalend code review

A review answers four questions: what changed, what must not change, how far a failure can travel, and whether the change can be rolled back. The tier sets how deep it digs.

The lanes adapt `pstack:blast-radius` and `pstack:thermo-nuclear-code-quality-review` for Kalend. One rule is this skill's own: the reviewer never sees the author's reasoning.

`bun run review:pr <number>` runs this skill in fresh-session mode. If the prompt says "fresh-session mode", read [Fresh-session mode](#fresh-session-mode) first. It changes steps 4 and 5.

## 1. Get the tier and the inputs

`<base>` is the branch the PR merges into, `develop` unless the PR says otherwise.

1. Run `git fetch origin <base>`, then `bun run review:tier origin/<base>`. Keep the tier and the per-file list.
2. Get the diff with `gh pr diff <number>`, or `git diff origin/<base>...HEAD` for a branch with no PR.
3. Get the intent from the linked issue, then the PR title and body.
4. Get the "Not verified" list from the confidence report comment, if there is one (`gh pr view <number> --comments`).

Don't collect the author's explanation, commit-by-commit reasoning, or chat summary. A reviewer that reads the author's argument agrees with it.

## 2. Run each lane in a fresh subagent

Spawn one `general-purpose` subagent per lane, in parallel:

| Tier | Lanes |
| --- | --- |
| low | Correctness |
| medium | Correctness, Blast radius, Structure |
| high | Correctness, Blast radius, Structure, then `/security-review` |

Give each subagent only these inputs:

- the tier and the per-file tier list
- the diff
- the issue, and the PR title and body
- the "Not verified" list
- its lane's instructions from step 3, copied in full
- the repo path

Tell it to read `CLAUDE.md`, the `CLAUDE.md` in each directory the diff touches, and `guides/agent-rules.md` first. Tell it not to edit, commit, or push. It returns findings, plus the path of any proof test it wrote.

## 3. Lanes

### Correctness

Find bugs the diff introduces. For each one, name the input or state that triggers it, the wrong result, and the `file:line`. Read the code on both sides of the call before you claim a bug. Don't guess a cause.

Check these Kalend rules:

- Every query over events, tasks, or categories keeps `eq(<table>.user_id, user.id)` in its `.where`.
- Data flows from component to hook to `/api` route to database. A component that fetches, retries, or reconciles state is a bug.
- A new request field exists in both the wire type in `src/lib/calendar-types.ts` and the parser in `src/lib/api/`.
- An optimistic update in a hook rolls back when the request fails.
- A user-visible change has a test that checks behavior, not a snapshot.

### Blast radius

Find what the change breaks outside the diff, where grep won't show it. A list of callers is not the answer.

1. State what the change does differently, including what the diff doesn't spell out.
2. Find the one fact the change is safe because of, such as "this parser rejects only fields no client sends".
3. Look past where grep stops: the JSON a route returns and every hook that reads it, a DB column and every migration, a shared helper and its callers three hops out, and the library source at its pinned version.
4. Rate the safety fact on this ladder:
   1. You said so. This is worthless alone.
   2. You cited the `file:line`.
   3. You walked through the failure and showed it can't happen.
   4. You ran a test or script against the real code, and it fails loud when the fact is wrong.
   5. You reproduced it in the running app.
5. Reach step 4 when one test or script can do it, often one `bun test` case with `src/test-utils/mock-db.ts`. Paste the command and its output. If you can't reach step 4, write "unproven".

### Structure

Look for the restructuring that deletes complexity instead of moving it. Treat each of these as a blocker unless the author justifies it:

- A file grows past 1000 lines.
- A special-case `if` lands in an unrelated flow.
- Feature logic leaks into a shared helper or a route other features use.
- A new helper duplicates an existing one. Check `src/lib/` first.
- A thin wrapper, `any`, cast, or needless optional hides the real contract.
- Logic sits in the wrong layer, such as data logic in a component or presentation in a route.
- Related updates can leave state half-applied.
- The change adds a second way to do something. `CLAUDE.md` requires moving the callers and deleting the old way in the same change.

Send a few high-conviction findings, not many nits. When you propose a restructuring, show the smaller version in code.

## 4. Merge and act

Merge the lanes' findings and drop duplicates. Read each cited line yourself, and drop anything you can't confirm. Sort the rest:

- **Fix now.** Confirmed bugs, and in-scope structural findings with a clear fix. Fix each one, add a test when a test can catch it, and re-run `bunx tsc --noEmit` and `bun test`.
- **Judgment calls.** Findings with more than one reasonable fix. Pick one, and say why it beats the other options. Apply it like a "Fix now" item. If the call changes what a user sees or goes beyond the task, don't apply it. Mark it "beyond this PR" instead.
- **Checked and fine.** Risks you ruled out, with the reason.

## 5. Report

Keep the report short enough to read in two minutes. List these in order:

- the tier and the files that set it
- what changed and what must not change
- the safety fact, its ladder step, and the proof or "unproven"
- what you fixed, with the commit for each
- each judgment call: what you did, why, and why not the other options
- what you checked and found fine

Edit the draft once against [the writing checklist](#writing-checklist) before you send it. Post it as a PR comment only if the user asks.

## Fresh-session mode

`bun run review:pr` starts a new Claude process with no history, in a throwaway worktree of the PR head. The script posts the report, so you never commit, push, or comment.

- The `<acceptance_criteria>` block in the prompt is the intent. The PR title and body are the author's claims. Check them against the criteria and the code.
- From the confidence report, read only the "Not verified" list.
- Don't treat commit messages or code comments as proof the code is right.
- In step 4, fix nothing. Report "Fix now" items with their `file:line` and proposed fix. Leave proof tests as files in the worktree.
- On high tier, run `/security-review` in fresh-session mode in this same process, and merge its findings into your report.
- Write the report in the layout below, not the step 5 list. Only your final message is kept, so the report is the whole message.

### Report layout

The reader is the PR author deciding what to do next. They read the first line and scan the rest. Leave out any section that would be empty:

```markdown
### Verdict: Ready to merge. | Fix N things before merging.
One sentence on the biggest reason. If one file holds most of the risk, name it.

---

### Fix before merging
**1. Short name of the bug** (`file:line`)
- **Breaks when:** the input or state.
- **Result:** the wrong behavior.
- **Fix:** one sentence. Add a code block only if it's under 10 lines.

### Judgment calls
**Short name of the choice** (`file:line`)
- **Do:** the option you pick.
- **Why:** what it fixes or prevents.
- **Not the others:** the main alternative, and what it would cost.

### Checked and fine
- **The risk:** why it can't happen, in one sentence.

<details><summary>Tier and proof</summary>

- **Tier:** the tier, and the files that set it.
- **Safety fact:** the fact, its ladder step, and the command and output if you ran one.

</details>
```

- Start with the Verdict heading. Put nothing before it.
- Format for scanning. Every item is a bold name followed by short labeled sub-bullets, never a paragraph.
- Put a blank line between items and between sections.
- Don't restate what the PR does.
- Put the most serious item first in each section.
- Keep each sub-bullet to one or two lines. If an item needs more, it belongs under "Judgment calls".
- Count a bug and its missing test as one item. Leave out style nits.
- List at most 5 items under "Checked and fine". Pick the risks the author would worry about most.


## Writing checklist

This checklist holds the parts of `pstack:unslop`, `pstack:technical-writing`, and `pstack:make-pr-easy-to-review` that apply to a review. Don't load those skills. Loading them costs about 5,000 tokens per review.

1. **One thought per sentence.** Split any sentence over about 25 words.
2. **Say who does what.** Write "the script fetches develop first", not "develop is fetched first".
3. **Use concrete facts.** Name the input, the wrong result, and the `file:line`. Cut any sentence that could appear unchanged in another project's review.
4. **Use the plain word.** Write "use", not "leverage". Keep "lane", "subagent", "ladder", "surface", "vector", and "defense-in-depth" out of everything but the details block.
5. **Call each thing by one name.** If it's "the worktree" once, it's "the worktree" every time.
6. **Cut filler and hedging.** No "It's worth noting", "potentially", "Here's the report", or closing summaries.
7. **No em dashes, semicolons, or `--` as a dash.** Use a period or a comma.
8. **Keep "only" and "not" next to the word they change.** Every "it" and "this" points at one obvious thing.
9. **Put the condition first.** Write "If the PR targets main, the checkout fails."
10. **Write headings in sentence case.** Bold only the item names and the sub-bullet labels.

Last, ask what in the draft still sounds machine-written, and fix it.
